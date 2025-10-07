<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntitySchema, FieldSchema } from '@/stores/data';
import type { EntityType, Value, FieldType } from '@/core/data/types';
import { ValueHelpers } from '@/core/data/types';
import EntityTypeList from './components/EntityTypeList.vue';
import SchemaEditor from './components/SchemaEditor.vue';
import LoadingIndicator from '../../components/common/LoadingIndicator.vue';

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const selectedEntityType = ref<EntityType | null>(null);
const currentSchema = ref<EntitySchema | null>(null);
const showCreateNewForm = ref(false);
const newEntityType = ref('');

// Add new state for tracking schema loading
const loadingSchema = ref(false);

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
    
    // Don't set the main loading state, just use a local loading state
    loadingSchema.value = true;
    
    // Clear current schema first to force component re-render
    currentSchema.value = null;
    
    // Update the selected type immediately for UI feedback
    selectedEntityType.value = entityType;
    
    // Load the schema for this entity type
    const schema = await dataStore.getEntitySchema(entityType);
    
    // Set the schema with a slight delay to ensure clean re-render
    setTimeout(() => {
      // Only update the schema once it's fully loaded
      currentSchema.value = schema;
      
      // Loading complete
      loadingSchema.value = false;
    }, 50);
  } catch (err) {
    console.error(`Error loading schema for entity type ${entityType}:`, err);
    error.value = `Failed to load schema for entity type ${entityType}`;
    loadingSchema.value = false;
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
    
    // Get the entity type ID for the new type name
    const entityTypeId = await dataStore.getEntityType(newEntityType.value);
    
    // Check if schema already exists
    try {
      await dataStore.getEntitySchema(entityTypeId);
      error.value = `Entity type "${newEntityType.value}" already exists`;
      loading.value = false;
      return;
    } catch (e) {
      // Schema doesn't exist, create a new empty one
      const nameFieldType = await dataStore.getFieldType('Name');
      const parentFieldType = await dataStore.getFieldType('Parent');
      const childrenFieldType = await dataStore.getFieldType('Children');
      
      const schema: EntitySchema = {
        entity_type: entityTypeId,
        inherit: [],
        fields: {
          [nameFieldType]: {
            field_type: nameFieldType,
            rank: 0,
            default_value: ValueHelpers.string(''),
            storage_scope: 'Runtime'
          },
          [parentFieldType]: {
            field_type: parentFieldType,
            rank: 1,
            default_value: ValueHelpers.entityRef(null),
            storage_scope: 'Runtime'
          },
          [childrenFieldType]: {
            field_type: childrenFieldType,
            rank: 2,
            default_value: ValueHelpers.entityList([]),
            storage_scope: 'Runtime'
          }
        }
      };
      
      // Set the schema
      await dataStore.updateSchema(schema);
      
      // Load the newly created schema
      handleEntityTypeSelect(entityTypeId);
      showCreateNewForm.value = false;
    }
  } catch (err) {
    console.error(`Error creating schema for ${newEntityType.value}:`, err);
    error.value = `Failed to create schema for ${newEntityType.value}`;
    loading.value = false;
  }
}

async function handleSchemaUpdate(schema: EntitySchema) {
  try {
    loadingSchema.value = true;
    error.value = null;
    
    // Update the schema
    await dataStore.updateSchema(schema);
    
    // Refresh the schema - first null it to force re-render
    currentSchema.value = null;
    
    // Then set the new value
    setTimeout(async () => {
      currentSchema.value = await dataStore.getEntitySchema(schema.entity_type);
      loadingSchema.value = false;
    }, 50);
  } catch (err) {
    console.error(`Error updating schema for entity type ${schema.entity_type}:`, err);
    error.value = `Failed to update schema for entity type ${schema.entity_type}`;
    loadingSchema.value = false;
  }
}
</script>

<template>
  <div class="schema-editor-app">
    <div v-if="loading" class="app-container">
      <div class="loading-container">
        <LoadingIndicator />
      </div>
    </div>
    
    <div v-else-if="error" class="app-container">
      <aside class="sidebar">
        <div class="sidebar-header">
          <h2 class="sidebar-title">Entity Types</h2>
          <button class="new-entity-button" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
            </svg>
            <span>New</span>
          </button>
        </div>
        
        <div class="empty-sidebar-message">
          <p>Connection error</p>
        </div>
      </aside>
      
      <main class="main-content">
        <div class="error-content">
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
      </main>
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
        
        <div v-else-if="selectedEntityType && currentSchema" class="schema-content-container">
          <div v-if="loadingSchema" class="schema-loading-overlay">
            <LoadingIndicator />
          </div>
          
          <!-- Use :key to ensure complete re-render when schema changes -->
          <SchemaEditor 
            :key="selectedEntityType" 
            :schema="currentSchema"
            @update:schema="handleSchemaUpdate"
          />
        </div>
        
        <div v-else class="empty-state">
          <div class="empty-state-content">
            <div class="empty-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
              </svg>
            </div>
            <h2 class="empty-title">No Schema Selected</h2>
            <p class="empty-description">Select an entity type from the list or create a new one to begin editing</p>
            <button class="btn-primary empty-state-btn" @click="startCreateNew">
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
  width: 300px;
  min-width: 240px;
  background: var(--qui-bg-secondary);
  border-right: 1px solid var(--qui-hover-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  box-shadow: 2px 0 10px rgba(0, 0, 0, 0.05);
  z-index: 5;
  position: relative;
  box-sizing: border-box;
}

.sidebar-header {
  height: 64px;
  padding: 0 20px;
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
  height: 30px; /* Smaller height */
  padding: 0 10px; /* Less padding */
  border-radius: 4px; /* More consistent border-radius */
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  border: none;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.new-entity-button:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-accent), 0 4px 8px rgba(0, 0, 0, 0.15);
}

