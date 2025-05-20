import { defineStore } from 'pinia';
import { getApiBaseUrl } from '@/core/utils/url';
import { anyPack, anyUnpack, timestampFromDate, timestampDate, type Any } from '@bufbuild/protobuf/wkt';
import { v4 as uuidv4 } from 'uuid';
import type { ApiConfigCreateEntityResponse, DatabaseNotification, ApiRuntimeRegisterNotificationResponse, ApiRuntimeUnregisterNotificationResponse, ApiRuntimeDatabaseResponse, ApiRuntimeEntityExistsResponse, ApiRuntimeFieldExistsResponse, ApiConfigGetEntitySchemaRequest, ApiConfigGetEntitySchemaResponse, ApiConfigSetEntitySchemaRequest, ApiConfigSetEntitySchemaResponse, ApiConfigDeleteEntityRequest, ApiConfigDeleteEntityResponse, ApiRuntimeFindEntitiesRequest, ApiRuntimeFindEntitiesResponse, ApiRuntimeGetEntityTypesRequest, ApiRuntimeGetEntityTypesResponse, ApiRuntimeQueryRequest, ApiRuntimeQueryResponse, DatabaseEntitySchema, DatabaseFieldSchema, DatabaseRequest, String as PbString, QueryColumn, Int, Float, Bool, EntityReference, Timestamp, BinaryFile, Choice, EntityList } from '@/generated/protobufs_pb';
import { ApiMessageSchema, ApiHeaderSchema, DatabaseNotificationSchema, ApiConfigCreateEntityRequestSchema, ApiConfigCreateEntityResponseSchema, ApiConfigCreateEntityResponse_StatusEnum, ApiConfigDeleteEntityRequestSchema, ApiConfigDeleteEntityResponseSchema, ApiConfigDeleteEntityResponse_StatusEnum, ApiRuntimeFindEntitiesRequestSchema, ApiRuntimeFindEntitiesResponseSchema, ApiRuntimeFindEntitiesResponse_StatusEnum, ApiRuntimeGetEntityTypesRequestSchema, ApiRuntimeGetEntityTypesResponseSchema, ApiRuntimeGetEntityTypesResponse_StatusEnum, ApiRuntimeEntityExistsRequestSchema, ApiRuntimeEntityExistsResponseSchema, ApiRuntimeEntityExistsResponse_StatusEnum, ApiRuntimeFieldExistsRequestSchema, ApiRuntimeFieldExistsResponseSchema, ApiRuntimeFieldExistsResponse_StatusEnum, ApiConfigGetEntitySchemaRequestSchema, ApiConfigGetEntitySchemaResponseSchema, ApiConfigGetEntitySchemaResponse_StatusEnum, ApiConfigSetEntitySchemaRequestSchema, DatabaseEntitySchemaSchema, DatabaseFieldSchemaSchema, ApiConfigSetEntitySchemaResponseSchema, ApiConfigSetEntitySchemaResponse_StatusEnum, ApiRuntimeDatabaseRequestSchema, ApiRuntimeDatabaseRequest_RequestTypeEnum, DatabaseRequestSchema, ApiRuntimeDatabaseResponseSchema, ApiRuntimeDatabaseResponse_StatusEnum, StringSchema, ApiRuntimeQueryRequestSchema, ApiRuntimeQueryResponseSchema, ApiRuntimeQueryResponse_StatusEnum, ApiRuntimeRegisterNotificationRequestSchema, DatabaseNotificationConfigSchema, ApiRuntimeRegisterNotificationResponseSchema, ApiRuntimeRegisterNotificationResponse_StatusEnum, ApiRuntimeUnregisterNotificationRequestSchema, ApiRuntimeUnregisterNotificationResponseSchema, ApiRuntimeUnregisterNotificationResponse_StatusEnum, file_protobufs, TimestampSchema } from '@/generated/protobufs_pb';
import { fromBinary, create, type DescMessage, type MessageShape, toBinary, type Registry, createRegistry } from '@bufbuild/protobuf';
import { EntityFactories, NotificationManager, registry, ValueFactories, valueFromProtobuf } from '@/core/data/types';
import type { EntityId, EntityType, FieldType, Value, Field, EntitySchema, WriteOpt, ValueType, Entity, Notification } from '@/core/data/types';
import { useAuthStore } from '@/stores/auth';
import { getKeycloak } from '@/core/security/keycloak';

