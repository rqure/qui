<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { type ModelComponent, type UIModelEntity, type PropertyDefinition } from '../types';
import { useDataStore } from '@/stores/data';
import { componentDefinitions } from '../services/ComponentDefinitions';
import EntitySelectorInput from './EntitySelectorInput.vue';
import FormulaEditor from './FormulaEditor.vue';

const props = defineProps<{
  component: ModelComponent | null;
  activeModel: UIModelEntity | null;
}>();

const emit = defineEmits<{
  (e: 'property-change', componentId: string, property: string, value: any): void;
}>();

const dataStore = useDataStore();
const activeTab = ref('properties');
const availableEntities = ref<string[]>([]);
const selectedEntity = ref<string | null>(null);
const availableFields = ref<string[]>([]);

// Deep copy of component properties for editing to prevent direct mutation
const editableProperties = ref<Record<string, any>>({});

// Get the property definitions for the selected component
const propertyDefinitions = computed(() => {
  if (!props.component) return [];
  
  const definition = componentDefinitions[props.component.type];
  if (!definition) return [];
  
  return definition.properties || [];
});

// Get component type name for display
const componentTypeName = computed(() => {
  if (!props.component) return 'No Selection';
  
  const definition = componentDefinitions[props.component.type];
  return definition?.name || props.component.type;
});

// Update editable properties when component changes
watch(() => props.component, (newComponent) => {
  if (newComponent) {
    // Clone properties to avoid direct mutation
    editableProperties.value = JSON.parse(JSON.stringify(newComponent.properties || {}));
    
    // Get entity and fields if there are any binding properties
    checkForBindingProperties();
  } else {
    editableProperties.value = {};
  }
}, { immediate: true });

// Check if component has binding properties and load entities if needed
function checkForBindingProperties() {
  const hasBindingProps = propertyDefinitions.value.some(
    prop => prop.type === 'entity-field' || prop.type === 'formula'
  );
  
  if (hasBindingProps && availableEntities.value.length === 0) {
    loadEntityTypes();
  }
}

// Load available entity types
async function loadEntityTypes() {
  try {
    const allEntities = await dataStore.getAllEntityTypes();
    availableEntities.value = allEntities || [];
  } catch (error) {
    console.error('Failed to load entity types:', error);
  }
}

// When entity is selected, load its fields
async function handleEntitySelect(entityType: string) {
  selectedEntity.value = entityType;
  
  try {
    const schema = await dataStore.getEntitySchema(entityType);
    if (schema && schema.fields) {
      availableFields.value = Object.keys(schema.fields);
    }
  } catch (error) {
    console.error('Failed to load entity schema:', error);
    availableFields.value = [];
  }
}

// Helper to properly extract select value and trigger load of fields
function onEntityChange(event: Event) {
  const val = (event.target as HTMLSelectElement).value;
  selectedEntity.value = val;
  handleEntitySelect(val);
}

// Update a property value and emit the change
function updateProperty(property: string, value: any) {
  if (!props.component) return;
  
  editableProperties.value[property] = value;
  emit('property-change', props.component.id, property, value);
}

// Handle binding field selection
function handleBindingSelect(property: string, binding: { entityType: string, fieldType: string }) {
  if (!props.component) return;
  
  const bindingString = `${binding.entityType}.${binding.fieldType}`;
  updateProperty(property, bindingString);
}

// Handle formula update
function handleFormulaUpdate(property: string, formula: string) {
  if (!props.component) return;
  
  updateProperty(property, formula);
}

// Process property for display based on type
function getDisplayValue(property: PropertyDefinition, value: any): string {
  if (property.type === 'color') {
    return value || '#FFFFFF';
  } else if (property.type === 'boolean') {
    return value ? 'Yes' : 'No';
  } else if (property.type === 'entity-field') {
    return value || 'Not bound';
  } else if (property.type === 'formula') {
    return value || 'No formula';
  } else if (property.type === 'options') {
    const option = property.options?.find(o => o.value === value);
    return option ? option.label : String(value || '');
  } else {
    return String(value || '');
  }
}

// Determine if the component is bound to entity fields
const hasDatabaseBinding = computed(() => {
  if (!props.component) return false;
  
  return Object.keys(props.component.properties || {}).some(key => {
    const prop = propertyDefinitions.value.find(p => p.name === key);
    return prop && (prop.type === 'entity-field' || prop.type === 'formula');
  });
});
</script>

