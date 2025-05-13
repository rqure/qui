import { defineStore } from 'pinia';
import { getApiBaseUrl } from '@/core/utils/url';
import { Message } from 'google-protobuf';
import { Timestamp } from 'google-protobuf/google/protobuf/timestamp_pb';
import { Any } from 'google-protobuf/google/protobuf/any_pb';
import { v4 as uuidv4 } from 'uuid';
import { ApiHeader, ApiMessage, ApiConfigCreateEntityRequest, ApiConfigCreateEntityResponse, DatabaseNotification, ApiRuntimeRegisterNotificationRequest, ApiRuntimeRegisterNotificationResponse, DatabaseNotificationConfig, ApiRuntimeUnregisterNotificationRequest, ApiRuntimeUnregisterNotificationResponse, ApiRuntimeDatabaseRequest, ApiRuntimeDatabaseResponse, ApiRuntimeEntityExistsRequest, ApiRuntimeEntityExistsResponse, ApiRuntimeFieldExistsRequest, ApiRuntimeFieldExistsResponse, ApiConfigGetEntitySchemaRequest, ApiConfigGetEntitySchemaResponse, ApiConfigSetEntitySchemaRequest, ApiConfigSetEntitySchemaResponse, ApiConfigDeleteEntityRequest, ApiConfigDeleteEntityResponse, ApiRuntimeFindEntitiesRequest, ApiRuntimeFindEntitiesResponse, ApiRuntimeGetEntityTypesRequest, ApiRuntimeGetEntityTypesResponse, ApiRuntimeQueryRequest, ApiRuntimeQueryResponse, DatabaseEntitySchema, DatabaseFieldSchema, DatabaseRequest, String as PbString, QueryColumn } from '@/generated/qlib/pkg/qprotobufs/protobufs_pb';
import { EntityFactories, NotificationManager, ValueFactories } from '@/core/data/types';
import type { EntityId, EntityType, Entity, FieldType, Value, Field, EntitySchema, FieldSchema, WriteOpt, ValueType } from '@/core/data/types';
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
  (notification: DatabaseNotification): void;
}

interface DeserializableMessage {
    deserializeBinary(data: Uint8Array): Message;
}

interface WaitingResponse {
    sentTimestamp: number;
    responsePrototype: DeserializableMessage;
    resolve: (value: Message) => void;
    reject: (error: Error) => void;
}

// Add helper function to convert values from protobuf
function valueFromProtobuf(anyValue: Any): Value {
    // This is a simplified implementation - in a real app you'd need to
    // check the type in the Any message and properly deserialize it
    const typeUrl = anyValue.getTypeUrl();
    
    if (typeUrl.includes('Int')) {
        return ValueFactories.newInt(0); // Parse actual value
    } else if (typeUrl.includes('Float')) {
        return ValueFactories.newFloat(0); // Parse actual value
    } else if (typeUrl.includes('String')) {
        return ValueFactories.newString(''); // Parse actual value
    } else if (typeUrl.includes('Bool')) {
        return ValueFactories.newBool(false); // Parse actual value
    } else if (typeUrl.includes('EntityReference')) {
        return ValueFactories.newEntityReference(''); // Parse actual value
    } else if (typeUrl.includes('Timestamp')) {
        return ValueFactories.newTimestamp(new Date());  // Parse actual value
    } else {
        // Default to string value
        return ValueFactories.newString('');
    }
}

