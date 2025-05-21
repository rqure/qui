<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/data';
import { EntityType, EntitySchema, ValueType, EntityFactories, FieldSchemaOptions } from '@/core/data/types';
import EntityTypeList from './components/EntityTypeList.vue';
import SchemaEditor from './components/SchemaEditor.vue';
import LoadingIndicator from './components/LoadingIndicator.vue';

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const selectedEntityType = ref<EntityType | null>(null);
const currentSchema = ref<EntitySchema | null>(null);
const showCreateNewForm = ref(false);
const newEntityType = ref('');

// Initialize data connection
onMounted(async () => {
  try {
    if (!dataStore.isConnected) {
      await dataStore.initialize();
    }
    
    // Wait for connection to establish
    await waitForConnection();
    loading.value = false;
  } catch (err) {
    console.error('Failed to initialize Schema Editor:', err);
    error.value = 'Failed to connect to the database. Please try again later.';
    loading.value = false;
  }
});

// Utility to wait for connection
function waitForConnection(timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (dataStore.isConnected) {
      resolve();
      return;
    }
    
    const start = Date.now();
    const interval = setInterval(() => {
      if (dataStore.isConnected) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > timeout) {
        clearInterval(interval);
        reject(new Error('Connection timeout'));
      }
    }, 100);
  });
}

async function handleEntityTypeSelect(entityType: EntityType) {
  try {
    showCreateNewForm.value = false;
    loading.value = true;
    selectedEntityType.value = entityType;
    
    // Load the schema for this entity type
    const schema = await dataStore.getEntitySchema(entityType);
    currentSchema.value = schema;
    
    loading.value = false;
  } catch (err) {
    console.error(`Error loading schema for ${entityType}:`, err);
    error.value = `Failed to load schema for ${entityType}`;
    loading.value = false;
  }
}

function startCreateNew() {
  selectedEntityType.value = null;
  currentSchema.value = null;
  showCreateNewForm.value = true;
  newEntityType.value = '';
}

async function createNewEntityType() {
  if (!newEntityType.value.trim()) {
    error.value = 'Entity type name cannot be empty';
    return;
  }
  
  // Check for valid format (no spaces, special characters)
  const validName = /^[a-zA-Z][a-zA-Z0-9_]*$/.test(newEntityType.value);
  if (!validName) {
    error.value = 'Entity type name must start with a letter and contain only letters, numbers, and underscores';
    return;
  }
  
  try {
    loading.value = true;
    error.value = null;
    
    // Create a new empty schema 
    let schema;
    try {
      // Try to get existing schema
      schema = await dataStore.getEntitySchema(newEntityType.value);
      error.value = `Entity type "${newEntityType.value}" already exists`;
      loading.value = false;
      return;
    } catch (e) {
      // If schema doesn't exist, create a new empty one
      schema = EntityFactories.newEntitySchema(newEntityType.value);
      
      // Add a name field by default for all entities
      schema.field('Name', [
        FieldSchemaOptions.withValueType(ValueType.String),
        FieldSchemaOptions.withRank(0)
      ]);
      
      // Add parent and children fields by default for navigation
      schema.field('Parent', [
        FieldSchemaOptions.withValueType(ValueType.EntityReference),
        FieldSchemaOptions.withRank(1)
      ]);
      
      schema.field('Children', [
        FieldSchemaOptions.withValueType(ValueType.EntityList),
        FieldSchemaOptions.withRank(2)
      ]);
    }
    
    // Set the schema
    await dataStore.setEntitySchema(schema);
    
    // Load the newly created schema
    handleEntityTypeSelect(newEntityType.value);
    showCreateNewForm.value = false;
  } catch (err) {
    console.error(`Error creating schema for ${newEntityType.value}:`, err);
    error.value = `Failed to create schema for ${newEntityType.value}`;
    loading.value = false;
  }
}

async function handleSchemaUpdate(schema: EntitySchema) {
  try {
    loading.value = true;
    error.value = null;
    
    // Update the schema
    await dataStore.setEntitySchema(schema);
    
    // Refresh the schema
    currentSchema.value = await dataStore.getEntitySchema(schema.entityType);
    
    loading.value = false;
  } catch (err) {
    console.error(`Error updating schema for ${schema.entityType}:`, err);
    error.value = `Failed to update schema for ${schema.entityType}`;
    loading.value = false;
  }
}
</script>

