<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ShapeConfig } from '../utils/modelTypes';

const props = defineProps<{
  selectedShape: ShapeConfig | null;
  modelSettings: any;
}>();

const emit = defineEmits<{
  (e: 'update-shape', property: string, value: any): void;
  (e: 'update-model', property: string, value: any): void;
}>();

// Track which panel is active
const activeTab = ref('properties');
const setActiveTab = (tab: string) => {
  activeTab.value = tab;
};

// Edit shape properties
const updateShapeProperty = (property: string, value: any) => {
  emit('update-shape', property, value);
};

// Edit model settings
const updateModelSetting = (property: string, value: any) => {
  emit('update-model', property, value);
};

// Computed properties based on the selected shape type
const availableProperties = computed(() => {
  if (!props.selectedShape) return [];
  
  const commonProperties = [
    { name: 'id', label: 'ID', type: 'text', readonly: true },
    { name: 'x', label: 'X Position', type: 'number', step: 1 },
    { name: 'y', label: 'Y Position', type: 'number', step: 1 },
  ];
  
  // Add properties based on shape type
  const typeSpecificProperties: any[] = [];
  
  switch (props.selectedShape.type) {
    case 'rect':
      typeSpecificProperties.push(
        { name: 'width', label: 'Width', type: 'number', min: 0, step: 1 },
        { name: 'height', label: 'Height', type: 'number', min: 0, step: 1 },
      );
      break;
    case 'circle':
      typeSpecificProperties.push(
        { name: 'width', label: 'Diameter', type: 'number', min: 0, step: 1 },
      );
      break;
    case 'text':
      typeSpecificProperties.push(
        { name: 'text', label: 'Text Content', type: 'textarea' },
        { name: 'fontSize', label: 'Font Size', type: 'number', min: 8, max: 72, step: 1 },
        { name: 'fontFamily', label: 'Font Family', type: 'select', options: [
          { value: 'Arial', label: 'Arial' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'Courier New', label: 'Courier New' },
          { value: 'Verdana', label: 'Verdana' },
        ]},
      );
      break;
  }
  
  // Style properties for all shapes
  const styleProperties = [
    { name: 'fill', label: 'Fill Color', type: 'color' },
    { name: 'stroke', label: 'Border Color', type: 'color' },
    { name: 'strokeWidth', label: 'Border Width', type: 'number', min: 0, max: 20, step: 1 },
  ];
  
  return [...commonProperties, ...typeSpecificProperties, ...styleProperties];
});

// Model settings that apply to the entire canvas
const modelSettingProperties = computed(() => {
  return [
    { name: 'name', label: 'Model Name', type: 'text' },
    { name: 'width', label: 'Canvas Width', type: 'number', min: 100, step: 10 },
    { name: 'height', label: 'Canvas Height', type: 'number', min: 100, step: 10 },
    { name: 'background', label: 'Canvas Background', type: 'color' },
    { name: 'gridSize', label: 'Grid Size', type: 'number', min: 5, max: 100, step: 5 },
    { name: 'snapToGrid', label: 'Snap to Grid', type: 'checkbox' },
    { name: 'defaultFill', label: 'Default Fill Color', type: 'color' },
    { name: 'defaultStroke', label: 'Default Stroke Color', type: 'color' },
  ];
});

// Get the current value for a property
const getPropertyValue = (property: string) => {
  if (!props.selectedShape) return '';
  return (props.selectedShape as any)[property] ?? '';
};

// Get the current value for a model setting
const getModelSettingValue = (property: string) => {
  if (!props.modelSettings) return '';
  return (props.modelSettings as any)[property] ?? '';
};
</script>

