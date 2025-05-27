<script setup lang="ts">
import { computed } from 'vue';
import type { ModelComponent, UIModelEntity, PropertyDefinition } from '../types';
import { PropertyType } from '../types';
import ValueEditor from '@/apps/database-browser/components/ValueEditor.vue';
import { ValueType } from '@/core/data/types';
import { componentDefinitions } from '../services/ComponentDefinitions';
import PropertySwitch from './inputs/PropertySwitch.vue';
import PropertyColorPicker from './inputs/PropertyColorPicker.vue';
import PropertySelect from './inputs/PropertySelect.vue';
import PropertyNumber from './inputs/PropertyNumber.vue';
import PropertyEntityField from './inputs/PropertyEntityField.vue';
import PropertyFormula from './inputs/PropertyFormula.vue';

const props = defineProps<{
  component: ModelComponent | null;
  activeModel: UIModelEntity | null;
}>();

const emit = defineEmits<{
  (e: 'property-change', componentId: string, property: string, value: any): void;
}>();

// Helper to get property value with proper typing
function getPropertyValue(prop: PropertyDefinition): any {
  if (!props.component?.properties) return prop.defaultValue ?? null;
  
  const value = props.component.properties[prop.name];
  return value !== undefined ? value : (prop.defaultValue ?? null);
}

// Format property name with proper typing
function formatPropertyName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

// Get component definition for the selected component
const componentDef = computed(() => {
  if (!props.component) return null;
  return componentDefinitions[props.component.type];
});

// Group properties by category
const propertyGroups = computed(() => {
  if (!componentDef.value) return {};
  
  const groups: Record<string, any[]> = {};
  componentDef.value.properties.forEach(prop => {
    const category = prop.category || 'basic';
    if (!groups[category]) groups[category] = [];
    groups[category].push(prop);
  });
  
  // Sort properties within each group by rank
  Object.keys(groups).forEach(category => {
    groups[category].sort((a, b) => (a.rank || 0) - (b.rank || 0));
  });
  
  return groups;
});

// Map ModelBuilder PropertyType to ValueEditor type
function mapPropertyTypeToValueType(propType: PropertyType): string {
  switch (propType) {
    case PropertyType.String:
      return ValueType.String;
    case PropertyType.Number:
      return ValueType.Float;
    case PropertyType.Boolean:
      return ValueType.Bool;
    case PropertyType.Color:
      return ValueType.String;
    case PropertyType.Options:
      return ValueType.Choice;
    case PropertyType.EntityField:
      return ValueType.EntityReference;
    case PropertyType.Formula:
      return ValueType.String;
    default:
      return ValueType.String;
  }
}

// Create a value object for the ValueEditor
function createValueObject(prop: any, value: any): any {
  const type = mapPropertyTypeToValueType(prop.type);
  return {
    type,
    value,
    toString: () => value?.toString() || '',
    // Add type-specific getters
    getString: () => value?.toString() || '',
    getBool: () => value === true || value === 'true',
    getInt: () => parseInt(value) || 0,
    getFloat: () => parseFloat(value) || 0,
    getChoice: () => parseInt(value) || 0
  };
}

// Helper to determine which input component to use
function getInputComponent(propertyType: PropertyType) {
  switch (propertyType) {
    case PropertyType.Boolean:
      return PropertySwitch;
    case PropertyType.Color:
      return PropertyColorPicker;
    case PropertyType.Options:
      return PropertySelect;
    case PropertyType.Number:
      return PropertyNumber;
    case PropertyType.EntityField:
      return PropertyEntityField;
    case PropertyType.Formula:
      return PropertyFormula;
    default:
      return 'input'; // Default HTML input for strings
  }
}

// Handle property change with proper typing
function handlePropertyChange(property: string, value: any): void {
  if (!props.component) return;
  emit('property-change', props.component.id, property, value);
}
</script>

<template>
  <div class="property-panel mb-panel">
    <!-- Header -->
    <div class="panel-header">
      <h2 class="panel-title">Properties</h2>
      <div v-if="component" class="component-info">
        <span class="component-type">{{ componentDef?.name || component.type }}</span>
        <span class="component-id">ID: {{ component.id.slice(0, 8) }}</span>
      </div>
    </div>

    <!-- Properties Content -->
    <div v-if="component" class="property-content mb-scrollbar">
      <!-- Property Groups -->
      <div v-for="(properties, category) in propertyGroups" :key="category" class="property-group">
        <div class="group-header">
          <span class="group-title">{{ formatPropertyName(category) }}</span>
          <div class="group-divider"></div>
        </div>
        
        <div class="group-properties">
          <div v-for="prop in properties" :key="prop.name" class="property-row">
            <label class="property-label" :title="prop.description">
              {{ prop.label || formatPropertyName(prop.name) }}
            </label>
            
            <div class="property-input">
              <component 
                :is="getInputComponent(prop.type)"
                :value="getPropertyValue(prop)"
                :property="prop"
                :component="component"
                :active-model="activeModel"
                @update="value => handlePropertyChange(prop.name, value)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="currentColor" d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
      </svg>
      <p>Select a component to edit its properties</p>
    </div>
  </div>
</template>

<style scoped>
.property-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-secondary);
  border-radius: var(--mb-border-radius-lg);
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  background: var(--qui-overlay-primary);
  border-bottom: 1px solid var(--qui-hover-border);
}

.panel-title {
  margin: 0;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--mb-primary);
  letter-spacing: 0.3px;
}

.component-info {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.component-type {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.component-id {
  font-family: var(--qui-font-family-mono);
  font-size: 10px;
  color: var(--qui-text-tertiary);
  background: rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  border-radius: 10px;
}

.property-content {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.property-group {
  background: var(--qui-bg-primary);
  border-radius: 8px;
  margin: 8px;
  overflow: hidden;
}

.group-header {
  padding: 12px 16px;
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-accent-color);
  background: var(--qui-overlay-primary);
  border-bottom: 1px solid var(--qui-hover-border);
}

.group-properties {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.property-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--qui-bg-primary);
  border-radius: 6px;
  border: 1px solid var(--qui-hover-border);
  transition: all 0.2s var(--qui-animation-bounce);
}

.property-row:hover {
  border-color: var(--qui-accent-color);
  box-shadow: 0 2px 8px var(--qui-accent-glow);
}

.property-label {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  font-weight: var(--qui-font-weight-medium);
  user-select: none;
}

.property-info {
  display: flex;
  color: var(--qui-text-tertiary);
  opacity: 0.6;
  cursor: help;
  transition: all 0.2s ease;
}

.property-info:hover {
  opacity: 1;
  color: var(--qui-accent-color);
}

.property-input {
  position: relative;
}

/* Input type specific styles */
.boolean-input {
  padding: 4px 0;
}

.string-input, .number-input {
  border-radius: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 32px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
  text-align: center;
}

.empty-state svg {
  opacity: 0.5;
}

.empty-state p {
  font-size: var(--qui-font-size-small);
}
</style>