<template>
  <div class="schema-editor-app">
    <div v-if="loading" class="loading-container">
      <LoadingIndicator />
    </div>
    
    <div v-else-if="error" class="error-container">
      <div class="error-card">
        <div class="error-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        </div>
        <h2 class="error-title">Connection Error</h2>
        <p class="error-message">{{ error }}</p>
        <button class="retry-button" @click="loading = true; dataStore.initialize(); error = null">
          <span class="retry-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
            </svg>
          </span>
          Try Again
        </button>
      </div>
    </div>
    
    <div v-else class="app-container">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">Entity Types</h2>
          <button class="new-entity-button" @click="startCreateNew">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>New</span>
          </button>
        </div>
        
        <EntityTypeList 
          :selected-type="selectedEntityType"
          @select="handleEntityTypeSelect"
        />
      </aside>
      
      <main class="main-content">
        <div v-if="showCreateNewForm" class="create-new-container">
          <div class="panel-header">
            <h2 class="panel-title">Create New Entity Type</h2>
          </div>
          
          <div class="panel-body">
            <div class="form-group">
              <label for="entity-type-name">Entity Type Name</label>
              <input 
                id="entity-type-name" 
                v-model="newEntityType" 
                placeholder="Enter a name (e.g. User, Document, Product)" 
                class="form-control"
              />
              <p class="form-text">Name must start with a letter and can only contain letters, numbers, and underscores</p>
            </div>
            
            <div class="form-error" v-if="error">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16">
                <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h2v2h-2v-2zm0-8h2v6h-2V9z"/>
              </svg>
              <span>{{ error }}</span>
            </div>
            
            <div class="form-actions">
              <button class="btn-secondary" @click="showCreateNewForm = false">Cancel</button>
              <button class="btn-primary" @click="createNewEntityType">Create Entity Type</button>
            </div>
          </div>
        </div>
        
        <SchemaEditor 
          v-else-if="selectedEntityType && currentSchema" 
          :schema="currentSchema"
          @update:schema="handleSchemaUpdate"
        />
        
        <div v-else class="empty-state">
          <div class="empty-state-content">
            <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
              </svg>
            </div>
            <h2 class="empty-title">No Schema Selected</h2>
            <p class="empty-description">Select an entity type from the list or create a new one to begin editing</p>
            <button class="btn-primary" @click="startCreateNew">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
              </svg>
              Create New Entity Type
            </button>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.schema-editor-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--qui-font-family);
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  overflow: hidden;
}

.app-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar styles */
.sidebar {
  width: 280px;
  background: var(--qui-bg-secondary);
  border-right: 1px solid var(--qui-hover-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 5px rgba(0, 0, 0, 0.05);
  z-index: 5;
}

.sidebar-header {
  height: 60px;
  padding: 0 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--qui-titlebar-bg);
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.new-entity-button {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  padding: 0 12px;
  border-radius: 4px;
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  border: none;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.new-entity-button:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-1px);
  box-shadow: var(--qui-shadow-accent);
}

/* Main content area */
.main-content {
  flex: 1;
  background: var(--qui-bg-primary);
  overflow: auto;
  position: relative;
}

/* Loading and error states */
.loading-container, .error-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--qui-bg-primary);
  z-index: 10;
}

.error-card {
  width: 400px;
  padding: 32px;
  background: var(--qui-bg-secondary);
  border-radius: 8px;
  box-shadow: var(--qui-shadow-default);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-icon {
  color: var(--qui-danger-color);
  margin-bottom: 16px;
  animation: pulse 2s infinite;
}

.error-title {
  margin: 0 0 12px 0;
  font-size: 20px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-danger-color);
}

.error-message {
  margin: 0 0 24px 0;
  color: var(--qui-text-secondary);
  line-height: 1.5;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: none;
  border-radius: 4px;
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-accent);
}

.retry-icon {
  display: flex;
  animation: spin 2s linear infinite;
}

/* Create new form */
.create-new-container {
  max-width: 600px;
  margin: 32px auto;
  border-radius: 8px;
  overflow: hidden;
  background: var(--qui-bg-secondary);
  box-shadow: var(--qui-shadow-default);
  border: 1px solid var(--qui-hover-border);
}

.panel-header {
  padding: 16px 24px;
  background: var(--qui-titlebar-bg);
  border-bottom: 1px solid var(--qui-hover-border);
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.panel-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.form-control {
  display: block;
  width: 100%;
  padding: 10px 12px;
  font-size: var(--qui-font-size-base);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.form-text {
  margin-top: 6px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.form-error {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
  padding: 12px;
  border-radius: 4px;
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  font-size: var(--qui-font-size-small);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

/* Button styles */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  height: 38px;
  border: none;
  border-radius: 4px;
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-1px);
  box-shadow: var(--qui-shadow-accent);
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  height: 38px;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  background: var(--qui-overlay-secondary);
}

/* Empty state */
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}

.empty-state-content {
  max-width: 400px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon {
  color: var(--qui-accent-deep);
  opacity: 0.3;
  margin-bottom: 24px;
}

.empty-title {
  margin: 0 0 16px 0;
  font-size: 24px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.empty-description {
  margin: 0 0 32px 0;
  color: var(--qui-text-secondary);
  line-height: 1.5;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}
</style>
