import { defineStore } from 'pinia';
import { getApiBaseUrl, getWebSocketUrl } from '@/core/utils/url';
import { useAuthStore } from '@/stores/auth';
import type { EntityId, EntityType, FieldType } from '@/core/data/types';
import {
  Entity,
  EntitySchema,
  Field,
  FieldSchema,
  Value,
  ValueType,
  EntityFactories,
  ValueFactories
} from '@/core/data/types';

// Notification configuration
export interface NotificationConfig {
  entityId?: EntityId;
  entityType?: EntityType;
  field: FieldType | string;
  triggerOnChange?: boolean;
  context?: string[][];
}

export interface NotificationCallback {
  (notification: any): void;
}

interface NotificationSubscription {
  token: string;
  unsubscribe: () => Promise<void>;
}

export const useDataStore = defineStore('data', {
  state: () => ({
    socket: null as WebSocket | null,
    isConnected: false,
    pendingRequests: {} as Record<string, { resolve: (value: any) => void; reject: (error: any) => void }>,
    notificationCallbacks: {} as Record<string, NotificationCallback[]>,
    connectionLostCallbacks: [] as (() => void)[],
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    connectionTimeout: null as number | null,
    connectionTimeoutMs: 5000,
  }),

  actions: {
    initialize() {
      console.log('Initializing data store connection');
      this.connect();
    },

    cleanup() {
      this.disconnect();
    },

    connect() {
      if (this.socket && (this.socket.readyState === WebSocket.CONNECTING || this.socket.readyState === WebSocket.OPEN)) {
        console.log('WebSocket already connected or connecting');
        return;
      }

      // Clear any existing connection timeout
      if (this.connectionTimeout !== null) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      const authStore = useAuthStore();
      const token = authStore.userProfile?.token;

      let wsUrl = getWebSocketUrl();
      if (token) {
        wsUrl += `?token=${encodeURIComponent(token)}`;
      }

      console.log('Connecting to WebSocket:', wsUrl);

      this.socket = new WebSocket(wsUrl);

      // Set connection timeout
      this.connectionTimeout = window.setTimeout(() => {
        if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
          console.warn('WebSocket connection timeout');
          this.socket.close();
        }
      }, this.connectionTimeoutMs);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;

        // Clear connection timeout on successful connection
        if (this.connectionTimeout !== null) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }
      };

      this.socket.onclose = (event) => {
        const wasConnected = this.isConnected;
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnected = false;

        // Clear connection timeout
        if (this.connectionTimeout !== null) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

        // Store reference before clearing
        const closedSocket = this.socket;
        this.socket = null;

        Object.keys(this.pendingRequests).forEach(id => {
          this.pendingRequests[id].reject(new Error('WebSocket connection closed'));
          delete this.pendingRequests[id];
        });

        if (wasConnected) {
          this.triggerConnectionLostCallbacks();
        }

        // Only attempt reconnect if this was an unexpected closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
          this.reconnectAttempts++;

          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => {
            // Double-check we're still disconnected before attempting reconnect
            if (!this.socket || this.socket === closedSocket) {
              this.connect();
            }
          }, delay);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.socket.onmessage = (event) => {
        this.onMessage(event);
      };
    },

    disconnect() {
      if (this.connectionTimeout !== null) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      if (this.socket) {
        console.log('Disconnecting WebSocket');
        this.socket.close(1000, 'Normal closure');
        this.socket = null;
        this.isConnected = false;
        this.pendingRequests = {};
      }
    },

    onMessage(event: MessageEvent) {
      try {
        const message = JSON.parse(event.data);

        // qweb WebSocket messages can be:
        // 1. Notifications: {type: "notification", ...}
        // 2. Responses: {success: bool, data?: any, error?: string, request_id?: string}

        if (message.type === 'notification') {
          this.handleNotification(message);
          return;
        }

        // Handle responses with request_id
        if (message.request_id && this.pendingRequests[message.request_id]) {
          const pending = this.pendingRequests[message.request_id];
          delete this.pendingRequests[message.request_id];

          if (message.success) {
            pending.resolve(message.data || message);
          } else {
            pending.reject(new Error(message.error || 'Request failed'));
          }
          return;
        }

        if (message.success !== undefined) {
          console.log('Received WebSocket response:', message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    },

    handleNotification(notification: any) {
      console.log('Received notification:', notification);

      // qweb notifications have a config field with the notification configuration
      // We need to match this against registered callbacks
      if (notification.config) {
        const config = notification.config;

        // Create a key to match callbacks
        const key = JSON.stringify({
          entity_id: config.entity_id,
          entity_type: config.entity_type,
          field: String(config.field),
        });

        const callbacks = this.notificationCallbacks[key] || [];
        callbacks.forEach(callback => {
          try {
            callback(notification);
          } catch (error) {
            console.error('Error in notification callback:', error);
          }
        });
      }
    },

    async sendWebSocketRequest(request: any): Promise<any> {
      if (!this.isConnected || !this.socket) {
        throw new Error('WebSocket is not connected');
      }

      return new Promise((resolve, reject) => {
        // Generate a unique request ID
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Store the promise handlers
        this.pendingRequests[requestId] = { resolve, reject };

        // Add request_id to the request
        const requestWithId = { ...request, request_id: requestId };

        try {
          this.socket!.send(JSON.stringify(requestWithId));

          // Set a timeout for the request
          setTimeout(() => {
            if (this.pendingRequests[requestId]) {
              delete this.pendingRequests[requestId];
              reject(new Error('Request timeout'));
            }
          }, 30000); // 30 second timeout
        } catch (error) {
          delete this.pendingRequests[requestId];
          reject(error);
        }
      });
    },

    async apiRequest(endpoint: string, data: any): Promise<any> {
      const authStore = useAuthStore();
      const token = authStore.userProfile?.token;

      const response = await fetch(`${getApiBaseUrl()}/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();

      // qweb returns {success: bool, data?: any, error?: string}
      if (!result.success) {
        throw new Error(result.error || 'Request failed');
      }

      return result.data;
    },

    // Convert qweb value type string to ValueType enum
    parseValueType(typeStr: string): ValueType {
      const typeMap: Record<string, ValueType> = {
        'Int': ValueType.Int,
        'Float': ValueType.Float,
        'String': ValueType.String,
        'Bool': ValueType.Bool,
        'BinaryFile': ValueType.BinaryFile,
        'EntityReference': ValueType.EntityReference,
        'Timestamp': ValueType.Timestamp,
        'Choice': ValueType.Choice,
        'EntityList': ValueType.EntityList,
      };
      return typeMap[typeStr] || ValueType.String;
    },

    // Convert qweb field value to Value object
    parseFieldValue(value: any): Value {
      if (value === null || value === undefined) {
        return ValueFactories.newString('');
      }

      // Handle different value types from qweb
      if (typeof value === 'object') {
        // qweb uses variant enums like {Bool: true}, {Int: 42}, {String: "hello"}, etc.
        const keys = Object.keys(value);
        if (keys.length === 1) {
          const valueType = keys[0];
          const innerValue = value[valueType];

          switch (valueType) {
            case 'Bool':
              return ValueFactories.newBool(innerValue);
            case 'Int':
              return ValueFactories.newInt(innerValue);
            case 'Float':
              return ValueFactories.newFloat(innerValue);
            case 'String':
              return ValueFactories.newString(innerValue);
            case 'EntityReference':
              return ValueFactories.newEntityReference(innerValue ? Number(innerValue) : null);
            case 'EntityList':
              // EntityList is serialized as an array of numbers/strings from Rust
              if (Array.isArray(innerValue)) {
                return ValueFactories.newEntityList(innerValue.map((id: any) => Number(id)));
              }
              return ValueFactories.newEntityList([]);
            case 'Timestamp':
              if (typeof innerValue === 'object' && innerValue.secs !== undefined) {
                const date = new Date(innerValue.secs * 1000 + (innerValue.nanos || 0) / 1000000);
                return ValueFactories.newTimestamp(date);
              }
              return ValueFactories.newTimestamp(new Date(innerValue));
            case 'Choice':
              return ValueFactories.newChoice(innerValue);
            default:
              console.warn(`Unknown value type: ${valueType}`);
              return ValueFactories.newString(JSON.stringify(value));
          }
        }
      }

      // Fallback for primitive values
      if (typeof value === 'boolean') return ValueFactories.newBool(value);
      if (typeof value === 'number') return ValueFactories.newInt(value);
      if (typeof value === 'string') return ValueFactories.newString(value);

      return ValueFactories.newString(JSON.stringify(value));
    },

    // Convert Value object to qweb JSON format
    serializeValue(value: Value): any {
      switch (value.type) {
        case ValueType.Int:
        case ValueType.Float:
        case ValueType.Bool:
        case ValueType.String:
        case ValueType.Choice:
          return value.raw;

        case ValueType.Timestamp:
          // Convert Date to ISO string for qweb
          return (value.raw as Date).toISOString();

        case ValueType.EntityReference:
          // Keep internal representation as bigint | null; JSON replacer will convert bigint -> string
          return value.raw;

        case ValueType.EntityList:
          // Keep array of bigints; JSON replacer will convert each bigint to a string
          if (Array.isArray(value.raw)) {
            return value.raw;
          }
          return [];

        case ValueType.BinaryFile:
          // Binary files need special handling
          return value.raw;

        default:
          return value.raw;
      }
    },

    // Create entity
    async createEntity(entityType: string, name: string): Promise<EntityId> {
      const data = await this.apiRequest('create', {
        entity_type: entityType,
        name: name,
      });
      return Number(data.entity_id);
    },

    // Delete entity
    async deleteEntity(entityId: EntityId): Promise<void> {
      await this.apiRequest('delete', {
        entity_id: entityId,
      });
    },

    // Read fields from entities
    async read(fields: Field[]): Promise<void> {
      if (fields.length === 0) return;

      // Read each field individually
      await Promise.all(fields.map(async (field) => {
        try {
          const data = await this.apiRequest('read', {
            entity_id: field.entityId,
            fields: [field.fieldType],
          });

          if (data && data.value !== undefined) {
            field.value = this.parseFieldValue(data.value);

            if (data.timestamp) {
              const ts = data.timestamp;
              if (typeof ts === 'object' && ts.secs !== undefined) {
                field.writeTime = new Date(ts.secs * 1000 + ts.nanos / 1000000);
              } else {
                field.writeTime = new Date(ts);
              }
            }
            if (data.writer_id) {
              field.writerId = Number(data.writer_id);
            } else {
              field.writerId = null;
            }
          }
        } catch (error) {
          console.error(`Failed to read field ${field.fieldType} for entity ${field.entityId}:`, error);
          throw error;
        }
      }));
    },

    // Write fields to entities
    async write(fields: Field[]): Promise<void> {
      // Write all fields in parallel
      await Promise.all(fields.map(async (field) => {
        try {
          await this.apiRequest('write', {
            entity_id: field.entityId,
            field: field.fieldType,
            value: this.serializeValue(field.value),
          });
        } catch (error) {
          console.error(`Failed to write field ${field.fieldType} for entity ${field.entityId}:`, error);
          throw error;
        }
      }));
    },

    // Find entities - returns array of Entity objects
    async find(entityType: string, filter?: string): Promise<Entity[]> {
      const data = await this.apiRequest('find', {
        entity_type: entityType,
        filter: filter,
      });

      // Convert entity IDs to Entity objects
      const entities: Entity[] = [];
      // qweb returns 'entities' not 'entity_ids'
      const entityIds = data.entities || data.entity_ids || [];
      if (Array.isArray(entityIds)) {
        entityIds.forEach((id: any) => {
          const eid = Number(id);
          const entity = EntityFactories.newEntity(eid);
          // entityType param is a string here, convert to number for internal representation
          entity.entityType = Number(entityType);
          entities.push(entity);
        });
      }

      return entities;
    },

    // Get all entity types
    async getAllEntityTypes(): Promise<string[]> {
      // qweb doesn't have a direct endpoint for this, so we need to implement it differently
      // For now, return empty array - this would need to be implemented in qweb backend
      console.warn('getAllEntityTypes not yet implemented in qweb');
      return [];
    },

    // Resolve entity type number to name
    async resolveEntityType(entityType: EntityType): Promise<string> {
      try {
        const data = await this.apiRequest('resolve_entity_type', {
          entity_type: entityType.toString(),
        });
        return data.name || entityType.toString();
      } catch (error) {
        console.error(`Failed to resolve entity type ${entityType}:`, error);
        return entityType.toString();
      }
    },

    // Get entity type ID by name
    async getEntityType(name: string): Promise<EntityType> {
      try {
        const data = await this.apiRequest('get_entity_type', {
          name: name,
        });
        return Number(data.entity_type);
      } catch (error) {
        console.error(`Failed to get entity type for ${name}:`, error);
        throw error;
      }
    },

    // Get field type ID by name
    async getFieldType(name: string): Promise<FieldType> {
      try {
        const data = await this.apiRequest('get_field_type', {
          name: name,
        });
        return Number(data.field_type);
      } catch (error) {
        console.error(`Failed to get field type for ${name}:`, error);
        throw error;
      }
    },

    // Get entity schema
    async getEntitySchema(entityType: string): Promise<EntitySchema> {
      if (!entityType || entityType.trim() === '') {
        throw new Error('Entity type cannot be empty');
      }

      const data = await this.apiRequest('schema', {
        entity_type: entityType,
      });

      // entityType comes as string from API, convert to number
      const entityTypeNum = typeof entityType === 'string' ? parseInt(entityType) : entityType;
      const schema = new EntitySchema(entityTypeNum);

      // qweb returns {entity_type: string, schema: {...}}
      const schemaData = data.schema || data;

      // Parse fields from schema - convert string keys to numbers
      if (schemaData.fields) {
        Object.keys(schemaData.fields).forEach(fieldKey => {
          const fieldData = schemaData.fields[fieldKey];
          const fieldTypeId = Number(fieldKey) as FieldType; // Convert JSON string key to number

          // Parse the value type from qweb's format
          let valueType = ValueType.String;
          if (fieldData.value_type) {
            if (typeof fieldData.value_type === 'string') {
              valueType = this.parseValueType(fieldData.value_type);
            } else if (typeof fieldData.value_type === 'object') {
              // Handle variant enum format like {Int: null}
              const typeKey = Object.keys(fieldData.value_type)[0];
              valueType = this.parseValueType(typeKey);
            }
          }

          const fieldSchema = schema.field(fieldTypeId, valueType);
          fieldSchema.rank = fieldData.rank || 0;
          fieldSchema.readPermissions = fieldData.read_permissions || [];
          fieldSchema.writePermissions = fieldData.write_permissions || [];
          fieldSchema.choices = fieldData.choices || [];
        });
      }

      return schema;
    },

    // Set/update entity schema
    async setEntitySchema(schema: EntitySchema): Promise<void> {
      // Convert EntitySchema to qweb format
      const fieldsData: Record<string, any> = {};

      Object.keys(schema.fields).forEach(fieldKey => {
        const fieldTypeId = Number(fieldKey) as FieldType;
        const field = schema.fields[fieldTypeId];
        fieldsData[fieldKey] = {
          value_type: field.valueType,
          rank: field.rank,
          read_permissions: field.readPermissions,
          write_permissions: field.writePermissions,
          choices: field.choices,
        };
      });

      await this.apiRequest('set_schema', {
        entity_type: schema.entityType,
        fields: fieldsData,
      });
    },

    // Check if entity exists
    async entityExists(entityId: EntityId): Promise<boolean> {
      try {
        const data = await this.apiRequest('entity_exists', {
          entity_id: entityId,
        });
        // qweb returns {entity_id: string, exists: bool}
        return data.exists === true;
      } catch (error) {
        console.error('Failed to check entity existence:', error);
        return false;
      }
    },

    // Resolve field type ID to name
    async resolveFieldType(fieldTypeId: FieldType): Promise<string> {
      try {
        const data = await this.apiRequest('resolve_field_type', {
          field_type: fieldTypeId.toString(),
        });
        return data.name || fieldTypeId.toString();
      } catch (error) {
        console.error(`Failed to resolve field type ${fieldTypeId}:`, error);
        return fieldTypeId.toString();
      }
    },

    // Register notification via WebSocket
    async registerNotification(config: NotificationConfig): Promise<string> {
      const request = {
        type: 'RegisterNotification',
        config: {
          entity_id: config.entityId,
          entity_type: config.entityType,
          field: config.field,
          trigger_on_change: config.triggerOnChange ?? true,
          context: config.context || [],
        },
      };

      const response = await this.sendWebSocketRequest(request);

      // Create a key based on the config for callback matching
      const key = JSON.stringify({
        entity_id: config.entityId !== undefined ? String(config.entityId) : undefined,
        entity_type: config.entityType !== undefined ? String(config.entityType) : undefined,
        field: String(config.field),
      });

      return key;
    },

    // Unregister notification
    async unregisterNotification(config: NotificationConfig): Promise<void> {
      const request = {
        type: 'UnregisterNotification',
        config: {
          entity_id: config.entityId,
          entity_type: config.entityType,
          field: config.field,
          trigger_on_change: config.triggerOnChange ?? true,
          context: config.context || [],
        },
      };

      await this.sendWebSocketRequest(request);
    },

    // Subscribe to notifications
    async notify(config: NotificationConfig, callback: NotificationCallback): Promise<NotificationSubscription> {
      const token = await this.registerNotification(config);

      if (!this.notificationCallbacks[token]) {
        this.notificationCallbacks[token] = [];
      }
      this.notificationCallbacks[token].push(callback);

      return {
        token,
        unsubscribe: async () => {
          const callbacks = this.notificationCallbacks[token];
          if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index !== -1) {
              callbacks.splice(index, 1);
            }

            if (callbacks.length === 0) {
              delete this.notificationCallbacks[token];
              await this.unregisterNotification(config);
            }
          }
        },
      };
    },

    // Connection management callbacks
    onConnectionLost(callback: () => void) {
      this.connectionLostCallbacks.push(callback);
    },

    removeConnectionLostCallback(callback: () => void) {
      const index = this.connectionLostCallbacks.indexOf(callback);
      if (index !== -1) {
        this.connectionLostCallbacks.splice(index, 1);
      }
    },

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
});
