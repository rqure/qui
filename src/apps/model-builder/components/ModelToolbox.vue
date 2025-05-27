<script setup lang="ts">
import { ref, computed } from 'vue';
import { componentLibrary } from '../services/ComponentLibrary';

const props = defineProps<{
  categories: Array<{ id: string, label: string }>
}>();

const emit = defineEmits<{
  (e: 'add-component', componentType: string): void
}>();

const searchQuery = ref('');
const activeCategory = ref(props.categories[0]?.id || 'basic');

// Filter components based on search query and active category
const filteredComponents = computed(() => {
  const q = searchQuery.value.toLowerCase();
  return componentLibrary
    .filter(c =>
      c.category === activeCategory.value &&
      c.name.toLowerCase().includes(q)
    )
    .sort((a, b) => a.name.localeCompare(b.name));
});

// Handle component drag start
function onDragStart(event: DragEvent, componentType: string) {
  // Set data for drag operation
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/x-model-component-type', componentType);
    event.dataTransfer.effectAllowed = 'copy';
  }
}

// Handle adding a component by double clicking
function handleComponentDoubleClick(componentType: string) {
  emit('add-component', componentType);
}

// Clear search
function clearSearch() {
  searchQuery.value = '';
}

// Set active category
function setCategory(categoryId: string) {
  activeCategory.value = categoryId;
}
</script>

<template>
  <div class="toolbox mb-panel">
    <div class="toolbox-header mb-panel-header">
      <h2 class="toolbox-title">Components</h2>
      
      <!-- Search input -->
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
    
    <!-- Category tabs -->
    <div class="category-tabs">
      <button 
        v-for="category in categories" 
        :key="category.id"
        class="category-tab"
        :class="{ 'active': activeCategory === category.id }"
        @click="setCategory(category.id)"
      >
        {{ category.label }}
      </button>
    </div>
    
    <!-- Component list -->
    <div class="component-list mb-scrollbar" v-if="filteredComponents.length > 0">
      <div
        v-for="c in filteredComponents"
        :key="c.type"
        class="mb-component-preview"
        draggable="true"
        @dragstart="onDragStart($event, c.type)"
        @click="emit('add-component', c.type)"
      >
        <div class="mb-component-preview-icon" v-html="c.icon"></div>
        <span class="mb-component-preview-label">{{ c.name }}</span>
      </div>
    </div>
    
    <div v-else class="empty-results">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <p>No components found</p>
    </div>
  </div>
</template>

<style scoped>
.toolbox {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--mb-bg-toolbox);
  border-radius: var(--mb-border-radius-lg);
  overflow: hidden;
}

.toolbox-header {
  padding: 16px;
  background: var(--qui-overlay-primary);
}

.toolbox-title {
  margin: 0 0 12px 0;
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--mb-primary);
  letter-spacing: 0.3px;
}

.category-tabs {
  display: flex;
  padding: 0 4px;
  background: var(--qui-overlay-primary);
  border-bottom: 1px solid var(--mb-border-color);
  overflow-x: auto;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.category-tabs::-webkit-scrollbar {
  display: none;
}

.category-tab {
  padding: 10px 16px;
  color: var(--qui-text-secondary);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: all 0.2s var(--mb-animation-timing);
  font-size: var(--qui-font-size-small);
  white-space: nowrap;
  position: relative;
}

.category-tab:hover {
  color: var(--qui-text-primary);
}

.category-tab.active {
  color: var(--mb-primary);
  border-bottom-color: var(--mb-primary);
}

.component-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  align-content: start;
}

.mb-component-preview {
  position: relative;
  padding: 12px 8px;
  border-radius: var(--mb-border-radius);
  cursor: grab;
  transition: all 0.2s var(--mb-animation-timing);
  background: var(--qui-overlay-primary);
  border: 1px solid var(--mb-border-color);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.mb-component-preview:hover {
  background: var(--mb-primary-glow);
  border-color: var(--mb-primary);
  transform: translateY(-2px);
  box-shadow: var(--mb-shadow-md);
}

.mb-component-preview:active {
  cursor: grabbing;
  transform: translateY(0);
  box-shadow: var(--mb-shadow-sm);
}

.mb-component-preview-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s var(--mb-animation-timing);
}

.mb-component-preview:hover .mb-component-preview-icon {
  transform: scale(1.1);
}

.mb-component-preview-label {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  text-align: center;
  transition: color 0.2s var(--mb-animation-timing);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
}

.mb-component-preview:hover .mb-component-preview-label {
  color: var(--mb-primary);
}

.empty-results {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
  text-align: center;
  gap: 12px;
}

.empty-results svg {
  opacity: 0.5;
}

.empty-results p {
  font-size: var(--qui-font-size-small);
}
</style>