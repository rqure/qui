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
    connectionPromise: null as Promise<void> | null,
    connectionResolve: null as (() => void) | null,
    pendingRequests: {} as Record<string, { resolve: (value: any) => void; reject: (error: any) => void; timeoutId: number }>,
    nextRequestId: 1,
    notificationCallbacks: {} as Record<string, NotificationCallback[]>, // Use string keys to avoid precision loss
    localToServerHash: {} as Record<number, string>, // Map local hash to server hash (as string)
    pendingNotificationRegistrations: {} as Record<number, Promise<string>>, // Track in-flight registration requests
    connectionLostCallbacks: [] as (() => void)[],
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelay: 1000,
    connectionTimeout: null as number | null,
    connectionTimeoutMs: 5000,
    // Type resolution caches - cleared on connection loss
    entityTypeNames: {} as Record<string, EntityType>, // name -> EntityType
    entityTypes: {} as Record<number, string>, // EntityType -> name (use number for EntityType)
    fieldTypeNames: {} as Record<string, FieldType>, // name -> FieldType
    fieldTypes: {} as Record<number, string>, // FieldType -> name (use number for FieldType)
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

      // Create a new connection promise if one doesn't exist
      if (!this.connectionPromise) {
        this.connectionPromise = new Promise<void>((resolve) => {
          this.connectionResolve = resolve;
        });
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
          // Reset connection promise for retry
          this.connectionPromise = null;
          this.connectionResolve = null;
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

        // Resolve connection promise
        if (this.connectionResolve) {
          this.connectionResolve();
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

        // Reject all pending requests
        Object.values(this.pendingRequests).forEach(pending => {
          clearTimeout(pending.timeoutId);
          pending.reject(new Error('WebSocket connection closed'));
        });
        this.pendingRequests = {};

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
        
        // Reject all pending requests
        Object.values(this.pendingRequests).forEach(pending => {
          clearTimeout(pending.timeoutId);
          pending.reject(new Error('WebSocket disconnected'));
        });
        this.pendingRequests = {};
      }

      // Reset connection promise
      this.connectionPromise = null;
      this.connectionResolve = null;
    },

    onMessage(event: MessageEvent) {
      try {
        const message = JSON.parse(event.data);

        // qweb WebSocket messages can be:
        // 1. Notifications: {success: true, data: {type: "notification", ...}}
        // 2. Responses: {success: bool, request_id?: string, data?: any, error?: string}

        // Check if this is a notification
        if (message.success && message.data && message.data.type === 'notification') {
          this.handleNotification(message.data.notification);
          return;
        }

        // Handle regular response with request_id
        const requestId = message.request_id;
        if (requestId && this.pendingRequests[requestId]) {
          const pending = this.pendingRequests[requestId];
          clearTimeout(pending.timeoutId);
          delete this.pendingRequests[requestId];

          if (message.success) {
            pending.resolve(message.data || message);
          } else {
            pending.reject(new Error(message.error || 'Request failed'));
          }
        } else if (requestId) {
          console.warn('Received response for unknown request ID:', requestId);
        } else {
          console.warn('Received response without request_id:', message);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    },

    handleNotification(notification: any) {
      const configHash = notification.config_hash;
      const configHashStr = String(configHash);
      
      if (configHash && this.notificationCallbacks[configHashStr]) {
        this.notificationCallbacks[configHashStr].forEach(callback => {
          try {
            callback(notification);
          } catch (error) {
            console.error('Error in notification callback:', error);
          }
        });
      } else {
        console.warn('No callbacks registered for config_hash:', configHash, '(as string:', configHashStr, ')');
        if (import.meta.env.DEV) {
          console.warn('Available hashes:', Object.keys(this.notificationCallbacks));
        }
      }
    },

    async sendWebSocketRequest(request: any): Promise<any> {
      if (!this.isConnected || !this.socket) {
        throw new Error('WebSocket is not connected. Backend may still be initializing.');
      }

      if (this.socket.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket connection is not ready. Please wait and try again.');
      }

      return new Promise((resolve, reject) => {
        // Generate unique request ID
        const requestId = `req_${this.nextRequestId++}`;
        
        // Set timeout for this request
        const timeoutId = window.setTimeout(() => {
          if (this.pendingRequests[requestId]) {
            delete this.pendingRequests[requestId];
            reject(new Error('Request timeout'));
          }
        }, 30000); // 30 second timeout

        // Store pending request
        this.pendingRequests[requestId] = { resolve, reject, timeoutId };

        // Add request_id to the request
        const requestWithId = { ...request, request_id: requestId };

        try {
          this.socket!.send(JSON.stringify(requestWithId));
        } catch (error) {
          clearTimeout(timeoutId);
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
      // Check cache first
      if (this.entityTypeNames[name] !== undefined) {
        return this.entityTypeNames[name];
      }
      
      // Not in cache, make request and cache result
      const data = await this.request('GetEntityType', { name });
      const entityType = data.entity_type;
      
      // Cache both directions
      this.entityTypeNames[name] = entityType;
      this.entityTypes[entityType] = name;
      
      return entityType;
    },

    /**
     * Resolve entity type ID to name
     * Corresponds to: fn resolve_entity_type(&self, entity_type: EntityType) -> Result<String>
     */
    async resolveEntityType(entityType: EntityType): Promise<string> {
      // Check cache first
      if (this.entityTypes[entityType] !== undefined) {
        return this.entityTypes[entityType];
      }
      
      // Not in cache, make request and cache result
      const data = await this.request('ResolveEntityType', { entity_type: entityType });
      const name = data.name;
      
      // Cache both directions
      this.entityTypes[entityType] = name;
      this.entityTypeNames[name] = entityType;
      
      return name;
    },

    /**
     * Get field type ID by name
     * Corresponds to: fn get_field_type(&self, name: &str) -> Result<FieldType>
     */
    async getFieldType(name: string): Promise<FieldType> {
      // Check cache first
      if (this.fieldTypeNames[name] !== undefined) {
        return this.fieldTypeNames[name];
      }
      
      // Not in cache, make request and cache result
      const data = await this.request('GetFieldType', { name });
      const fieldType = data.field_type;
      
      // Cache both directions
      this.fieldTypeNames[name] = fieldType;
      this.fieldTypes[fieldType] = name;
      
      return fieldType;
    },

    /**
     * Resolve field type ID to name
     * Corresponds to: fn resolve_field_type(&self, field_type: FieldType) -> Result<String>
     */
    async resolveFieldType(fieldType: FieldType): Promise<string> {
      // Check cache first
      if (this.fieldTypes[fieldType] !== undefined) {
        return this.fieldTypes[fieldType];
      }
      
      // Not in cache, make request and cache result
      const data = await this.request('ResolveFieldType', { field_type: fieldType });
      const name = data.name;
      
      // Cache both directions
      this.fieldTypes[fieldType] = name;
      this.fieldTypeNames[name] = fieldType;
      
      return name;
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
      if (!data || !data.schema) {
        throw new Error('Invalid schema response from server. Backend may not be fully initialized.');
      }
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
        name: name,
        parent_id: parentId
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
      const results = await this.executePipeline([
        { type: 'GetEntityTypes' }
      ]);

      const entry = Array.isArray(results)
        ? results.find((item: any) => item?.type === 'GetEntityTypes')
        : null;

      if (!entry || !Array.isArray(entry.entity_types)) {
        throw new Error('Failed to retrieve entity types from pipeline response');
      }

      return entry.entity_types as EntityType[];
    },

    /**
     * Resolve a path to an entity ID by traversing down from the root
     * Path format: "RootName/FolderName/EntityName"
     */
    async resolvePath(path: string): Promise<EntityId> {
      if (!path || path.trim() === '') {
        throw new Error('Empty path');
      }

      const pathParts = path.split('/').filter(part => part.trim() !== '');
      
      // Get root entity type
      const rootEntityType = await this.getEntityType('Root');
      const nameField = await this.getFieldType('Name');
      const childrenField = await this.getFieldType('Children');
      
      // Find root entities and match the first path part
      const rootEntities = await this.findEntities(rootEntityType);
      let currentEntityId: EntityId | null = null;
      
      for (const rootId of rootEntities) {
        try {
          const [nameValue] = await this.read(rootId, [nameField]);
          if (nameValue && typeof nameValue === 'object' && 'String' in nameValue) {
            if (nameValue.String === pathParts[0]) {
              currentEntityId = rootId;
              break;
            }
          }
        } catch (error) {
          // Skip entities that can't be read
          console.warn(`Failed to read root entity ${rootId}:`, error);
        }
      }
      
      if (!currentEntityId) {
        throw new Error(`Root entity "${pathParts[0]}" not found`);
      }
      
      // Traverse down the path by following Children relationships
      for (let i = 1; i < pathParts.length; i++) {
        const part = pathParts[i];
        let found = false;
        
        try {
          const [childrenValue] = await this.read(currentEntityId, [childrenField]);
          if (childrenValue && typeof childrenValue === 'object' && 'EntityList' in childrenValue) {
            const children = childrenValue.EntityList;
            
            for (const childId of children) {
              try {
                const [childNameValue] = await this.read(childId, [nameField]);
                if (childNameValue && typeof childNameValue === 'object' && 'String' in childNameValue) {
                  if (childNameValue.String === part) {
                    currentEntityId = childId;
                    found = true;
                    break;
                  }
                }
              } catch (error) {
                // Skip children that can't be read
                console.warn(`Failed to read child entity ${childId}:`, error);
              }
            }
          }
        } catch (error) {
          throw new Error(`Failed to read children of entity ${currentEntityId}: ${error}`);
        }
        
        if (!found) {
          throw new Error(`Entity "${part}" not found in path "${pathParts.slice(0, i + 1).join('/')}"`);
        }
      }
      
      return currentEntityId;
    },

    // ============================================================
    // Notification API (StoreProxy specific)
    // ============================================================

    /**
     * Register for notifications
     * Corresponds to: StoreProxy::register_notification
     * 
     * Handles multiple callbacks per config by only registering once with the server,
     * but maintaining multiple local callbacks.
     */
    async registerNotification(config: NotifyConfig, callback: NotificationCallback): Promise<void> {
      if (!this.isConnected) {
        throw new Error('WebSocket must be connected to register notifications');
      }

      // Calculate local config hash (simple JSON-based hash for local tracking)
      const localConfigHash = this.hashNotifyConfig(config);
      
      // Check if we already have a server hash for this config
      let serverConfigHash = this.localToServerHash[localConfigHash];
      
      // If we don't have a server hash yet, register with server
      if (serverConfigHash === undefined) {
        // Check if there's already a pending registration for this config
        let registrationPromise = this.pendingNotificationRegistrations[localConfigHash];
        
        if (!registrationPromise) {
          // Create a new registration request
          registrationPromise = (async () => {
            try {
              const response = await this.sendWebSocketRequest({
                type: 'RegisterNotification',
                config: config
              });
              
              // Use the config_hash returned by the server (Rust's hash)
              // Convert to string to avoid JavaScript number precision issues
              const hash = String(response.config_hash);
              
              if (import.meta.env.DEV) {
                console.log('Registered notification with config_hash:', response.config_hash, 'type:', typeof response.config_hash);
                console.log('Stored as string:', hash);
              }
              
              // Store the mapping from local to server hash
              this.localToServerHash[localConfigHash] = hash;
              
              return hash;
            } catch (err) {
              // Clean up pending registration on error
              delete this.pendingNotificationRegistrations[localConfigHash];
              throw err;
            } finally {
              // Clean up pending registration on success
              delete this.pendingNotificationRegistrations[localConfigHash];
            }
          })();
          
          // Store the pending registration promise
          this.pendingNotificationRegistrations[localConfigHash] = registrationPromise;
        }
        
        // Wait for the registration to complete (whether we created it or found it pending)
        try {
          serverConfigHash = await registrationPromise;
        } catch (err) {
          throw err;
        }
      }
      
      // Add callback to local registry using the server's hash
      if (!this.notificationCallbacks[serverConfigHash]) {
        this.notificationCallbacks[serverConfigHash] = [];
      }
      this.notificationCallbacks[serverConfigHash].push(callback);
    },

    /**
     * Unregister a specific callback from notifications
     * Corresponds to: StoreProxy::unregister_notification
     * 
     * Only unregisters from server when the last callback for a config is removed.
     */
    async unregisterNotification(config: NotifyConfig, callback: NotificationCallback): Promise<void> {
      const localConfigHash = this.hashNotifyConfig(config);
      const serverConfigHash = this.localToServerHash[localConfigHash];
      
      if (!this.isConnected) {
        // If not connected, just remove the callback locally
        if (serverConfigHash !== undefined && this.notificationCallbacks[serverConfigHash]) {
          const index = this.notificationCallbacks[serverConfigHash].indexOf(callback);
          if (index > -1) {
            this.notificationCallbacks[serverConfigHash].splice(index, 1);
          }
          if (this.notificationCallbacks[serverConfigHash].length === 0) {
            delete this.notificationCallbacks[serverConfigHash];
            delete this.localToServerHash[localConfigHash];
          }
        }
        return;
      }
      
      // Remove callback from local registry using server hash
      if (serverConfigHash !== undefined && this.notificationCallbacks[serverConfigHash]) {
        const index = this.notificationCallbacks[serverConfigHash].indexOf(callback);
        if (index > -1) {
          this.notificationCallbacks[serverConfigHash].splice(index, 1);
        }
        
        // If this was the last callback, unregister from server
        if (this.notificationCallbacks[serverConfigHash].length === 0) {
          delete this.notificationCallbacks[serverConfigHash];
          delete this.localToServerHash[localConfigHash];
          
          try {
            await this.sendWebSocketRequest({
              type: 'UnregisterNotification',
              config: config
            });
          } catch (err) {
            console.warn('Failed to unregister notification from server:', err);
            // Don't throw - we've already removed the callback locally
          }
        }
      }
    },

    /**
     * Simple hash function for NotifyConfig to identify unique configurations
     */
    hashNotifyConfig(config: NotifyConfig): number {
      const str = JSON.stringify(config);
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash;
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
      
      // Clear type resolution caches on connection loss
      this.entityTypeNames = {};
      this.entityTypes = {};
      this.fieldTypeNames = {};
      this.fieldTypes = {};
      
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
