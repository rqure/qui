<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId, EntityType } from '@/core/data/types';
import type { BindingConfig } from '../utils/modelTypes';

const props = defineProps<{
  shapeId: string;
  propertyName: string;
  existingBinding?: BindingConfig;
}>();

const emit = defineEmits<{
  (e: 'save', binding: BindingConfig): void;
  (e: 'cancel'): void;
  (e: 'remove'): void;
}>();

const dataStore = useDataStore();
const loading = ref(false);
const error = ref<string | null>(null);

// Binding configuration
const selectedEntityId = ref<EntityId | null>(props.existingBinding?.entityId || null);
const selectedFieldName = ref<string | null>(props.existingBinding?.fieldName || null);
const selectedAnimation = ref<string>(props.existingBinding?.animation || 'none');

// Search functionality
const entitySearchQuery = ref('');
const fieldSearchQuery = ref('');
const entityTypes = ref<string[]>([]);
const selectedEntityType = ref<string | null>(null);
const entities = ref<{ id: EntityId; name: string; type: EntityType }[]>([]);
const availableFields = ref<{ name: string; type: string }[]>([]);

// Load entity types for filtering
async function loadEntityTypes() {
  try {
    const response = await dataStore.getEntityTypes();
    entityTypes.value = response.entityTypes;
  } catch (err) {
    console.error('Error loading entity types:', err);
  }
}

// Load entities for binding
async function loadEntities() {
  loading.value = true;
  error.value = null;
  
  try {
    // Find entities of the selected type or all types if none selected
    const entityType = selectedEntityType.value || '';
    let modelEntities: any[] = [];
    
    if (entityType) {
      modelEntities = await dataStore.find(entityType);
    } else {
      // Load a reasonable set of entity types that would have data
      const commonTypes = ['Device', 'Tag', 'Sensor', 'DataPoint', 'Controller', 'UIModel'];
      
      for (const type of commonTypes) {
        try {
          const typeEntities = await dataStore.find(type);
          modelEntities = [...modelEntities, ...typeEntities];
          
          // Avoid loading too many entities
          if (modelEntities.length > 50) break;
        } catch (e) {
          console.warn(`No entities found for type: ${type}`);
        }
      }
    }
    
    // Process and map entities
    entities.value = await Promise.all(modelEntities.map(async entity => {
      // Try to get the name field
      let name = 'Unnamed Entity';
      try {
        const nameField = entity.field('Name');
        await dataStore.read([nameField]);
        if (nameField.value) {
          name = nameField.value.getString();
        }
      } catch (e) {
        // If no Name field, use ID
        name = entity.entityId.split('$')[1] || entity.entityId;
      }
      
      return {
        id: entity.entityId,
        name,
        type: entity.entityType
      };
    }));
    
    loading.value = false;
  } catch (err) {
    error.value = 'Failed to load entities: ' + (err as Error).message;
    loading.value = false;
  }
}

// Load fields for a selected entity
async function loadFields(entityId: EntityId) {
  if (!entityId) {
    availableFields.value = [];
    return;
  }
  
  try {
    // Get the entity type from ID
    const entityType = entityId.split('$')[0];
    
    // Get schema for this entity type
    const schema = await dataStore.getEntitySchema(entityType);
    
    // Map schema fields to our field list
    availableFields.value = Object.entries(schema.fields).map(([name, fieldSchema]) => ({
      name,
      type: fieldSchema.valueType
    }));
  } catch (err) {
    error.value = 'Failed to load fields: ' + (err as Error).message;
    availableFields.value = [];
  }
}

// Filter entities by search query
const filteredEntities = computed(() => {
  if (!entitySearchQuery.value) {
    return entities.value;
  }
  
  const query = entitySearchQuery.value.toLowerCase();
  return entities.value.filter(entity => 
    entity.name.toLowerCase().includes(query) || 
    entity.id.toLowerCase().includes(query) ||
    entity.type.toLowerCase().includes(query)
  );
});