<template>
  <div class="property-panel">
    <div class="panel-header">
      <h2 class="panel-title">Properties</h2>
      <div class="component-type" v-if="component">{{ componentTypeName }}</div>
    </div>
    
    <div class="tabs">
      <button 
        class="tab-button" 
        :class="{ 'active': activeTab === 'properties' }"
        @click="activeTab = 'properties'"
      >
        Properties
      </button>
      <button 
        class="tab-button" 
        :class="{ 'active': activeTab === 'styling' }"
        @click="activeTab = 'styling'"
      >
        Styling
      </button>
      <button 
        class="tab-button" 
        :class="{ 'active': activeTab === 'bindings' }"
        @click="activeTab = 'bindings'"
      >
        Bindings
        <span v-if="hasDatabaseBinding" class="binding-indicator"></span>
      </button>
    </div>
    
    <div class="panel-content" v-if="!component">
      <div class="empty-selection">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
          <path fill="currentColor" d="M22 9V7h-2V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2h2v-2h-2v-2h2v-2h-2V9h2zm-4 10H4V5h14v14zM6 13h5v4H6v-4zm6-6h4v3h-4V7zM6 7h5v5H6V7zm6 4h4v6h-4v-6z" />
        </svg>
        <p>Select a component to edit its properties</p>
      </div>
    </div>
    
    <div class="panel-content" v-else>
      <!-- Properties Tab -->
      <div v-if="activeTab === 'properties'">
        <div 
          v-for="prop in propertyDefinitions.filter(p => p.category === 'basic' || !p.category)" 
          :key="prop.name"
          class="property-row"
        >
          <div class="property-label">{{ prop.label || prop.name }}</div>
          
          <!-- Different input types based on property type -->
          <div class="property-input">
            <!-- String input -->
            <input 
              v-if="prop.type === 'string'" 
              type="text" 
              :value="editableProperties[prop.name]"
              @input="updateProperty(prop.name, ($event.target as HTMLInputElement).value)"
              class="text-input"
            />
            
            <!-- Number input -->
            <input 
              v-else-if="prop.type === 'number'" 
              type="number" 
              :value="editableProperties[prop.name]"
              @input="updateProperty(prop.name, Number(($event.target as HTMLInputElement).value))"
              class="number-input"
              :min="prop.min"
              :max="prop.max"
              :step="prop.step || 1"
            />
            
            <!-- Boolean input -->
            <label v-else-if="prop.type === 'boolean'" class="toggle-container">
              <input 
                type="checkbox" 
                :checked="editableProperties[prop.name]"
                @change="updateProperty(prop.name, ($event.target as HTMLInputElement).checked)"
                class="toggle-input"
              />
              <span class="toggle-slider"></span>
            </label>
            
            <!-- Color picker -->
            <div v-else-if="prop.type === 'color'" class="color-picker-container">
              <input 
                type="color" 
                :value="editableProperties[prop.name] || '#FFFFFF'"
                @input="updateProperty(prop.name, ($event.target as HTMLInputElement).value)"
                class="color-input"
              />
              <input 
                type="text" 
                :value="editableProperties[prop.name] || '#FFFFFF'"
                @input="updateProperty(prop.name, ($event.target as HTMLInputElement).value)"
                class="color-text-input"
              />
            </div>
            
            <!-- Options dropdown -->
            <select 
              v-else-if="prop.type === 'options'" 
              :value="editableProperties[prop.name]"
              @change="updateProperty(prop.name, ($event.target as HTMLSelectElement).value)"
              class="select-input"
            >
              <option v-for="option in prop.options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            
            <!-- Fallback: generic text input -->
            <input 
              v-else
              type="text" 
              :value="editableProperties[prop.name]"
              @input="updateProperty(prop.name, ($event.target as HTMLInputElement).value)"
              class="text-input"
            />
          </div>
        </div>
      </div>
      
      <!-- Styling Tab -->
      <div v-else-if="activeTab === 'styling'">
        <div 
          v-for="prop in propertyDefinitions.filter(p => p.category === 'style')" 
          :key="prop.name"
          class="property-row"
        >
          <div class="property-label">{{ prop.label || prop.name }}</div>
          
          <div class="property-input">
            <!-- Color picker for styling -->
            <div v-if="prop.type === 'color'" class="color-picker-container">
              <input 
                type="color" 
                :value="editableProperties[prop.name] || '#FFFFFF'"
                @input="updateProperty(prop.name, ($event.target as HTMLInputElement).value)"
                class="color-input"
              />
              <input 
                type="text" 
                :value="editableProperties[prop.name] || '#FFFFFF'"
                @input="updateProperty(prop.name, ($event.target as HTMLInputElement).value)"
                class="color-text-input"
              />
            </div>
            
            <!-- Other styling inputs similar to properties tab -->
            <input 
              v-else-if="prop.type === 'string'" 
              type="text" 
              :value="editableProperties[prop.name]"
              @input="updateProperty(prop.name, ($event.target as HTMLInputElement).value)"
              class="text-input"
            />
            
            <input 
              v-else-if="prop.type === 'number'" 
              type="number" 
              :value="editableProperties[prop.name]"
              @input="updateProperty(prop.name, Number(($event.target as HTMLInputElement).value))"
              class="number-input"
              :min="prop.min"
              :max="prop.max"
              :step="prop.step || 1"
            />
            
            <select 
              v-else-if="prop.type === 'options'" 
              :value="editableProperties[prop.name]"
              @change="updateProperty(prop.name, ($event.target as HTMLSelectElement).value)"
              class="select-input"
            >
              <option v-for="option in prop.options" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
          </div>
        </div>
      </div>
      
      <!-- Bindings Tab -->
      <div v-else-if="activeTab === 'bindings'">
        <div class="binding-section">
          <div class="binding-info">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
            <span>Bind properties to database fields or formulas for dynamic behavior</span>
          </div>
          
          <div class="entity-selection" v-if="propertyDefinitions.some(p => p.type === 'entity-field' || p.type === 'formula')">
            <div class="property-label">Entity Type</div>
            <select 
              v-model="selectedEntity" 
              @change="onEntityChange"
              class="select-input"
            >
              <option value="">-- Select Entity Type --</option>
              <option v-for="entity in availableEntities" :key="entity" :value="entity">
                {{ entity }}
              </option>
            </select>
          </div>
          
          <div v-for="prop in propertyDefinitions.filter(p => p.type === 'entity-field')" :key="prop.name" class="property-row">
            <div class="property-label">{{ prop.label || prop.name }}</div>
            <div class="property-input">
              <EntitySelectorInput
                :entity-type="selectedEntity"
                :available-fields="availableFields"
                :value="editableProperties[prop.name]"
                @binding-select="handleBindingSelect(prop.name, $event)"
              />
            </div>
          </div>
          
          <div v-for="prop in propertyDefinitions.filter(p => p.type === 'formula')" :key="prop.name" class="property-row formula-row">
            <div class="property-label">{{ prop.label || prop.name }}</div>
            <div class="property-input">
              <FormulaEditor
                :value="editableProperties[prop.name]"
                :entity-type="selectedEntity"
                :available-fields="availableFields"
                @update="handleFormulaUpdate(prop.name, $event)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-primary);
}

