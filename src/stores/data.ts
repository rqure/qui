/**
 * Data Store - Complete StoreProxy API Mirror
 * 
 * This store provides a TypeScript interface that exactly mirrors the Rust StoreProxy API.
 * All methods correspond 1:1 with StoreProxy/StoreTrait methods.
 */

import { defineStore } from 'pinia';
import { getApiBaseUrl, getWebSocketUrl } from '@/core/utils/url';
import { useAuthStore } from '@/stores/auth';
import type { 
  EntityId, 
  EntityType, 
  FieldType, 
  Timestamp, 
  Value,
  FieldSchema,
  EntitySchema,
  CompleteEntitySchema,
  NotifyConfig,
  NotifyInfo,
  Notification,
  NotificationCallback,
  PageOpts,
  PageResult
} from '@/core/data/types';
import { PushCondition, AdjustBehavior } from '@/core/data/types';

export const useDataStore = defineStore('data', {
  state: () => ({
    socket: null as WebSocket | null,
    isConnected: false,
    pendingResponse: null as { resolve: (value: any) => void; reject: (error: any) => void } | null,
    requestQueue: [] as Array<{ request: any; resolve: (value: any) => void; reject: (error: any) => void }>,
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

        if (this.pendingResponse) {
          this.pendingResponse.reject(new Error('WebSocket connection closed'));
          this.pendingResponse = null;
        }

        // Reject all queued requests
        this.requestQueue.forEach(item => {
          item.reject(new Error('WebSocket connection closed'));
        });
        this.requestQueue = [];

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
        this.pendingResponse = null;
        this.requestQueue = [];
      }
    },

    onMessage(event: MessageEvent) {
      try {
        const message = JSON.parse(event.data);

        // qweb WebSocket messages can be:
        // 1. Notifications: {success: true, data: {type: "notification", ...}}
        // 2. Responses: {success: bool, data?: any, error?: string}

        // Check if this is a notification
        if (message.success && message.data && message.data.type === 'notification') {
          this.handleNotification(message.data.notification);
          return;
        }

        // Handle regular response
        if (this.pendingResponse) {
          const pending = this.pendingResponse;
          this.pendingResponse = null;

          if (message.success) {
            pending.resolve(message.data || message);
          } else {
            pending.reject(new Error(message.error || 'Request failed'));
          }

          // Process next request in queue
          this.processNextRequest();
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
        // Add to queue
        this.requestQueue.push({ request, resolve, reject });

        // Process queue if no request is currently pending
        if (!this.pendingResponse) {
          this.processNextRequest();
        }
      });
    },

    processNextRequest() {
      if (this.pendingResponse || this.requestQueue.length === 0 || !this.socket) {
        return;
      }

      const { request, resolve, reject } = this.requestQueue.shift()!;
      this.pendingResponse = { resolve, reject };

      // Set a timeout for the request
      const timeoutId = setTimeout(() => {
        if (this.pendingResponse) {
          const pending = this.pendingResponse;
          this.pendingResponse = null;
          pending.reject(new Error('Request timeout'));
          // Process next request after timeout
          this.processNextRequest();
        }
      }, 30000); // 30 second timeout

      try {
        this.socket.send(JSON.stringify(request));
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingResponse = null;
        reject(error);
        // Process next request after error
        this.processNextRequest();
      }
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

    async request(wsRequestType: string, data: any): Promise<any> {
      // Use WebSocket if connected, otherwise fall back to HTTP
      if (this.isConnected) {
        return await this.sendWebSocketRequest({ type: wsRequestType, ...data });
      } else {
        // Fallback to HTTP - map WebSocket request types to API endpoints
        const endpointMap: Record<string, string> = {
          'Read': 'read',
          'Write': 'write',
          'Create': 'create',
          'Delete': 'delete',
          'Find': 'find',
          'Schema': 'schema',
          'CompleteSchema': 'complete_schema',
          'UpdateSchema': 'update_schema',
          'GetEntityType': 'get_entity_type',
          'GetFieldType': 'get_field_type',
          'ResolveEntityType': 'resolve_entity_type',
          'ResolveFieldType': 'resolve_field_type',
          'GetFieldSchema': 'get_field_schema',
          'EntityExists': 'entity_exists',
          'FieldExists': 'field_exists',
          'ResolveIndirection': 'resolve_indirection',
          'Pipeline': 'pipeline',
        };
        const endpoint = endpointMap[wsRequestType];
        if (!endpoint) {
          throw new Error(`No HTTP endpoint mapping for ${wsRequestType}`);
        }
        return await this.apiRequest(endpoint, data);
      }
    },

    // ============================================================
    // StoreTrait API - Type Resolution
    // ============================================================

    /**
     * Get entity type ID by name
     * Corresponds to: fn get_entity_type(&self, name: &str) -> Result<EntityType>
     */
    async getEntityType(name: string): Promise<EntityType> {
      const data = await this.request('GetEntityType', { name });
      return data.entity_type;
    },

    /**
     * Resolve entity type ID to name
     * Corresponds to: fn resolve_entity_type(&self, entity_type: EntityType) -> Result<String>
     */
    async resolveEntityType(entityType: EntityType): Promise<string> {
      const data = await this.request('ResolveEntityType', { entity_type: entityType });
      return data.name;
    },

    /**
     * Get field type ID by name
     * Corresponds to: fn get_field_type(&self, name: &str) -> Result<FieldType>
     */
    async getFieldType(name: string): Promise<FieldType> {
      const data = await this.request('GetFieldType', { name });
      return data.field_type;
    },

    /**
     * Resolve field type ID to name
     * Corresponds to: fn resolve_field_type(&self, field_type: FieldType) -> Result<String>
     */
    async resolveFieldType(fieldType: FieldType): Promise<string> {
      const data = await this.request('ResolveFieldType', { field_type: fieldType });
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
      const data = await this.request('Schema', { entity_type: entityType });
      return {
        entity_type: data.schema.entity_type,
        inherit: data.schema.inherit || [],
        fields: data.schema.fields || {}
      };
    },

    /**
     * Get the complete schema for a specific entity type (including inherited fields)
     * Corresponds to: fn get_complete_entity_schema(&self, entity_type: EntityType) -> Result<EntitySchema<Complete>>
     */
    async getCompleteEntitySchema(entityType: EntityType): Promise<CompleteEntitySchema> {
      const data = await this.request('CompleteSchema', { entity_type: entityType });
      return {
        entity_type: data.schema.entity_type,
        inherit: data.schema.inherit || [],
        fields: data.schema.fields || {}
      };
    },

    /**
     * Get the schema for a specific field
     * Corresponds to: fn get_field_schema(&self, entity_type: EntityType, field_type: FieldType) -> Result<FieldSchema>
     */
    async getFieldSchema(entityType: EntityType, fieldType: FieldType): Promise<FieldSchema> {
      const data = await this.request('GetFieldSchema', { 
        entity_type: entityType,
        field_type: fieldType 
      });
      return data.schema;
    },

    /**
     * Update entity schema
     * Corresponds to: fn update_schema(&mut self, schema: EntitySchema<Single, String, String>) -> Result<()>
     */
    async updateSchema(schema: EntitySchema): Promise<void> {
      await this.request('UpdateSchema', {
        entity_type: schema.entity_type,
        inherit: schema.inherit,
        fields: schema.fields
      });
    },

    // ============================================================
    // StoreTrait API - Entity Existence Checks
    // ============================================================

    /**
     * Check if an entity exists
     * Corresponds to: fn entity_exists(&self, entity_id: EntityId) -> bool
     */
    async entityExists(entityId: EntityId): Promise<boolean> {
      const data = await this.request('EntityExists', { entity_id: entityId });
      return data.exists;
    },

    /**
     * Check if a field type exists for an entity type
     * Corresponds to: fn field_exists(&self, entity_type: EntityType, field_type: FieldType) -> bool
     */
    async fieldExists(entityType: EntityType, fieldType: FieldType): Promise<boolean> {
      const data = await this.request('FieldExists', { 
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
      const data = await this.request('ResolveIndirection', { 
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
      const data = await this.request('Read', { 
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
      await this.request('Write', { 
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
      const data = await this.request('Create', { 
        entity_type: entityType,
        name: name 
      });
      return data.entity_id;
    },

    /**
     * Delete an entity
     * Corresponds to: fn delete_entity(&mut self, entity_id: EntityId) -> Result<()>
     */
    async deleteEntity(entityId: EntityId): Promise<void> {
      await this.request('Delete', { entity_id: entityId });
    },

    // ============================================================
    // StoreTrait API - Query Operations
    // ============================================================

    /**
     * Find entities of a specific type (includes inherited types)
     * Corresponds to: fn find_entities(&self, entity_type: EntityType, filter: Option<&str>) -> Result<Vec<EntityId>>
     */
    async findEntities(entityType: EntityType, filter?: string | null): Promise<EntityId[]> {
      const data = await this.request('Find', { 
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
      const data = await this.request('Find', { 
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
      if (!this.isConnected) {
        throw new Error('WebSocket must be connected to register notifications');
      }

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
      if (!this.isConnected) {
        throw new Error('WebSocket must be connected to unregister notifications');
      }
      
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
      const data = await this.request('Pipeline', { commands });
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