// Filter fields by search query
const filteredFields = computed(() => {
  if (!fieldSearchQuery.value) {
    return availableFields.value;
  }
  
  const query = fieldSearchQuery.value.toLowerCase();
  return availableFields.value.filter(field => 
    field.name.toLowerCase().includes(query) || 
    field.type.toLowerCase().includes(query)
  );
});

// Animation options based on property type
const animationOptions = computed(() => {
  // Base list of animations
  const options = [
    { id: 'none', name: 'None (Direct)' }
  ];
  
  // Add animations based on the property name
  switch (props.propertyName) {
    case 'fill':
    case 'stroke':
      options.push(
        { id: 'fade', name: 'Fade' },
        { id: 'flash', name: 'Flash' }
      );
      break;
    case 'width':
    case 'height':
    case 'x':
    case 'y':
      options.push(
        { id: 'tween', name: 'Smooth Transition' },
        { id: 'spring', name: 'Spring Effect' },
        { id: 'bounce', name: 'Bounce' }
      );
      break;
    case 'text':
      options.push(
        { id: 'typewriter', name: 'Typewriter Effect' }
      );
      break;
  }
  
  return options;
});

// Select an entity
function selectEntity(entityId: EntityId) {
  selectedEntityId.value = entityId;
  selectedFieldName.value = null;
  loadFields(entityId);
}

// Select a field
function selectField(fieldName: string) {
  selectedFieldName.value = fieldName;
}

// Filter by entity type
function filterByEntityType(entityType: string | null) {
  selectedEntityType.value = entityType;
  loadEntities();
}

// Save binding
function saveBinding() {
  if (!selectedEntityId.value || !selectedFieldName.value) {
    error.value = 'Entity and field must be selected';
    return;
  }
  
  const binding: BindingConfig = {
    entityId: selectedEntityId.value,
    fieldName: selectedFieldName.value,
    animation: selectedAnimation.value
  };
  
  emit('save', binding);
}

// Initialize component
onMounted(async () => {
  await loadEntityTypes();
  await loadEntities();
  
  // If editing an existing binding, load its fields
  if (props.existingBinding?.entityId) {
    loadFields(props.existingBinding.entityId);
  }
});
</script>