.panel-header {
  padding: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  background: linear-gradient(to right, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
}

.panel-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: var(--qui-font-weight-medium);
  color: #4fc3f7;
}

.component-type {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  opacity: 0.8;
}

.tabs {
  display: flex;
  padding: 0 4px;
  background: rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid var(--qui-hover-border);
}

.tab-button {
  padding: 10px 16px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.tab-button:hover {
  color: var(--qui-text-primary);
}

.tab-button.active {
  color: #00b0ff;
  border-bottom-color: #00b0ff;
}

.binding-indicator {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 8px;
  height: 8px;
  background-color: #00b0ff;
  border-radius: 50%;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.empty-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--qui-text-secondary);
  opacity: 0.5;
  text-align: center;
  padding: 20px;
}

.empty-selection svg {
  margin-bottom: 16px;
  color: #00b0ff;
}

.property-row {
  margin-bottom: 16px;
}

.property-label {
  margin-bottom: 6px;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  font-weight: var(--qui-font-weight-medium);
}

.property-input {
  position: relative;
}

.text-input, .number-input, .select-input {
  width: 100%;
  padding: 8px 10px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-base);
  transition: all 0.2s ease;
}

.text-input:focus, .number-input:focus, .select-input:focus {
  border-color: #00b0ff;
  box-shadow: 0 0 0 2px rgba(0, 176, 255, 0.2);
  outline: none;
}

/* Toggle switch */
.toggle-container {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 18px;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  transition: 0.4s;
  border-radius: 18px;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 1px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

.toggle-input:checked + .toggle-slider {
  background-color: #00b0ff;
  border-color: #00b0ff;
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(18px);
}

/* Color picker */
.color-picker-container {
  display: flex;
  align-items: center;
}

.color-input {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: none;
  margin-right: 8px;
  border: 1px solid var(--qui-hover-border);
}

.color-input::-webkit-color-swatch {
  border: none;
  border-radius: 4px;
  padding: 0;
}

.color-input::-webkit-color-swatch-wrapper {
  border: none;
  border-radius: 4px;
  padding: 0;
}

.color-text-input {
  flex: 1;
  padding: 8px 10px;
  background: var(--qui-bg-secondary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 4px;
  color: var(--qui-text-primary);
  font-family: var(--qui-font-family-mono);
  font-size: var(--qui-font-size-base);
}

/* Binding section */
.binding-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.binding-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: rgba(0, 176, 255, 0.1);
  border-radius: 4px;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
}

.entity-selection {
  margin-bottom: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.formula-row {
  margin-bottom: 24px;
}

/* Responsive scrollbar for panel content */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: var(--qui-bg-secondary);
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