<template>
  <div class="properties-panel mb-custom-scrollbar">
    <!-- Tab navigation -->
    <div class="properties-tabs">
      <button 
        class="tab-button"
        :class="{ 'active': activeTab === 'properties' }"
        @click="setActiveTab('properties')"
      >
        Properties
      </button>
      <button 
        class="tab-button"
        :class="{ 'active': activeTab === 'settings' }"
        @click="setActiveTab('settings')"
      >
        Settings
      </button>
    </div>
    
    <!-- Shape properties panel -->
    <div v-if="activeTab === 'properties'" class="properties-content">
      <div v-if="!selectedShape" class="no-selection-message">
        <p>No shape selected</p>
        <p class="helper-text">Select a shape to view and edit its properties.</p>
      </div>
      <div v-else class="property-rows">
        <div 
          v-for="prop in availableProperties" 
          :key="prop.name"
          class="mb-property-row"
        >
          <div class="mb-property-name">{{ prop.label }}</div>
          <div class="mb-property-value">
            <!-- Text input -->
            <input 
              v-if="prop.type === 'text'" 
              type="text" 
              class="mb-input"
              :value="getPropertyValue(prop.name)"
              :readonly="prop.readonly"
              @input="e => updateShapeProperty(prop.name, (e.target as HTMLInputElement).value)"
            >
            
            <!-- Number input -->
            <input 
              v-else-if="prop.type === 'number'" 
              type="number" 
              class="mb-input"
              :value="getPropertyValue(prop.name)"
              :min="prop.min"
              :max="prop.max"
              :step="prop.step"
              @input="e => updateShapeProperty(prop.name, parseFloat((e.target as HTMLInputElement).value))"
            >
            
            <!-- Textarea -->
            <textarea 
              v-else-if="prop.type === 'textarea'" 
              class="mb-input mb-textarea"
              :value="getPropertyValue(prop.name)"
              @input="e => updateShapeProperty(prop.name, (e.target as HTMLTextAreaElement).value)"
            ></textarea>
            
            <!-- Color picker -->
            <div v-else-if="prop.type === 'color'" class="color-picker-container">
              <input 
                type="color" 
                class="mb-color-input"
                :value="getPropertyValue(prop.name) || '#ffffff'"
                @input="e => updateShapeProperty(prop.name, (e.target as HTMLInputElement).value)"
              >
              <input 
                type="text" 
                class="mb-input mb-color-text"
                :value="getPropertyValue(prop.name)"
                @input="e => updateShapeProperty(prop.name, (e.target as HTMLInputElement).value)"
              >
            </div>
            
            <!-- Select dropdown -->
            <select 
              v-else-if="prop.type === 'select'" 
              class="mb-input mb-select"
              :value="getPropertyValue(prop.name)"
              @change="e => updateShapeProperty(prop.name, (e.target as HTMLSelectElement).value)"
            >
              <option 
                v-for="option in prop.options" 
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </option>
            </select>
            
            <!-- Checkbox -->
            <div v-else-if="prop.type === 'checkbox'" class="checkbox-container">
              <input 
                type="checkbox" 
                class="mb-checkbox"
                :checked="getPropertyValue(prop.name)"
                @change="e => updateShapeProperty(prop.name, (e.target as HTMLInputElement).checked)"
              >
            </div>
          </div>
        </div>
        
        <!-- Add section for bindings -->
        <div class="binding-section">
          <div class="section-title">Data Bindings</div>
          <button class="mb-button mb-button-primary add-binding-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
            Add Binding
          </button>
        </div>
      </div>
    </div>
    
    <!-- Model settings panel -->
    <div v-else-if="activeTab === 'settings'" class="properties-content">
      <div class="property-rows">
        <div 
          v-for="prop in modelSettingProperties" 
          :key="prop.name"
          class="mb-property-row"
        >
          <div class="mb-property-name">{{ prop.label }}</div>
          <div class="mb-property-value">
            <!-- Text input -->
            <input 
              v-if="prop.type === 'text'" 
              type="text" 
              class="mb-input"
              :value="getModelSettingValue(prop.name)"
              @input="e => updateModelSetting(prop.name, (e.target as HTMLInputElement).value)"
            >
            
            <!-- Number input -->
            <input 
              v-else-if="prop.type === 'number'" 
              type="number" 
              class="mb-input"
              :value="getModelSettingValue(prop.name)"
              :min="prop.min"
              :max="prop.max"
              :step="prop.step"
              @input="e => updateModelSetting(prop.name, parseFloat((e.target as HTMLInputElement).value))"
            >
            
            <!-- Color picker -->
            <div v-else-if="prop.type === 'color'" class="color-picker-container">
              <input 
                type="color" 
                class="mb-color-input"
                :value="getModelSettingValue(prop.name) || '#ffffff'"
                @input="e => updateModelSetting(prop.name, (e.target as HTMLInputElement).value)"
              >
              <input 
                type="text" 
                class="mb-input mb-color-text"
                :value="getModelSettingValue(prop.name)"
                @input="e => updateModelSetting(prop.name, (e.target as HTMLInputElement).value)"
              >
            </div>
            
            <!-- Checkbox -->
            <div v-else-if="prop.type === 'checkbox'" class="checkbox-container">
              <input 
                type="checkbox" 
                class="mb-checkbox"
                :checked="getModelSettingValue(prop.name)"
                @change="e => updateModelSetting(prop.name, (e.target as HTMLInputElement).checked)"
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.properties-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.properties-tabs {
  display: flex;
  border-bottom: 1px solid var(--qui-hover-border);
}

.tab-button {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--qui-text-primary);
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
  position: relative;
}

.tab-button:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: transparent;
}

.tab-button.active {
  color: var(--qui-accent-color);
}

.tab-button.active:after {
  background: var(--qui-accent-color);
}

.tab-button:hover {
  background: rgba(255, 255, 255, 0.05);
}

.properties-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.no-selection-message {
  text-align: center;
  color: var(--qui-text-secondary);
  margin-top: 24px;
}

.helper-text {
  font-size: var(--qui-font-size-small);
  margin-top: 8px;
}

.property-rows {
  display: flex;
  flex-direction: column;
}

.mb-textarea {
  resize: vertical;
  min-height: 60px;
}

.color-picker-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mb-color-input {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  padding: 0;
  cursor: pointer;
}

.mb-color-text {
  flex: 1;
}

.checkbox-container {
  display: flex;
  align-items: center;
}

.mb-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.binding-section {
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid var(--qui-hover-border);
}

.section-title {
  font-weight: var(--qui-font-weight-medium);
  margin-bottom: 12px;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.add-binding-button {
  width: 100%;
  margin-top: 8px;
}
</style>
