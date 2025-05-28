<script setup lang="ts">
import { ref, computed } from 'vue';
import type { ModelComponent, UIModelEntity } from '../types';

const props = defineProps<{
  components: ModelComponent[];
  selectedComponentId?: string;
}>();

const emit = defineEmits<{
  (e: 'select-component', component: ModelComponent): void;
  (e: 'delete-component', componentId: string): void;
}>();

const searchQuery = ref('');

// Filter components based on search query
const filteredComponents = computed(() => {
  const query = searchQuery.value.toLowerCase();
  return props.components?.filter(component => 
    (component.properties?.name || component.type).toLowerCase().includes(query)
  ) || [];
});
</script>

<template>
  <div class="explorer mb-panel">
    <div class="explorer-header mb-panel-header">
      <h2 class="explorer-title">Components</h2>
      
      <!-- Search input -->
      <div class="mb-search-container">
        <span class="mb-search-icon">
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
        <span v-if="searchQuery" class="mb-search-clear" @click="searchQuery = ''">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </span>
      </div>
    </div>

    <div class="explorer-content mb-scrollbar">
      <div v-if="filteredComponents.length > 0" class="component-list">
        <div 
          v-for="component in filteredComponents" 
          :key="component.id"
          class="component-item"
          :class="{ 'selected': selectedComponentId === component.id }"
          @click="emit('select-component', component)"
        >
          <div class="component-info">
            <span class="component-name">{{ component.properties?.name || 'Unnamed' }}</span>
            <span class="component-type mb-badge">{{ component.type }}</span>
          </div>
          <div class="component-actions">
            <button class="action-button" @click.stop="emit('delete-component', component.id)">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
                <path fill="currentColor" d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <path fill="currentColor" d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm1-5C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
        </svg>
        <p>No components found</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--mb-bg-toolbox);
  border-radius: var(--mb-border-radius-lg);
  overflow: hidden;
}

.explorer-header {
  padding: 16px;
  background: var(--qui-overlay-primary);
  border-bottom: 1px solid var(--mb-border-color);
}

.explorer-title {
  margin: 0 0 12px 0;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--mb-primary);
  letter-spacing: 0.3px;
}

.explorer-content {
  flex: 1;
  overflow-y: auto;
}

.component-list {
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.component-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--mb-border-color);
  border-radius: var(--mb-border-radius);
  cursor: pointer;
  transition: all 0.2s var(--mb-animation-timing);
}

.component-item:hover {
  background: var(--mb-primary-glow);
  border-color: var(--mb-primary);
  transform: translateX(2px);
}

.component-item.selected {
  background: var(--mb-primary-glow);
  border-color: var(--mb-primary);
  box-shadow: 0 0 0 1px var(--mb-primary);
}

.component-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.component-name {
  font-size: var(--qui-font-size-small);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.component-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.component-item:hover .component-actions {
  opacity: 1;
}

.action-button {
  padding: 6px;
  border: none;
  background: transparent;
  color: var(--qui-text-secondary);
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.action-button:hover {
  background: rgba(255, 59, 48, 0.1);
  color: #ff3b30;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
  text-align: center;
  gap: 12px;
}

.empty-state svg {
  opacity: 0.5;
}

.empty-state p {
  font-size: var(--qui-font-size-small);
}
</style>
