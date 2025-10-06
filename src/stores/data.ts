/**
 * Data Store - Complete StoreProxy API Mirror
 * 
 * This store provides a TypeScript interface that exactly mirrors the Rust StoreProxy API.
 * All methods correspond 1:1 with StoreProxy/StoreTrait methods.
 */

import { defineStore } from 'pinia';
import { getApiBaseUrl, getWebSocketUrl } from '@/core/utils/url';
import { useAuthStore } from '@/stores/auth';
import type { EntityId, EntityType, FieldType, Timestamp, Value } from '@/core/data/types';

/**
 * Notification configuration matching qlib_rs::NotifyConfig
 */
export interface NotifyConfig {
  EntityId?: {
    entity_id: EntityId;
    field_type: FieldType;
    trigger_on_change: boolean;
    context: FieldType[][];
  };
  EntityType?: {
    entity_type: EntityType;
    field_type: FieldType;
    trigger_on_change: boolean;
    context: FieldType[][];
  };
}

/**
 * Notification info matching qlib_rs::NotifyInfo
 */
export interface NotifyInfo {
  entity_id: EntityId;
  field_path: FieldType[];
  value: Value | null;
  timestamp: Timestamp | null;
  writer_id: EntityId | null;
}

/**
 * Notification matching qlib_rs::Notification
 */
export interface Notification {
  current: NotifyInfo;
  previous: NotifyInfo;
  context: Record<string, NotifyInfo>;
  config_hash: number;
}

export interface NotificationCallback {
  (notification: Notification): void;
}

/**
 * Page options for pagination
 */
export interface PageOpts {
  limit: number;
  cursor: number | null;
}

/**
 * Page result for paginated queries
 */
export interface PageResult<T> {
  items: T[];
  total: number;
  next_cursor: number | null;
}

/**
 * Field schema matching qlib_rs::FieldSchema
 */
export interface FieldSchema {
  field_type: FieldType;
  rank: number;
  default_value: Value;
  storage_scope: 'Runtime' | 'Configuration';
}

/**
 * Entity schema matching qlib_rs::EntitySchema<Single>
 */
export interface EntitySchema {
  entity_type: EntityType;
  inherit: EntityType[];
  fields: Record<FieldType, FieldSchema>;
}

/**
 * Complete entity schema matching qlib_rs::EntitySchema<Complete>
 */
export interface CompleteEntitySchema {
  entity_type: EntityType;
  inherit: EntityType[];
  fields: Record<FieldType, FieldSchema>;
}

/**
 * Push condition for writes
 */
export enum PushCondition {
  Always = 'Always',
  Changes = 'Changes'
}

/**
 * Adjust behavior for numeric writes
 */
export enum AdjustBehavior {
  Set = 'Set',
  Add = 'Add',
  Subtract = 'Subtract'
}

