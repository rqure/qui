<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { type ModelComponent } from '../types';

const props = defineProps<{
  components: ModelComponent[];
  selectedComponent: ModelComponent | null;
}>();

const emit = defineEmits<{
  (e: 'select-component', component: ModelComponent | null): void;
}>();

const searchQuery = ref('');

// Filter components based on search query
const filteredComponents = computed(() => {
  if (!searchQuery.value) return props.components;
  
  const query = searchQuery.value.toLowerCase();
  return props.components.filter(component => 
    component.type.toLowerCase().includes(query) || 
    component.properties?.name?.toLowerCase().includes(query) ||
    component.id.toLowerCase().includes(query)
  );
});

// Handle component selection
function selectComponent(component: ModelComponent) {
  emit('select-component', component);
}

// Clear search query
function clearSearch() {
  searchQuery.value = '';
}

// Get component display name with fallback to type and id
function getComponentName(component: ModelComponent): string {
  // First try to get custom name from properties
  if (component.properties?.name) return component.properties.name;
  
  // Then try to use component type with a nice format
  const typeName = component.type
    .replace(/([A-Z])/g, ' $1') // Add spaces before capital letters
    .replace(/^./, str => str.toUpperCase()); // Capitalize first letter
  
  // Add short ID suffix for uniqueness
  const shortId = component.id.substring(0, 5);
  
  return `${typeName} (${shortId})`;
}
</script>

<template>
  <div class="model-explorer">
    <div class="explorer-header">
      <h3 class="explorer-title">Component Explorer</h3>
      
      <div class="mb-search-container">
        <span class="mb-search-icon" v-if="!searchQuery">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search components..." 
          class="mb-search-input"
        />
        <span class="mb-search-clear" v-if="searchQuery" @click="clearSearch">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </span>
      </div>
    </div>
    
    <div class="components-list" v-if="filteredComponents.length > 0">
      <div
        v-for="component in filteredComponents"
        :key="component.id"
        class="component-list-item"
        :class="{ 'selected': component === selectedComponent }"
        @click="selectComponent(component)"
      >
        <div class="component-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M6 13h12v-2H6v2zM3 6v2h18V6H3zm6 14h6v-2H9v2z"/>
          </svg>
        </div>
        <div class="component-info">
          <div class="component-name">{{ getComponentName(component) }}</div>
          <div class="component-type">{{ component.type }}</div>
        </div>
        <div class="component-position">
          {{ component.x }},{{ component.y }}
        </div>
      </div>
    </div>
    
    <div v-else class="empty-components">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <p v-if="searchQuery">No matching components</p>
      <p v-else>No components in model</p>
    </div>
  </div>
</template>

<style scoped>
.model-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}

.explorer-header {
  padding: 12px 16px;
  border-bottom: 1px solid var(--qui-hover-border);
  background: linear-gradient(to right, rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.1));
}

.explorer-title {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: var(--qui-font-weight-medium);
  color: #4fc3f7;
}

.components-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.component-list-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.component-list-item:hover {
  background: var(--qui-overlay-hover);
}

.component-list-item.selected {
  background: rgba(0, 176, 255, 0.1);
  border-left: 2px solid #00b0ff;
}

.component-icon {
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-text-secondary);
}

.component-list-item.selected .component-icon {
  color: #00b0ff;
}

.component-info {
  flex: 1;
  min-width: 0; /* Allow text to wrap/truncate */
  margin-right: 8px;
}

.component-name {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.component-type {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}

.component-position {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  min-width: 50px;
  text-align: right;
  font-family: var(--qui-font-family-mono);
}

.empty-components {
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

.empty-components svg {
  margin-bottom: 16px;
  opacity: 0.6;
}

/* Responsive scrollbar for components list */
.components-list::-webkit-scrollbar {
  width: 6px;
}

.components-list::-webkit-scrollbar-track {
  background: var(--qui-bg-secondary);
}

.components-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.components-list::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
