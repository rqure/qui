<script setup lang="ts">
import { computed } from 'vue';
import type { Drawable } from '@/core/utils/drawing/drawable';
import type { EditableProperty } from '@/core/utils/drawing/drawable';

const props = defineProps<{
  selectedItem?: Drawable;
}>();

const emit = defineEmits<{
  'update:selectedItem': [drawable: Drawable]
}>();

const properties = computed<EditableProperty[]>(() => {
  return props.selectedItem?.getEditableProperties() ?? [];
});

const updateProperty = (property: string, value: any) => {
  if (!props.selectedItem) return;
  
  const item = props.selectedItem as any;
  const parts = property.split('.');
  let current = item;
  
  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
  
  emit('update:selectedItem', props.selectedItem);
};
</script>

<template>
  <div class="properties-editor">
    <div v-if="!selectedItem" class="no-selection">
      No item selected
    </div>
    <div v-else class="properties-container">
      <h3>Properties</h3>
      <div class="property-group">
        <div v-for="prop in properties" 
             :key="prop.name" 
             class="property-row">
          <label>{{ prop.label }}</label>
          <input v-if="prop.type === 'number'"
                 type="number"
                 :value="prop.value"
                 @input="e => updateProperty(prop.name, +(e.target as HTMLInputElement).value)" />
          <input v-else-if="prop.type === 'color'"
                 type="color"
                 :value="prop.value"
                 @input="e => updateProperty(prop.name, (e.target as HTMLInputElement).value)" />
          <input v-else-if="prop.type === 'range'"
                 type="range"
                 :value="prop.value"
                 :min="prop.min"
                 :max="prop.max"
                 :step="prop.step"
                 @input="e => updateProperty(prop.name, +(e.target as HTMLInputElement).value)" />
          <input v-else
                 type="text"
                 :value="prop.value"
                 @input="e => updateProperty(prop.name, (e.target as HTMLInputElement).value)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.properties-editor {
  position: fixed;
  top: calc(var(--qui-titlebar-height) + 60px); /* Position below toolbar with margin */
  right: 20px; /* Increased margin from edge */
  bottom: 70px; /* Leave more space for CanvasInfo */
  background-color: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  padding: 1rem;
  width: 250px;
  box-shadow: var(--qui-shadow-window);
  backdrop-filter: blur(var(--qui-backdrop-blur));
  z-index: 1000;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.properties-container {
  flex: 1;
  overflow-y: auto;
}

/* Add scrollbar styling */
.properties-container::-webkit-scrollbar {
  width: 8px;
}

.properties-container::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
  border-radius: var(--qui-window-radius);
}

.properties-container::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: var(--qui-window-radius);
}

.properties-container::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.no-selection {
  color: var(--qui-text-secondary);
  text-align: center;
  padding: 1rem;
}

.property-group {
  margin-bottom: 1rem;
  padding: 0.5rem;
  background-color: var(--qui-bg-primary);
  border-radius: var(--qui-window-radius);
}

.property-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  gap: 1rem;
}

.property-row label {
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
}

.property-row input {
  background-color: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  color: var(--qui-text-primary);
  padding: 0.25rem 0.5rem;
  width: 100px;
}

h3, h4 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: var(--qui-text-primary);
}

h4 {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}
</style>