.new-entity-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* Main content area */
.main-content {
  flex: 1;
  background: var(--qui-bg-primary);
  overflow: hidden;
  position: relative;
  display: flex;
  flex-direction: column;
}

/* Loading and error states */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--qui-bg-secondary);
}

.error-content {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  background: var(--qui-bg-primary);
  padding: 20px;
}

.empty-sidebar-message {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-text-secondary);
  font-style: italic;
  padding: 20px;
  background: var(--qui-overlay-primary);
  border-radius: 8px;
  margin: 20px;
  text-align: center;
}

/* Create new form */
.create-new-container {
  max-width: 600px;
  margin: 32px auto;
  border-radius: 12px;
  overflow: hidden;
  background: var(--qui-bg-secondary);
  box-shadow: var(--qui-shadow-default), 0 5px 15px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--qui-hover-border);
  animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.panel-header {
  padding: 20px 24px;
  background: var(--qui-titlebar-bg);
  border-bottom: 1px solid var(--qui-hover-border);
  position: relative;
}

.panel-header::after {
  content: '';
  position: absolute;
  left: 0;
  bottom: -1px;
  width: 50px;
  height: 2px;
  background: var(--qui-accent-color);
  box-shadow: var(--qui-shadow-accent);
}

.panel-title {
  margin: 0;
  font-size: 18px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.panel-body {
  padding: 24px 24px 32px;
}

.form-group {
  margin-bottom: 24px;
}

.form-group label {
  display: block;
  margin-bottom: 12px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.form-control {
  display: block;
  width: 100%;
  padding: 8px 12px; /* Smaller padding */
  font-size: var(--qui-font-size-base);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px; /* Consistent border-radius */
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  box-sizing: border-box;
  height: 32px; /* Consistent height */
}

.form-control:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 3px var(--qui-overlay-accent), inset 0 1px 2px rgba(0, 0, 0, 0.05);
}

.form-text {
  margin-top: 10px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  line-height: 1.5;
}

.form-error {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 24px;
  padding: 14px 16px;
  border-radius: 8px;
  background: var(--qui-danger-bg);
  color: var(--qui-danger-color);
  font-size: var(--qui-font-size-small);
  animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
  line-height: 1.5;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
  margin-top: 32px;
}

/* Button styles */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 16px; /* Smaller padding */
  height: 32px; /* Smaller consistent height */
  border: none;
  border-radius: 4px; /* Consistent border radius */
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background: var(--qui-accent-secondary);
  transform: translateY(-2px);
  box-shadow: var(--qui-shadow-accent), 0 5px 15px rgba(0, 0, 0, 0.1);
}

.btn-primary:active {
  transform: translateY(0);
  box-shadow: 0 2px 3px rgba(0, 0, 0, 0.1);
}

.btn-secondary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 0 16px; /* Smaller padding */
  height: 32px; /* Smaller consistent height */
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px; /* Consistent border radius */
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-secondary:hover {
  background: var(--qui-overlay-secondary);
  transform: translateY(-1px);
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.05);
}

.btn-secondary:active {
  transform: translateY(0);
  box-shadow: none;
}

.retry-button {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  padding: 6px 14px;
  border-radius: 4px; /* Consistent border radius */
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

/* Empty state */
.empty-state {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: linear-gradient(to bottom, transparent, var(--qui-overlay-primary) 90%);
}

.empty-state-content {
  max-width: 450px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px;
  background: var(--qui-bg-secondary);
  border-radius: 16px;
  box-shadow: var(--qui-shadow-default), 0 10px 30px rgba(0, 0, 0, 0.05);
  border: 1px solid var(--qui-hover-border);
  animation: scale-in 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.empty-icon {
  color: var(--qui-accent-deep);
  opacity: 0.2;
  margin-bottom: 24px;
  filter: drop-shadow(0 5px 10px rgba(0, 0, 0, 0.1));
  transition: all 0.3s ease;
}

.empty-state-content:hover .empty-icon {
  transform: translateY(-5px) scale(1.05);
  opacity: 0.3;
}

.empty-title {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  background: linear-gradient(120deg, var(--qui-text-primary), var(--qui-accent-deep));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.empty-description {
  margin: 0 0 32px 0;
  color: var(--qui-text-secondary);
  line-height: 1.6;
  font-size: 16px;
}

.empty-state-btn {
  padding: 0 24px;
  height: 44px;
  border-radius: 22px;
  font-size: 15px;
}

/* Add new styles for schema loading */
.schema-content-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.schema-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--qui-bg-primary-rgb, 255, 255, 255), 0.7);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5;
  animation: fade-in 0.2s ease;
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes pulse {
  0% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
  100% { opacity: 0.6; transform: scale(1); }
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes shake {
  10%, 90% { transform: translateX(-1px); }
  20%, 80% { transform: translateX(2px); }
  30%, 50%, 70% { transform: translateX(-3px); }
  40%, 60% { transform: translateX(3px); }
}

@media (max-width: 1024px) {
  .sidebar {
    width: 260px;
  }
  
  .panel-body {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .app-container {
    flex-direction: column;
  }
  
  .sidebar {
    width: 100%;
    height: auto;
    max-height: 50%;
  }
  
  .main-content {
    flex: 1;
    overflow-y: auto;
  }
  
  .panel-header {
    padding: 16px 20px;
  }
  
  .panel-body {
    padding: 16px;
  }
  
  .form-group {
    margin-bottom: 20px;
  }
  
  .form-actions {
    margin-top: 24px;
  }
}
</style>
