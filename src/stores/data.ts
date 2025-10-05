import { defineStore } from 'pinia';
import { getApiBaseUrl, getWebSocketUrl } from '@/core/utils/url';
import { useAuthStore } from '@/stores/auth';
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
  entityId?: string;
  entityType?: string;
  field: string;
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
      if (this.socket) {
        console.log('WebSocket already connected');
        return;
      }

      const wsUrl = getWebSocketUrl();
      console.log('Connecting to WebSocket:', wsUrl);
      
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };

      this.socket.onclose = (event) => {
        const wasConnected = this.isConnected;
        console.log('WebSocket closed:', event.code, event.reason);
        this.isConnected = false;
        this.socket = null;

        Object.keys(this.pendingRequests).forEach(id => {
          this.pendingRequests[id].reject(new Error('WebSocket connection closed'));
          delete this.pendingRequests[id];
        });

        if (wasConnected) {
          this.triggerConnectionLostCallbacks();
        }

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          const delay = Math.min(30000, this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts));
          this.reconnectAttempts++;
          
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
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
        
        if (message.type === 'notification') {
          this.handleNotification(message);
          return;
        }
        
        if (message.success !== undefined) {
          console.log('Received response:', message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    },

    handleNotification(notification: any) {
      console.log('Received notification:', notification);
      const callbacks = this.notificationCallbacks[notification.token] || [];
      callbacks.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error('Error in notification callback:', error);
        }
      });
    },

    async sendWebSocketRequest(request: any): Promise<any> {
      if (!this.isConnected || !this.socket) {
        throw new Error('WebSocket is not connected');
      }

      return new Promise((resolve, reject) => {
        try {
          this.socket!.send(JSON.stringify(request));
          resolve({ success: true });
        } catch (error) {
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
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
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
    parseFieldValue(fieldData: any): Value {
      const valueType = this.parseValueType(fieldData.value_type || 'String');
      let rawValue = fieldData.value;

      // Parse timestamp strings to Date objects
      if (valueType === ValueType.Timestamp && typeof rawValue === 'string') {
        rawValue = new Date(rawValue);
      }

      return new Value(valueType, rawValue);
    },

    // Convert Value object to qweb JSON format
    serializeValue(value: Value): any {
      if (value.type === ValueType.Timestamp) {
        return (value.raw as Date).toISOString();
      }
      return value.raw;
    },

    // Create entity
    async createEntity(entityType: string, name: string): Promise<string> {
      const data = await this.apiRequest('create', {
        entity_type: entityType,
        name: name,
      });
      return data.entity_id;
    },

    // Delete entity
    async deleteEntity(entityId: string): Promise<void> {
      await this.apiRequest('delete', {
        entity_id: entityId,
      });
    },

    // Read fields from entities
    async read(fields: Field[]): Promise<void> {
      // Group fields by entity ID for batch reading
      const byEntity: Record<string, Field[]> = {};
      fields.forEach(field => {
        if (!byEntity[field.entityId]) {
          byEntity[field.entityId] = [];
        }
        byEntity[field.entityId].push(field);
      });

      // Read all entities in parallel
      await Promise.all(Object.keys(byEntity).map(async (entityId) => {
        const entityFields = byEntity[entityId];
        const fieldNames = entityFields.map(f => f.fieldType);

        try {
          const data = await this.apiRequest('read', {
            entity_id: entityId,
            fields: fieldNames,
          });

          // Update field values from response
          entityFields.forEach(field => {
            const fieldData = data.fields[field.fieldType];
            if (fieldData) {
              field.value = this.parseFieldValue(fieldData);
              
              if (fieldData.write_time) {
                field.writeTime = new Date(fieldData.write_time);
              }
              if (fieldData.writer_id) {
                field.writerId = fieldData.writer_id;
              }
            }
          });
        } catch (error) {
          console.error(`Failed to read fields for entity ${entityId}:`, error);
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
      if (data.entity_ids && Array.isArray(data.entity_ids)) {
        data.entity_ids.forEach((id: string) => {
          const entity = EntityFactories.newEntity(id);
          entity.entityType = entityType;
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

    // Get entity schema
    async getEntitySchema(entityType: string): Promise<EntitySchema> {
      const data = await this.apiRequest('schema', {
        entity_type: entityType,
      });

      const schema = new EntitySchema(entityType);
      
      // Parse fields from schema
      if (data.fields) {
        Object.keys(data.fields).forEach(fieldName => {
          const fieldData = data.fields[fieldName];
          const valueType = this.parseValueType(fieldData.value_type);
          
          const fieldSchema = schema.field(fieldName, valueType);
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
      
      Object.keys(schema.fields).forEach(fieldName => {
        const field = schema.fields[fieldName];
        fieldsData[fieldName] = {
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
    async entityExists(entityId: string): Promise<boolean> {
      try {
        const data = await this.apiRequest('entity_exists', {
          entity_id: entityId,
        });
        return data.exists;
      } catch (error) {
        console.error('Failed to check entity existence:', error);
        return false;
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
      return response.token || '';
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