// Define the missing interfaces
export interface NotificationConfig {
  entityId?: EntityId;
  entityType?: EntityType;
  fieldType?: FieldType;
  serviceId?: string;
}

export interface NotificationCallback {
  (notification: Notification): void;
}

interface WaitingResponse {
    sentTimestamp: number;
    responsePrototype: DescMessage;
    resolve: (value: MessageShape<DescMessage>) => void;
    reject: (error: Error) => void;
}

export const useDataStore = defineStore('data', {
    state: () => ({
        socket: null as WebSocket | null,
        isConnected: false,
        waitingResponses: {} as Record<string, WaitingResponse>,
        notificationManager: new NotificationManager(),
        connectionLostCallbacks: [] as (() => void)[],
        reconnectAttempts: 0,
        maxReconnectAttempts: 10,
        reconnectDelay: 1000, // Start with 1 second delay
    }),

    actions: {
        // Add an initialization method for post-login setup
        initialize() {
            console.log('Initializing data store connection')
            this.connect()
        },

        // Clean up resources when store is no longer needed
        cleanup() {
            this.disconnect()
        },

        connect() {
            const me = this;

            if (!me.socket) {
                me.socket = new WebSocket(getApiBaseUrl());
                
                me.socket.onopen = () => {
                    me.isConnected = true;
                    me.reconnectAttempts = 0;
                };
                
                me.socket.onclose = (event) => {
                    const wasConnected = me.isConnected;
                    me.isConnected = false;
                    me.socket = null;

                    // Reject pending requests
                    for (const requestId in me.waitingResponses) {
                        const request = me.waitingResponses[requestId];
                        request.reject(new Error('WebSocket connection closed'));
                    }

                    me.waitingResponses = {};

                    // If we were previously connected and lost connection,
                    // trigger the connection lost callbacks
                    if (wasConnected) {
                        this.triggerConnectionLostCallbacks();
                    }

                    // Implement exponential backoff for reconnection
                    const delay = Math.min(
                        30000, // Max 30 seconds
                        me.reconnectDelay * Math.pow(1.5, me.reconnectAttempts)
                    );
                    
                    // Increment the reconnect attempts counter
                    me.reconnectAttempts++;
                    
                    // Schedule reconnection
                    setTimeout(() => {
                        me.connect();
                    }, delay);
                };
                
                me.socket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };
                
                me.socket.onmessage = (event) => {
                    me.onMessage(event);
                };
            }
        },

        disconnect() {
            const me = this;

            if (me.socket) {
                console.log('Disconnecting WebSocket');
                me.socket.close(1000, 'Normal closure'); // Use standard close code for normal closure
                me.socket = null;
                me.isConnected = false;
                
                // Clear any pending responses
                me.waitingResponses = {};
            }
        },

        onMessage(event: MessageEvent) {
            const me = this;
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                const message = fromBinary(ApiMessageSchema, new Uint8Array(e.target?.result as ArrayBuffer));
                const requestId = message.header?.id;

                const payload = message.payload;
                if (!payload) {
                    console.warn('Received message without payload:', message);
                    return;
                }

                // Check if this is a notification
                if (payload.typeUrl.includes('DatabaseNotification')) {
                    try {
                        const notificationBytes = payload.value;
                        const notification = fromBinary(DatabaseNotificationSchema, notificationBytes);
                        me.notificationManager.dispatch(notification.token, notification);
                    } catch (error) {
                        console.error('Error processing notification:', error);
                    }

                    return;
                }

                if (!requestId) {
                    console.warn('Received message without request ID:', message);
                    return;
                }

                // Handle regular responses
                if (!me.waitingResponses[requestId]) {
                    console.warn('Received message without matching request ID:', requestId);
                    return;
                }

                const request = me.waitingResponses[requestId];

                try {
                    const response = anyUnpack(payload, request.responsePrototype);
                    if (response) {
                        request.resolve(response);
                    } else {
                        request.reject(new Error('Failed to deserialize response'));
                    }
                } catch (error) {
                    console.error('Error deserializing response:', error);
                    request.reject(new Error(`Failed to deserialize response: ${error}`));
                } finally {
                    delete me.waitingResponses[requestId];
                }
            }
            fileReader.readAsArrayBuffer(event.data);
        },

        sendMessage(request: MessageShape<DescMessage>, responsePrototype: DescMessage) {
            const requestId = uuidv4();
            const sentTimestamp = Date.now();

            const header = create(ApiHeaderSchema);
            header.id = requestId;
            header.timestamp = timestampFromDate(new Date(sentTimestamp));

            // Get access token from auth mechanism
            let accessToken = '';
            
            try {
                // Get auth store
                const authStore = useAuthStore();
                
                // If authenticated with credentials, use token from profile
                if (authStore.isAuthenticated && 
                    authStore.authMethod === 'credentials' && 
                    authStore.userProfile?.token) {
                    accessToken = authStore.userProfile.token;
                } 
                // Otherwise try to get token from Keycloak
                else {
                    // Try to get token from Keycloak
                    const keycloak = getKeycloak();
                    if (keycloak && keycloak.token) {
                        accessToken = keycloak.token;
                    } 
                    // Fallback to auth store if keycloak isn't available
                    else if (authStore.isAuthenticated && authStore.userProfile?.token) {
                        accessToken = authStore.userProfile.token;
                    }
                }
            } catch (error) {
                console.warn('Could not retrieve authentication token:', error);
            }
            
            // Set the access token in the header
            if (accessToken) {
                header.accessToken = accessToken;
            } else {
                console.warn('No access token available for request');
            }

            const message = create(ApiMessageSchema);
            message.header = header;
            const requestSchema = registry.getMessage(request.$typeName)
            if (!requestSchema) {
                return Promise.reject(new Error('Request schema not found'));
            }
            message.payload = anyPack(requestSchema, request);

            return new Promise((resolve, reject) => {
                this.waitingResponses[requestId] = {
                    sentTimestamp,
                    responsePrototype,
                    resolve,
                    reject,
                };

                if (!this.isConnected || !this.socket) {
                    reject(new Error('WebSocket is not connected'));
                } else {
                    try {
                        this.socket.send(toBinary(ApiMessageSchema, message));
                    } catch (error) {
                        delete this.waitingResponses[requestId];
                        reject(error);
                    }
                }
            });
        },

        createEntity(parentId: EntityId, entityType: EntityType, entityName: string) {
            const me = this;
            const request = create(ApiConfigCreateEntityRequestSchema);
            request.parentId = parentId;
            request.name = entityName;
            request.type = entityType;

            return me
                .sendMessage(request, ApiConfigCreateEntityResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigCreateEntityResponse;

                    if (response.status !== ApiConfigCreateEntityResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Could not complete the request: ${response.status}`);
                    }

                    const entity = EntityFactories.newEntity(response.id)
                    entity.field("Name").value = ValueFactories.newString(entityName)
                    entity.field("Parent").value = ValueFactories.newEntityReference(parentId)
                    return entity;
                })
                .catch(error => {
                    throw new Error(`Failed to create entity: ${error}`);
                });
        },

        deleteEntity(entityId: EntityId) {
            const request = create(ApiConfigDeleteEntityRequestSchema);
            request.id = entityId;

            return this.sendMessage(request, ApiConfigDeleteEntityResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigDeleteEntityResponse;
                    if (response.status !== ApiConfigDeleteEntityResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Could not delete entity: ${response.status}`);
                    }
                    return true;
                })
                .catch(error => {
                    throw new Error(`Failed to delete entity: ${error}`);
                });
        },

        async find(entityType: EntityType, fieldTypes: FieldType[] | null = null, conditionFn: (entity: Entity) => boolean = () => true) {
            const me = this;
            const pageSize = 100;
            let cursor = 0;
            const results: Entity[] = [];

            if (fieldTypes === null) {
                const schema = await me.getEntitySchema(entityType);
                fieldTypes = Object.keys(schema.fields) as FieldType[];
            }

            while (cursor >= 0) {
                const page = await this.findEntities(entityType, pageSize, cursor);
                if (page.status !== ApiRuntimeFindEntitiesResponse_StatusEnum.SUCCESS) {
                    return Promise.reject(new Error(`Failed to find entities: ${page.status}`));
                }
                await Promise.all(page.entities.map(async (entityId) => {
                    const entity = EntityFactories.newEntity(entityId);
                    for (const fieldType of fieldTypes) {
                        entity.field(fieldType);
                    }

                    await me.read(Object.values(entity.fields));
                    if (entity && conditionFn(entity)) {
                        results.push(entity);
                    }
                }));
                cursor = Number(page.nextCursor);
            }
            return new Promise((resolve) => {
                resolve(results);
            });
        },

        findEntities(entityType: EntityType, pageSize: number = 100, cursor: number = 0) {
            const request = create(ApiRuntimeFindEntitiesRequestSchema);
            request.entityType = entityType;
            request.pageSize = BigInt(pageSize);
            request.cursor = BigInt(cursor);

            return this.sendMessage(request, ApiRuntimeFindEntitiesResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeFindEntitiesResponse;
                    if (response.status !== ApiRuntimeFindEntitiesResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to find entities: ${response.status}`);
                    }

                    return response;
                })
                .catch(error => {
                    throw new Error(`Failed to find entities: ${error}`);
                });
        },

        getEntityTypes(pageSize: number = 100, cursor: number = 0) {
            const request = create(ApiRuntimeGetEntityTypesRequestSchema);
            request.pageSize = BigInt(pageSize);
            request.cursor = BigInt(cursor);

            return this.sendMessage(request, ApiRuntimeGetEntityTypesResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeGetEntityTypesResponse;
                    if (response.status !== ApiRuntimeGetEntityTypesResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to get entity types: ${response.status}`);
                    }

                    return response;
                })
                .catch(error => {
                    throw new Error(`Failed to get entity types: ${error}`);
                });
        },

        entityExists(entityId: EntityId) {
            const request = create(ApiRuntimeEntityExistsRequestSchema);
            request.entityId = entityId;

            return this.sendMessage(request, ApiRuntimeEntityExistsResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeEntityExistsResponse;
                    if (response.status !== ApiRuntimeEntityExistsResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to check entity existence: ${response.status}`);
                    }
                    return response.exists;
                })
                .catch(error => {
                    throw new Error(`Failed to check entity existence: ${error}`);
                });
        },

        fieldExists(entityType: EntityType, fieldType: FieldType) {
            const request = create(ApiRuntimeFieldExistsRequestSchema);
            request.entityType = entityType;
            request.fieldName = fieldType;

            return this.sendMessage(request, ApiRuntimeFieldExistsResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeFieldExistsResponse;
                    if (response.status !== ApiRuntimeFieldExistsResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to check field existence: ${response.status}`);
                    }
                    return response.exists;
                })
                .catch(error => {
                    throw new Error(`Failed to check field existence: ${error}`);
                });
        },

        getEntitySchema(entityType: EntityType) {
            const request = create(ApiConfigGetEntitySchemaRequestSchema);
            request.type = entityType;

            return this.sendMessage(request, ApiConfigGetEntitySchemaResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigGetEntitySchemaResponse;
                    if (response.status !== ApiConfigGetEntitySchemaResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to get entity schema: ${response.status}`);
                    }

                    // Convert protobuf schema to TypeScript EntitySchema
                    const schema = EntityFactories.newEntitySchema(entityType);
                    const pbSchema = response.schema;
                    if (pbSchema) {
                        pbSchema.fields.forEach(field => {
                            const fieldType = field.name;
                            const valueType = field.type as unknown as ValueType;
                            const fieldSchema = schema.field(fieldType);
                            // Set basic properties from protobuf
                            fieldSchema.valueType = valueType;
                            fieldSchema.readPermissions = field.readPermissions;
                            fieldSchema.writePermissions = field.writePermissions;
                            fieldSchema.rank = field.rank;
                            fieldSchema.choices = field.choiceOptions;
                            fieldSchema.entityType = pbSchema.name;
                        });
                    }
                    console.log('Entity schema:', schema);
                    return schema;
                })
                .catch(error => {
                    throw new Error(`Failed to get entity schema: ${error}`);
                });
        },

        setEntitySchema(schema: EntitySchema) {
            // Convert TypeScript EntitySchema to protobuf schema
            const request = create(ApiConfigSetEntitySchemaRequestSchema);
            const pbSchema = create(DatabaseEntitySchemaSchema);
            pbSchema.name = schema.entityType;

            // Set fields from schema
            Object.entries(schema.fields).forEach(([fieldType, fieldSchema]) => {
                const pbField = create(DatabaseFieldSchemaSchema);
                pbField.name = fieldType;
                pbField.type = fieldSchema.valueType;
                pbField.readPermissions = fieldSchema.readPermissions;
                pbField.writePermissions = fieldSchema.writePermissions;
                pbSchema.fields.push(pbField);
            });

            request.schema = pbSchema;

            return this.sendMessage(request, ApiConfigSetEntitySchemaResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigSetEntitySchemaResponse;
                    if (response.status !== ApiConfigSetEntitySchemaResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to set entity schema: ${response.status}`);
                    }
                    return true;
                })
                .catch(error => {
                    throw new Error(`Failed to set entity schema: ${error}`);
                });
        },

        read(requests: Field[]) {
            const request = create(ApiRuntimeDatabaseRequestSchema);
            request.requestType = ApiRuntimeDatabaseRequest_RequestTypeEnum.READ;
            
            requests.forEach(field => {
                // Use the proper class from the generated protobuf
                const pbRequest = create(DatabaseRequestSchema);
                pbRequest.id = field.entityId;
                pbRequest.field = field.fieldType;
                request.requests.push(pbRequest);
            });

            return this.sendMessage(request, ApiRuntimeDatabaseResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeDatabaseResponse;
                    if (response.status !== ApiRuntimeDatabaseResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Read failed: ${response.status}`);
                    }

                    // Update fields with responses
                    const responsesList = response.response;
                    for (let i = 0; i < Math.min(responsesList.length, requests.length); i++) {
                        const resp = responsesList[i];
                        if (resp.success) {
                            const field = requests[i];
                            
                            // Handle value conversion from Any protobuf
                            const value = resp.value;
                            if (value) {
                                // Convert based on the field's expected type
                                field.value = valueFromProtobuf(value);
                            }
                            
                            // Set write time and writer ID if available
                            const writeTime = resp.writeTime;
                            if (writeTime && writeTime.raw) {
                                field.writeTime = timestampDate(writeTime.raw);
                            } else {
                                field.writeTime = new Date(0);
                            }

                            const writerId = resp.writerId;
                            if (writerId && writerId.raw) {
                                field.writerId = writerId.raw;
                            } else {
                                field.writerId = '';
                            }
                        }
                    }
                    
                    return requests;
                })
                .catch(error => {
                    throw new Error(`Read operation failed: ${error}`);
                });
        },

        write(requests: Field[], writeOpt: WriteOpt = 0) {
            const request = create(ApiRuntimeDatabaseRequestSchema);
            request.requestType = ApiRuntimeDatabaseRequest_RequestTypeEnum.WRITE;
            
            requests.forEach(field => {
                // Use the proper class from the generated protobuf
                const pbRequest = create(DatabaseRequestSchema);
                pbRequest.id = field.entityId;
                pbRequest.field = field.fieldType;

                // Convert field value to Any protobuf
                const valueSchema = registry.getMessage(field.value.pbType());
                if (!valueSchema) {
                    return Promise.reject(new Error(`Value schema not found for ${field.value.pbType()}`));
                }
                const anyValue = create(valueSchema, { raw: field.value.pbValue() });
                pbRequest.value = anyPack(valueSchema, anyValue);
                
                request.requests.push(pbRequest);
            });

            return this.sendMessage(request, ApiRuntimeDatabaseResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeDatabaseResponse;
                    if (response.status !== ApiRuntimeDatabaseResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Write failed: ${response.status}`);
                    }
                    
                    // Update field success status
                    const responsesList = response.response;
                    for (let i = 0; i < Math.min(responsesList.length, requests.length); i++) {
                        const success = responsesList[i].success;
                        if (!success) {
                            console.warn(`Field write failed for ${requests[i].entityId}:${requests[i].fieldType}`);
                        }
                    }
                    
                    return true;
                })
                .catch(error => {
                    throw new Error(`Write operation failed: ${error}`);
                });
        },

        prepareQuery(sql: string, args: any[] = []) {
            const request = create(ApiRuntimeQueryRequestSchema);
            request.query = sql;
            request.pageSize = BigInt(100);
            request.cursor = BigInt(0);

            // Handle special args like page size, cursor, etc.
            args.forEach(arg => {
                if (typeof arg === 'number' && arg > 0) {
                    request.pageSize = BigInt(arg);
                }
            });

            return this.sendMessage(request, ApiRuntimeQueryResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeQueryResponse;
                    if (response.status !== ApiRuntimeQueryResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Query failed: ${response.status}`);
                    }

                    const rows = response.rows.map(row => {
                        const convertedRow: Record<string, any> = {};
                        const columnsList = Array.isArray(row.columns) ? row.columns : [];

                        columnsList.forEach((col: QueryColumn) => {
                            if (col.isSelected) {
                                convertedRow[col.key] = col.value;
                            }
                        });

                        return convertedRow;
                    });

                    return {
                        rows,
                        nextCursor: response.nextCursor,
                        hasMore: response.nextCursor >= 0
                    };
                })
                .catch(error => {
                    throw new Error(`Query operation failed: ${error}`);
                });
        },

        // Notification support
        registerNotification(config: NotificationConfig) {
            const request = create(ApiRuntimeRegisterNotificationRequestSchema);
            
            const notificationConfig = create(DatabaseNotificationConfigSchema);
            if (config.entityId) notificationConfig.id = config.entityId;
            if (config.fieldType) notificationConfig.field = config.fieldType;
            if (config.entityType) notificationConfig.type = config.entityType;
            if (config.serviceId) notificationConfig.serviceId = config.serviceId;

            request.requests.push(notificationConfig);

            return this.sendMessage(request, ApiRuntimeRegisterNotificationResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeRegisterNotificationResponse;
                    if (response.status !== ApiRuntimeRegisterNotificationResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to register notification: ${response.status}`);
                    }

                    // Return the token from the response
                    return response.tokens[0] || '';
                })
                .catch(error => {
                    throw new Error(`Failed to register notification: ${error}`);
                });
        },

        unregisterNotification(token: string) {
            const request = create(ApiRuntimeUnregisterNotificationRequestSchema);
            request.tokens.push(token);

            return this.sendMessage(request, ApiRuntimeUnregisterNotificationResponseSchema)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeUnregisterNotificationResponse;
                    if (response.status !== ApiRuntimeUnregisterNotificationResponse_StatusEnum.SUCCESS) {
                        throw new Error(`Failed to unregister notification: ${response.status}`);
                    }
                    return true;
                })
                .catch(error => {
                    throw new Error(`Failed to unregister notification: ${error}`);
                });
        },

        // Notification handling
        notify(config: NotificationConfig, callback: NotificationCallback) {            
            return this.registerNotification(config)
                .then(receivedToken => {
                    // Add the callback to our notification manager
                    this.notificationManager.addListener(receivedToken, callback);
                    return {
                        token: receivedToken,
                        unsubscribe: () => {
                            this.notificationManager.removeListener(receivedToken, callback);
                            return this.unregisterNotification(receivedToken);
                        }
                    };
                });
        },

        // Add callback to be executed when connection is lost
        onConnectionLost(callback: () => void) {
            this.connectionLostCallbacks.push(callback);
        },

        // Remove connection lost callback
        removeConnectionLostCallback(callback: () => void) {
            const index = this.connectionLostCallbacks.indexOf(callback);
            if (index !== -1) {
                this.connectionLostCallbacks.splice(index, 1);
            }
        },

        // Trigger all connection lost callbacks
        triggerConnectionLostCallbacks() {
            console.warn('Database connection lost - triggering callbacks');
            this.connectionLostCallbacks.forEach(callback => {
                try {
                    callback();
                } catch (err) {
                    console.error('Error in connection lost callback:', err);
                }
            });
        },
    },
})