export const useDataStore = defineStore('data', {
    state: () => ({
        socket: null as WebSocket | null,
        isConnected: false,
        waitingResponses: {} as Record<string, WaitingResponse>,
        notificationManager: new NotificationManager(),
    }),

    actions: {
        // Add an initialization method for post-login setup
        initialize() {
            console.log('Initializing data store connection')
            this.connect()
        },

        connect() {
            const me = this;

            if (!me.socket) {
                me.socket = new WebSocket(getApiBaseUrl());
                me.socket.onopen = () => {
                    me.isConnected = true;
                };
                me.socket.onclose = () => {
                    me.isConnected = false;
                    me.socket = null;

                    for (const requestId in me.waitingResponses) {
                        const request = me.waitingResponses[requestId];
                        request.reject(new Error('WebSocket connection closed'));
                    }

                    me.waitingResponses = {};

                    // reconnect after 1 second
                    setTimeout(() => {
                        me.connect();
                    }, 1000);
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

            if (this.socket) {
                console.log('Disconnecting WebSocket')
                this.socket.close();
                this.socket = null;
                this.isConnected = false;
                // Clear any pending responses
                this.waitingResponses = {};
            }
        },

        onMessage(event: MessageEvent) {
            const me = this;
            const fileReader = new FileReader();
            fileReader.onload = (e) => {
                const message = ApiMessage.deserializeBinary(new Uint8Array(e.target?.result as ArrayBuffer));
                const requestId = message.getHeader()?.getId();
                if (!requestId) {
                    console.warn('Received message without request ID:', message);
                    return;
                }

                const payload = message.getPayload();
                if (!payload) {
                    console.warn('Received message without payload:', message);
                    return;
                }

                // Check if this is a notification
                if (payload.getTypeUrl().includes('DatabaseNotification')) {
                    try {
                        const notificationBytes = payload.getValue_asU8();
                        const notification = DatabaseNotification.deserializeBinary(notificationBytes);
                        me.notificationManager.dispatch(notification.getToken(), notification);
                        return;
                    } catch (error) {
                        console.error('Error processing notification:', error);
                    }
                }

                // Handle regular responses
                if (!me.waitingResponses[requestId]) {
                    console.warn('Received message without matching request ID:', requestId);
                    return;
                }

                const request = me.waitingResponses[requestId];
                const payloadBytes = payload.getValue_asU8();
                if (!payloadBytes) {
                    console.warn('Received message without payload data:', message);
                    request.reject(new Error('Received message without payload data'));
                    return;
                }

                try {
                    const response = request.responsePrototype.deserializeBinary(payloadBytes);
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

        sendMessage(request: Message, responsePrototype: DeserializableMessage) {
            const requestId = uuidv4();
            const sentTimestamp = Date.now();

            const header = new ApiHeader();
            header.setId(requestId);
            header.setTimestamp(Timestamp.fromDate(new Date(sentTimestamp)));
            
            // Get access token from auth mechanism
            let accessToken = '';
            
            try {
                // Try to get token from Keycloak first
                const keycloak = getKeycloak();
                if (keycloak && keycloak.token) {
                    accessToken = keycloak.token;
                } else {
                    // Fallback to auth store if keycloak isn't available or initialized
                    const authStore = useAuthStore();
                    if (authStore.isAuthenticated && authStore.userProfile?.token) {
                        accessToken = authStore.userProfile.token;
                    }
                }
            } catch (error) {
                console.warn('Could not retrieve authentication token:', error);
            }
            
            // Set the access token in the header
            if (accessToken) {
                header.setAccesstoken(accessToken);
            }

            const message = new ApiMessage();
            message.setHeader(header);
            message.setPayload(new Any());
            message.getPayload()?.pack(request.serializeBinary(), 'qprotobufs.' + request.constructor.name);

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
                        this.socket.send(message.serializeBinary());
                        console.log('Request sent:', requestId, request.constructor.name);
                    } catch (error) {
                        delete this.waitingResponses[requestId];
                        reject(error);
                    }
                }
            });
        },

        createEntity(parentId: EntityId, entityType: EntityType, entityName: string) {
            const me = this;
            const request = new ApiConfigCreateEntityRequest();
            request.setParentid(parentId);
            request.setName(entityName);
            request.setType(entityType);

            return me
                .sendMessage(request, ApiConfigCreateEntityResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigCreateEntityResponse;

                    if (response.getStatus() !== ApiConfigCreateEntityResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Could not complete the request: ${response.getStatus()}`);
                    }
                    
                    const entity = EntityFactories.newEntity(response.getId())
                    entity.field("Name").value = ValueFactories.newString(entityName)
                    entity.field("Parent").value = ValueFactories.newEntityReference(parentId)
                    return entity;
                })
                .catch(error => {
                    throw new Error(`Failed to create entity: ${error}`);
                });
        },

        deleteEntity(entityId: EntityId) {
            const request = new ApiConfigDeleteEntityRequest();
            request.setId(entityId);

            return this.sendMessage(request, ApiConfigDeleteEntityResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigDeleteEntityResponse;
                    if (response.getStatus() !== ApiConfigDeleteEntityResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Could not delete entity: ${response.getStatus()}`);
                    }
                    return true;
                })
                .catch(error => {
                    throw new Error(`Failed to delete entity: ${error}`);
                });
        },

        findEntities(entityType: EntityType, pageSize: number = 100, cursor: number = 0) {
            const request = new ApiRuntimeFindEntitiesRequest();
            request.setEntityType(entityType);
            request.setPageSize(pageSize);
            request.setCursor(cursor);

            return this.sendMessage(request, ApiRuntimeFindEntitiesResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeFindEntitiesResponse;
                    if (response.getStatus() !== ApiRuntimeFindEntitiesResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to find entities: ${response.getStatus()}`);
                    }

                    return {
                        entities: response.getEntitiesList(),
                        nextCursor: response.getNextCursor(),
                    };
                })
                .catch(error => {
                    throw new Error(`Failed to find entities: ${error}`);
                });
        },

        getEntityTypes(pageSize: number = 100, cursor: number = 0) {
            const request = new ApiRuntimeGetEntityTypesRequest();
            request.setPageSize(pageSize);
            request.setCursor(cursor);

            return this.sendMessage(request, ApiRuntimeGetEntityTypesResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeGetEntityTypesResponse;
                    if (response.getStatus() !== ApiRuntimeGetEntityTypesResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to get entity types: ${response.getStatus()}`);
                    }

                    return {
                        entityTypes: response.getEntityTypesList(),
                        nextCursor: response.getNextCursor(),
                    };
                })
                .catch(error => {
                    throw new Error(`Failed to get entity types: ${error}`);
                });
        },

        entityExists(entityId: EntityId) {
            const request = new ApiRuntimeEntityExistsRequest();
            request.setEntityid(entityId);

            return this.sendMessage(request, ApiRuntimeEntityExistsResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeEntityExistsResponse;
                    if (response.getStatus() !== ApiRuntimeEntityExistsResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to check entity existence: ${response.getStatus()}`);
                    }
                    return response.getExists();
                })
                .catch(error => {
                    throw new Error(`Failed to check entity existence: ${error}`);
                });
        },

        fieldExists(entityType: EntityType, fieldType: FieldType) {
            const request = new ApiRuntimeFieldExistsRequest();
            request.setEntitytype(entityType);
            request.setFieldname(fieldType);

            return this.sendMessage(request, ApiRuntimeFieldExistsResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeFieldExistsResponse;
                    if (response.getStatus() !== ApiRuntimeFieldExistsResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to check field existence: ${response.getStatus()}`);
                    }
                    return response.getExists();
                })
                .catch(error => {
                    throw new Error(`Failed to check field existence: ${error}`);
                });
        },

        getEntitySchema(entityType: EntityType) {
            const request = new ApiConfigGetEntitySchemaRequest();
            request.setType(entityType);

            return this.sendMessage(request, ApiConfigGetEntitySchemaResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigGetEntitySchemaResponse;
                    if (response.getStatus() !== ApiConfigGetEntitySchemaResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to get entity schema: ${response.getStatus()}`);
                    }

                    // Convert protobuf schema to TypeScript EntitySchema
                    const schema = EntityFactories.newEntitySchema(entityType);
                    const pbSchema = response.getSchema();
                    if (pbSchema) {
                        pbSchema.getFieldsList().forEach(field => {
                            const fieldType = field.getName();
                            const valueType = field.getType() as unknown as ValueType;
                            const fieldSchema = schema.field(fieldType);
                            // Set basic properties from protobuf
                            fieldSchema.valueType = valueType;
                            fieldSchema.readPermissions = field.getReadPermissionsList();
                            fieldSchema.writePermissions = field.getWritePermissionsList();
                        });
                    }
                    return schema;
                })
                .catch(error => {
                    throw new Error(`Failed to get entity schema: ${error}`);
                });
        },

        setEntitySchema(schema: EntitySchema) {
            // Convert TypeScript EntitySchema to protobuf schema
            const request = new ApiConfigSetEntitySchemaRequest();
            const pbSchema = new DatabaseEntitySchema();
            pbSchema.setName(schema.entityType);

            // Set fields from schema
            Object.entries(schema.fields).forEach(([fieldType, fieldSchema]) => {
                const pbField = new DatabaseFieldSchema();
                pbField.setName(fieldType);
                pbField.setType(fieldSchema.valueType as unknown as string);
                pbField.setReadPermissionsList(fieldSchema.readPermissions);
                pbField.setWritePermissionsList(fieldSchema.writePermissions);
                pbSchema.addFields(pbField);
            });

            request.setSchema(pbSchema);

            return this.sendMessage(request, ApiConfigSetEntitySchemaResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiConfigSetEntitySchemaResponse;
                    if (response.getStatus() !== ApiConfigSetEntitySchemaResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to set entity schema: ${response.getStatus()}`);
                    }
                    return true;
                })
                .catch(error => {
                    throw new Error(`Failed to set entity schema: ${error}`);
                });
        },

        read(requests: Field[]) {
            const request = new ApiRuntimeDatabaseRequest();
            request.setRequesttype(ApiRuntimeDatabaseRequest.RequestTypeEnum.READ);
            
            requests.forEach(field => {
                // Use the proper class from the generated protobuf
                const pbRequest = new DatabaseRequest();
                pbRequest.setId(field.entityId);
                pbRequest.setField(field.fieldType);
                request.addRequests(pbRequest);
            });

            return this.sendMessage(request, ApiRuntimeDatabaseResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeDatabaseResponse;
                    if (response.getStatus() !== ApiRuntimeDatabaseResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Read failed: ${response.getStatus()}`);
                    }

                    // Update fields with responses
                    const responsesList = response.getResponseList();
                    for (let i = 0; i < Math.min(responsesList.length, requests.length); i++) {
                        const resp = responsesList[i];
                        if (resp.getSuccess()) {
                            const field = requests[i];
                            
                            // Handle value conversion from Any protobuf
                            const value = resp.getValue();
                            if (value) {
                                // Convert based on the field's expected type
                                field.value = valueFromProtobuf(value);
                            }
                            
                            // Set write time and writer ID if available
                            const writeTime = resp.getWritetime();
                            if (writeTime && writeTime.getRaw()) {
                                field.writeTime = writeTime.getRaw()?.toDate() || new Date(0);
                            }
                            
                            const writerId = resp.getWriterid();
                            if (writerId && writerId.getRaw()) {
                                field.writerId = writerId.getRaw();
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
            const request = new ApiRuntimeDatabaseRequest();
            request.setRequesttype(ApiRuntimeDatabaseRequest.RequestTypeEnum.WRITE);
            
            requests.forEach(field => {
                // Use the proper class from the generated protobuf
                const pbRequest = new DatabaseRequest();
                pbRequest.setId(field.entityId);
                pbRequest.setField(field.fieldType);
                
                // Convert field value to Any protobuf
                const anyValue = new Any();
                // TODO: Implement proper value serialization based on field.value.type
                pbRequest.setValue(anyValue);
                
                // Set writer ID if available
                if (field.writerId) {
                    const writerIdPb = new PbString();
                    writerIdPb.setRaw(field.writerId);
                    pbRequest.setWriterid(writerIdPb);
                }
                
                request.addRequests(pbRequest);
            });

            return this.sendMessage(request, ApiRuntimeDatabaseResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeDatabaseResponse;
                    if (response.getStatus() !== ApiRuntimeDatabaseResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Write failed: ${response.getStatus()}`);
                    }
                    
                    // Update field success status
                    const responsesList = response.getResponseList();
                    for (let i = 0; i < Math.min(responsesList.length, requests.length); i++) {
                        const success = responsesList[i].getSuccess();
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
            const request = new ApiRuntimeQueryRequest();
            request.setQuery(sql);
            request.setPageSize(100);
            request.setCursor(0);
            
            // Handle special args like page size, cursor, etc.
            args.forEach(arg => {
                if (typeof arg === 'number' && arg > 0) {
                    request.setPageSize(arg);
                }
            });

            return this.sendMessage(request, ApiRuntimeQueryResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeQueryResponse;
                    if (response.getStatus() !== ApiRuntimeQueryResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Query failed: ${response.getStatus()}`);
                    }

                    const rows = response.getRowsList().map(row => {
                        const convertedRow: Record<string, any> = {};
                        const columnsList = Array.isArray(row.getColumnsList?.()) 
                            ? row.getColumnsList?.() 
                            : [];
                        
                        columnsList.forEach((col: QueryColumn) => {
                            if (col.getIsSelected()) {
                                convertedRow[col.getKey()] = col.getValue();
                            }
                        });

                        return convertedRow;
                    });

                    return {
                        rows,
                        nextCursor: response.getNextCursor(),
                        hasMore: response.getNextCursor() >= 0
                    };
                })
                .catch(error => {
                    throw new Error(`Query operation failed: ${error}`);
                });
        },

        // Notification support
        registerNotification(config: NotificationConfig) {
            const request = new ApiRuntimeRegisterNotificationRequest();
            
            const notificationConfig = new DatabaseNotificationConfig();
            if (config.entityId) notificationConfig.setId(config.entityId);
            if (config.fieldType) notificationConfig.setField(config.fieldType);
            if (config.entityType) notificationConfig.setType(config.entityType);
            if (config.serviceId) notificationConfig.setServiceid(config.serviceId);
            
            request.addRequests(notificationConfig);

            return this.sendMessage(request, ApiRuntimeRegisterNotificationResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeRegisterNotificationResponse;
                    if (response.getStatus() !== ApiRuntimeRegisterNotificationResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to register notification: ${response.getStatus()}`);
                    }

                    // Return the token from the response
                    return response.getTokensList()[0] || '';
                })
                .catch(error => {
                    throw new Error(`Failed to register notification: ${error}`);
                });
        },

        unregisterNotification(token: string) {
            const request = new ApiRuntimeUnregisterNotificationRequest();
            request.addTokens(token);

            return this.sendMessage(request, ApiRuntimeUnregisterNotificationResponse)
                .then((anyResponse) => {
                    const response = anyResponse as ApiRuntimeUnregisterNotificationResponse;
                    if (response.getStatus() !== ApiRuntimeUnregisterNotificationResponse.StatusEnum.SUCCESS) {
                        throw new Error(`Failed to unregister notification: ${response.getStatus()}`);
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
        }
    },
})