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
      <div class="error-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <span>{{ error }}</span>
      </div>
      <button class="retry-button" @click="loading = true; dataStore.initialize(); error = null">
        <span class="retry-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
        </span>
        Retry Connection
      </button>
    </div>
    
    <div v-else class="app-container">
      <div class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">Entity Types</h2>
          <button class="new-entity-button" @click="startCreateNew">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            New
          </button>
        </div>
        
        <EntityTypeList 
          :selected-type="selectedEntityType"
          @select="handleEntityTypeSelect"
        />
      </div>
      
      <div class="main-content">
        <div v-if="showCreateNewForm" class="create-new-container">
          <h2 class="create-title">Create New Entity Type</h2>
          
          <div class="input-group">
            <label for="entity-type-name">Entity Type Name:</label>
            <input 
              id="entity-type-name" 
              v-model="newEntityType" 
              placeholder="Enter a name (e.g. User, Document, Product)" 
              class="entity-type-input"
            />
            <p class="input-help">Name must start with a letter and can only contain letters, numbers, and underscores</p>
          </div>
          
          <div class="create-actions">
            <button class="cancel-button" @click="showCreateNewForm = false">Cancel</button>
            <button class="create-button" @click="createNewEntityType">Create</button>
          </div>
        </div>
        
        <SchemaEditor 
          v-else-if="selectedEntityType && currentSchema" 
          :schema="currentSchema"
          @update:schema="handleSchemaUpdate"
        />
        
        <div v-else class="no-selection">
          <div class="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
              <path fill="currentColor" d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
            <p>Select an entity type from the list or create a new one to begin</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schema-editor-app {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-secondary);
  color: var(--qui-text-primary);
  border-radius: var(--qui-window-radius);
  overflow: hidden;
  box-shadow: var(--qui-shadow-window);
}

.app-container {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 250px;
  border-right: 1px solid var(--qui-hover-border);
  background: rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-title {
  margin: 0;
  font-size: 16px;
  font-weight: var(--qui-font-weight-medium);
}

.new-entity-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 16px;
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  border: none;
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.new-entity-button:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px var(--qui-accent-glow);
}

.main-content {
  flex: 1;
  overflow: auto;
  background: var(--qui-bg-primary);
  padding: 20px;
}

.loading-container, .error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: var(--qui-text-secondary);
  padding: 20px;
}

.error-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: var(--qui-danger-color);
  margin-bottom: 24px;
  text-align: center;
  max-width: 300px;
}

.error-message svg {
  width: 48px;
  height: 48px;
  opacity: 0.8;
  filter: drop-shadow(0 0 8px rgba(244, 67, 54, 0.3));
}

.retry-button {
  padding: 10px 18px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 20px;
  color: var(--qui-text-primary);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
  display: flex;
  align-items: center;
  gap: 8px;
}

.retry-button:hover {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 255, 136, 0.2);
}

.retry-icon {
  display: flex;
  align-items: center;
  justify-content: center;
}

.no-selection {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  opacity: 0.6;
  text-align: center;
  max-width: 300px;
  color: var(--qui-text-secondary);
}

.empty-state svg {
  opacity: 0.7;
  color: #9c27b0;
}

.create-new-container {
  max-width: 500px;
  margin: 20px auto;
  background: var(--qui-bg-secondary);
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid var(--qui-hover-border);
}

.create-title {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--qui-text-primary);
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  border-bottom: 1px solid var(--qui-hover-border);
  padding-bottom: 12px;
}

.input-group {
  margin-bottom: 20px;
}

.input-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: var(--qui-font-weight-medium);
}

.entity-type-input {
  width: 100%;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
}

.entity-type-input:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
}

.input-help {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  margin-top: 6px;
}

.create-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 30px;
}

.cancel-button, .create-button {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.cancel-button {
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  color: var(--qui-text-primary);
}

.cancel-button:hover {
  background: var(--qui-overlay-secondary);
}

.create-button {
  background: #9c27b0;
  color: white;
  border: none;
}

.create-button:hover {
  background: #7b1fa2;
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(156, 39, 176, 0.3);
}
</style>