export const useDataStore = defineStore('data', {
  state: () => ({
    socket: null as WebSocket | null,
    isConnected: false,
    pendingRequests: {} as Record<string, { resolve: (value: any) => void; reject: (error: any) => void }>,
    notificationCallbacks: {} as Record<number, NotificationCallback[]>,
    connectionLostCallbacks: [] as (() => void)[],
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    connectionTimeout: null as number | null,
    connectionTimeoutMs: 5000,
  }),

  actions: {
    // ============================================================
    // Connection Management (Internal)
    // ============================================================
    
    initialize() {
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
        this.isConnected = false;
        if (this.connectionTimeout !== null) {
          clearTimeout(this.connectionTimeout);
          this.connectionTimeout = null;
        }

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
      const configHash = notification.config_hash;
      if (configHash && this.notificationCallbacks[configHash]) {
        this.notificationCallbacks[configHash].forEach(callback => {
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

    // ============================================================
    // StoreTrait API - Type Resolution
    // ============================================================

    /**
     * Get entity type ID by name
     * Corresponds to: fn get_entity_type(&self, name: &str) -> Result<EntityType>
     */
    async getEntityType(name: string): Promise<EntityType> {
      const data = await this.apiRequest('schema', { entity_type: name });
      return data.entity_type;
    },

    /**
     * Resolve entity type ID to name
     * Corresponds to: fn resolve_entity_type(&self, entity_type: EntityType) -> Result<String>
     */
    async resolveEntityType(entityType: EntityType): Promise<string> {
      const data = await this.apiRequest('resolve_entity_type', { entity_type: entityType });
      return data.name;
    },

    /**
     * Get field type ID by name
     * Corresponds to: fn get_field_type(&self, name: &str) -> Result<FieldType>
     */
    async getFieldType(name: string): Promise<FieldType> {
      const data = await this.apiRequest('get_field_type', { name });
      return data.field_type;
    },

    /**
     * Resolve field type ID to name
     * Corresponds to: fn resolve_field_type(&self, field_type: FieldType) -> Result<String>
     */
    async resolveFieldType(fieldType: FieldType): Promise<string> {
      const data = await this.apiRequest('resolve_field_type', { field_type: fieldType });
      return data.name;
    },

    // ============================================================
    // StoreTrait API - Schema Operations
    // ============================================================

    /**
     * Get the schema for a specific entity type
     * Corresponds to: fn get_entity_schema(&self, entity_type: EntityType) -> Result<EntitySchema<Single>>
     */
    async getEntitySchema(entityType: EntityType): Promise<EntitySchema> {
      const data = await this.apiRequest('schema', { entity_type: entityType });
      return {
        entity_type: data.entity_type,
        inherit: data.inherit || [],
        fields: data.fields || {}
      };
    },

    /**
     * Get the complete schema for a specific entity type (including inherited fields)
     * Corresponds to: fn get_complete_entity_schema(&self, entity_type: EntityType) -> Result<EntitySchema<Complete>>
     */
    async getCompleteEntitySchema(entityType: EntityType): Promise<CompleteEntitySchema> {
      const data = await this.apiRequest('complete_schema', { entity_type: entityType });
      return {
        entity_type: data.entity_type,
        inherit: data.inherit || [],
        fields: data.fields || {}
      };
    },

    /**
     * Get the schema for a specific field
     * Corresponds to: fn get_field_schema(&self, entity_type: EntityType, field_type: FieldType) -> Result<FieldSchema>
     */
    async getFieldSchema(entityType: EntityType, fieldType: FieldType): Promise<FieldSchema> {
      const data = await this.apiRequest('get_field_schema', { 
        entity_type: entityType,
        field_type: fieldType 
      });
      return data;
    },

    /**
     * Update entity schema
     * Corresponds to: fn update_schema(&mut self, schema: EntitySchema<Single, String, String>) -> Result<()>
     */
    async updateSchema(schema: EntitySchema): Promise<void> {
      await this.apiRequest('update_schema', schema);
    },

    // ============================================================
    // StoreTrait API - Entity Existence Checks
    // ============================================================

    /**
     * Check if an entity exists
     * Corresponds to: fn entity_exists(&self, entity_id: EntityId) -> bool
     */
    async entityExists(entityId: EntityId): Promise<boolean> {
      const data = await this.apiRequest('entity_exists', { entity_id: entityId });
      return data.exists;
    },

    /**
     * Check if a field type exists for an entity type
     * Corresponds to: fn field_exists(&self, entity_type: EntityType, field_type: FieldType) -> bool
     */
    async fieldExists(entityType: EntityType, fieldType: FieldType): Promise<boolean> {
      const data = await this.apiRequest('field_exists', { 
        entity_type: entityType,
        field_type: fieldType 
      });
      return data.exists;
    },

    // ============================================================
    // StoreTrait API - Data Operations
    // ============================================================

    /**
     * Resolve indirection for field lookups
     * Corresponds to: fn resolve_indirection(&self, entity_id: EntityId, fields: &[FieldType]) -> Result<(EntityId, FieldType)>
     */
    async resolveIndirection(entityId: EntityId, fields: FieldType[]): Promise<[EntityId, FieldType]> {
      const data = await this.apiRequest('resolve_indirection', { 
        entity_id: entityId,
        fields: fields 
      });
      return [data.entity_id, data.field_type];
    },

    /**
     * Read a field value with indirection support
     * Corresponds to: fn read(&self, entity_id: EntityId, field_path: &[FieldType]) -> Result<(Value, Timestamp, Option<EntityId>)>
     */
    async read(entityId: EntityId, fieldPath: FieldType[]): Promise<[Value, Timestamp, EntityId | null]> {
      const data = await this.apiRequest('read', { 
        entity_id: entityId,
        fields: fieldPath 
      });
      return [data.value, data.timestamp, data.writer_id];
    },

    /**
     * Write a field value with indirection support
     * Corresponds to: fn write(&mut self, entity_id: EntityId, field_path: &[FieldType], value: Value, 
     *                         writer_id: Option<EntityId>, write_time: Option<Timestamp>, 
     *                         push_condition: Option<PushCondition>, adjust_behavior: Option<AdjustBehavior>) -> Result<()>
     */
    async write(
      entityId: EntityId, 
      fieldPath: FieldType[], 
      value: Value,
      writerId?: EntityId | null,
      writeTime?: Timestamp | null,
      pushCondition?: PushCondition | null,
      adjustBehavior?: AdjustBehavior | null
    ): Promise<void> {
      await this.apiRequest('write', { 
        entity_id: entityId,
        field: fieldPath[0], // qweb only supports single field writes currently
        value: value,
        writer_id: writerId,
        write_time: writeTime,
        push_condition: pushCondition,
        adjust_behavior: adjustBehavior
      });
    },

    /**
     * Create a new entity
     * Corresponds to: fn create_entity(&mut self, entity_type: EntityType, parent_id: Option<EntityId>, name: &str) -> Result<EntityId>
     */
    async createEntity(entityType: EntityType, parentId: EntityId | null, name: string): Promise<EntityId> {
      const data = await this.apiRequest('create', { 
        entity_type: entityType,
        parent_id: parentId,
        name: name 
      });
      return data.entity_id;
    },

    /**
     * Delete an entity
     * Corresponds to: fn delete_entity(&mut self, entity_id: EntityId) -> Result<()>
     */
    async deleteEntity(entityId: EntityId): Promise<void> {
      await this.apiRequest('delete', { entity_id: entityId });
    },

    // ============================================================
    // StoreTrait API - Query Operations
    // ============================================================

    /**
     * Find entities of a specific type (includes inherited types)
     * Corresponds to: fn find_entities(&self, entity_type: EntityType, filter: Option<&str>) -> Result<Vec<EntityId>>
     */
    async findEntities(entityType: EntityType, filter?: string | null): Promise<EntityId[]> {
      const data = await this.apiRequest('find', { 
        entity_type: entityType,
        filter: filter || null
      });
      return data.entities || [];
    },

    /**
     * Find entities of a specific type with pagination (includes inherited types)
     * Corresponds to: fn find_entities_paginated(&self, entity_type: EntityType, page_opts: Option<&PageOpts>, filter: Option<&str>) -> Result<PageResult<EntityId>>
     */
    async findEntitiesPaginated(
      entityType: EntityType, 
      pageOpts: PageOpts | null, 
      filter?: string | null
    ): Promise<PageResult<EntityId>> {
      const data = await this.apiRequest('find', { 
        entity_type: entityType,
        filter: filter || null,
        page_opts: pageOpts
      });
      return {
        items: data.items || data.entities || [],
        total: data.total || 0,
        next_cursor: data.next_cursor || null
      };
    },

    /**
     * Find entities of exactly the specified type (no inheritance) with pagination
     * Corresponds to: fn find_entities_exact(&self, entity_type: EntityType, page_opts: Option<&PageOpts>, filter: Option<&str>) -> Result<PageResult<EntityId>>
     */
    async findEntitiesExact(
      entityType: EntityType, 
      pageOpts: PageOpts | null, 
      filter?: string | null
    ): Promise<PageResult<EntityId>> {
      // qweb doesn't expose find_entities_exact separately - would need backend support
      return this.findEntitiesPaginated(entityType, pageOpts, filter);
    },

    /**
     * Get all entity types
     * Corresponds to: fn get_entity_types(&self) -> Result<Vec<EntityType>>
     */
    async getEntityTypes(): Promise<EntityType[]> {
      // qweb doesn't have this endpoint - would need backend support
      throw new Error('getEntityTypes not implemented in qweb backend');
    },

    /**
     * Get all entity types with pagination
     * Corresponds to: fn get_entity_types_paginated(&self, page_opts: Option<&PageOpts>) -> Result<PageResult<EntityType>>
     */
    async getEntityTypesPaginated(pageOpts: PageOpts | null): Promise<PageResult<EntityType>> {
      // qweb doesn't have this endpoint - would need backend support
      throw new Error('getEntityTypesPaginated not implemented in qweb backend');
    },

    // ============================================================
    // Notification API (StoreProxy specific)
    // ============================================================

    /**
     * Register for notifications
     * Corresponds to: StoreProxy::register_notification
     */
    async registerNotification(config: NotifyConfig, callback: NotificationCallback): Promise<void> {
      const response = await this.sendWebSocketRequest({
        type: 'RegisterNotification',
        config: config
      });

      const configHash = response.config_hash;
      if (!this.notificationCallbacks[configHash]) {
        this.notificationCallbacks[configHash] = [];
      }
      this.notificationCallbacks[configHash].push(callback);
    },

    /**
     * Unregister from notifications
     * Corresponds to: StoreProxy::unregister_notification
     */
    async unregisterNotification(config: NotifyConfig): Promise<void> {
      await this.sendWebSocketRequest({
        type: 'UnregisterNotification',
        config: config
      });
    },

    // ============================================================
    // Pipeline API (StoreProxy specific)
    // ============================================================

    /**
     * Execute a pipeline of commands
     * Corresponds to: StoreProxy::pipeline().execute()
     */
    async executePipeline(commands: any[]): Promise<any[]> {
      const data = await this.apiRequest('pipeline', { commands });
      return data.results || [];
    },

    // ============================================================
    // Connection Lost Callbacks
    // ============================================================

    /**
     * Register a callback to be called when the connection is lost
     */
    onConnectionLost(callback: () => void) {
      this.connectionLostCallbacks.push(callback);
    },

    /**
     * Remove a previously registered connection lost callback
     */
    removeConnectionLostCallback(callback: () => void) {
      const index = this.connectionLostCallbacks.indexOf(callback);
      if (index !== -1) {
        this.connectionLostCallbacks.splice(index, 1);
      }
    },

    /**
     * Trigger all registered connection lost callbacks
     */
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