<template>
  <div class="binding-editor">
    <div class="binding-header">
      <h3>Data Binding for {{ propertyName }}</h3>
      <button class="close-button" @click="emit('cancel')">×</button>
    </div>
    
    <div class="binding-content">
      <!-- Entity type filter -->
      <div class="entity-type-filter">
        <label>Filter by entity type:</label>
        <select 
          class="mb-input mb-select"
          v-model="selectedEntityType"
          @change="filterByEntityType(selectedEntityType)"
        >
          <option :value="null">All Types</option>
          <option v-for="type in entityTypes" :key="type" :value="type">{{ type }}</option>
        </select>
      </div>
      
      <!-- Entity selection -->
      <div class="binding-section">
        <h4>1. Select Data Source Entity</h4>
        <div class="mb-search-container">
          <div class="mb-search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
            </svg>
          </div>
          <input 
            type="text" 
            class="mb-search-input"
            placeholder="Search entities..."
            v-model="entitySearchQuery"
          >
          <div 
            v-if="entitySearchQuery" 
            class="mb-search-clear"
            @click="entitySearchQuery = ''"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </div>
        </div>
        
        <div v-if="loading" class="loading-indicator">
          <div class="mb-spinner"></div>
          <span>Loading entities...</span>
        </div>
        
        <div v-else-if="error" class="error-message">
          {{ error }}
          <button class="mb-button mb-button-small" @click="loadEntities">Retry</button>
        </div>
        
        <div v-else-if="entities.length === 0" class="no-entities-message">
          No entities found. Try selecting a different entity type.
        </div>
        
        <div v-else class="entity-list mb-custom-scrollbar">
          <div 
            v-for="entity in filteredEntities" 
            :key="entity.id"
            class="entity-item"
            :class="{ 'selected': selectedEntityId === entity.id }"
            @click="selectEntity(entity.id)"
          >
            <div class="entity-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z" />
              </svg>
            </div>
            <div class="entity-details">
              <div class="entity-name">{{ entity.name }}</div>
              <div class="entity-type">{{ entity.type }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Field selection -->
      <div class="binding-section">
        <h4>2. Select Entity Field</h4>
        <div class="mb-search-container">
          <div class="mb-search-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
            </svg>
          </div>
          <input 
            type="text" 
            class="mb-search-input"
            placeholder="Search fields..."
            v-model="fieldSearchQuery"
            :disabled="!selectedEntityId"
          >
          <div 
            v-if="fieldSearchQuery" 
            class="mb-search-clear"
            @click="fieldSearchQuery = ''"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
            </svg>
          </div>
        </div>
        
        <div v-if="!selectedEntityId" class="select-entity-message">
          Please select an entity first
        </div>
        
        <div v-else-if="availableFields.length === 0" class="no-fields-message">
          No fields found for this entity
        </div>
        
        <div v-else class="field-list mb-custom-scrollbar">
          <div 
            v-for="field in filteredFields" 
            :key="field.name"
            class="field-item"
            :class="{ 'selected': selectedFieldName === field.name }"
            @click="selectField(field.name)"
          >
            <div class="field-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.21,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.21,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.67 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
              </svg>
            </div>
            <div class="field-details">
              <div class="field-name">{{ field.name }}</div>
              <div class="field-type">{{ field.type }}</div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Animation settings -->
      <div class="binding-section">
        <h4>3. Animation Settings</h4>
        <div class="animation-settings">
          <label for="animation-select">Animation Type:</label>
          <select 
            id="animation-select" 
            class="mb-input mb-select"
            v-model="selectedAnimation"
          >
            <option 
              v-for="option in animationOptions" 
              :key="option.id"
              :value="option.id"
            >
              {{ option.name }}
            </option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="binding-actions">
      <button 
        v-if="existingBinding" 
        class="mb-button mb-button-danger"
        @click="emit('remove')"
      >
        Remove Binding
      </button>
      <button 
        class="mb-button"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button 
        class="mb-button mb-button-primary"
        @click="saveBinding"
        :disabled="!selectedEntityId || !selectedFieldName"
      >
        Save Binding
      </button>
    </div>
  </div>
</template>

<style scoped>
.binding-editor {
  display: flex;
  flex-direction: column;
  min-height: 420px;
  max-height: 80vh;
  width: 500px;
  max-width: 100%;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 8px;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
}

.binding-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.binding-header h3 {
  margin: 0;
  font-size: var(--qui-font-size-medium);
  font-weight: var(--qui-font-weight-medium);
}

.close-button {
  background: transparent;
  border: none;
  color: var(--qui-text-secondary);
  font-size: 24px;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--qui-text-primary);
}

.binding-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
}

.entity-type-filter {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.entity-type-filter label {
  white-space: nowrap;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
}

.entity-type-filter select {
  flex: 1;
}

.binding-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.binding-section h4 {
  margin: 0;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-secondary);
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
  color: var(--qui-text-secondary);
}

.entity-list, .field-list {
  max-height: 150px;
  overflow-y: auto;
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.1);
}

.entity-item, .field-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  transition: all 0.2s var(--qui-animation-bounce);
}

.entity-item:hover, .field-item:hover {
  background: rgba(255, 255, 255, 0.05);
}

.entity-item.selected, .field-item.selected {
  background: rgba(0, 255, 136, 0.1);
  border-left: 3px solid var(--qui-accent-color);
}

.entity-icon, .field-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  margin-right: 10px;
}

.entity-details, .field-details {
  display: flex;
  flex-direction: column;
}

.entity-name, .field-name {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.entity-type, .field-type {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.select-entity-message, .no-entities-message, .no-fields-message {
  text-align: center;
  padding: 20px 0;
  color: var(--qui-text-secondary);
  background: rgba(0, 0, 0, 0.1);
  border-radius: 4px;
}

.animation-settings {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.binding-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px;
  border-top: 1px solid var(--qui-hover-border);
}

.error-message {
  color: #F44336;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
