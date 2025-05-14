<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';

const props = defineProps<{
  columnId: string;
  parentId: EntityId;
  selectedId?: EntityId;
}>();

const emit = defineEmits<{
  (e: 'entity-select', entityId: EntityId): void;
  (e: 'scroll', event: Event): void;
}>();

interface EntityItem {
  id: EntityId;
  name: string;
  hasChildren: boolean;
}

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const entities = ref<EntityItem[]>([]);
const searchQuery = ref('');

// Filtered entities based on search query
const filteredEntities = computed(() => {
  if (!searchQuery.value) return entities.value;
  
  const query = searchQuery.value.toLowerCase();
  return entities.value.filter(entity => 
    entity.name.toLowerCase().includes(query)
  );
});

// Load entities when column mounts or parent changes
onMounted(async () => {
  await loadEntities();
});

watch(() => props.parentId, async () => {
  await loadEntities();
});

// Load child entities of the parent
async function loadEntities() {
  loading.value = true;
  error.value = null;
  entities.value = [];
  
  try {
    // Initialize the data store if needed
    if (!dataStore.isConnected) {
      await dataStore.initialize();
    }
    
    // For root entity (which has 'root' as ID), try to get entity types
    if (props.parentId === 'root') {
      // Try to get entity types
      const result = await dataStore.getEntityTypes(100, 0);
      const entityTypes = result.entityTypes || [];
      
      // Convert entity types to our EntityItem interface
      entities.value = entityTypes.map((type: string) => ({
        id: type, // Use the type name as ID
        name: type, // Display the type name
        hasChildren: true // Assume entity types have children
      }));
      
      // If no entity types, provide some test data
      if (entities.value.length === 0) {
        // Mock data for demonstration
        entities.value = [
          { id: 'User', name: 'User', hasChildren: true },
          { id: 'Document', name: 'Document', hasChildren: true },
          { id: 'Project', name: 'Project', hasChildren: true }
        ];
      }
    } else {
      // For non-root entities, try to find entities of the given parent/type
      const result = await dataStore.findEntities(props.parentId, 100);
      
      // Convert entities to our EntityItem interface
      entities.value = (result.entities || []).map((entity: any) => {
        const entityId = typeof entity === 'string' ? entity : (entity.getId ? entity.getId() : 'unknown');
        const entityName = typeof entity === 'string' ? `Entity ${entityId.substring(0,5)}` : (entity.getName ? entity.getName() : 'Unnamed Entity');
        
        return {
          id: entityId,
          name: entityName,
          hasChildren: Math.random() > 0.5 // Just for demo, we don't know if it has children
        };
      });
      
      // If no entities found, provide some test data
      if (entities.value.length === 0 && props.parentId !== 'root') {
        entities.value = generatePlaceholderEntities(props.parentId);
      }
    }
    
    loading.value = false;
  } catch (err) {
    console.error(`Error loading entities for parent ${props.parentId}:`, err);
    error.value = 'Failed to load entities';
    loading.value = false;
    
    // Fallback to placeholder entities
    entities.value = generatePlaceholderEntities(props.parentId);
  }
}

// Select an entity in this column
function selectEntity(entityId: EntityId) {
  emit('entity-select', entityId);
}

// Handle column scroll events for syncing
function handleScroll(event: Event) {
  emit('scroll', event);
}

// Helper function to generate mock entities for testing
function generatePlaceholderEntities(parentId: EntityId): EntityItem[] {
  // Create a deterministic but unique set of entities based on parent ID
  const hash = parentId.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const count = (Math.abs(hash) % 10) + 1; // 1-10 entities
  const result: EntityItem[] = [];
  
  for (let i = 0; i < count; i++) {
    const id = `${parentId}-child-${i}`;
    result.push({
      id: id,
      name: `Entity ${parentId.substring(0, 3)}-${i}`,
      hasChildren: (i % 3 === 0) // Every third entity has children
    });
  }
  
  return result;
}
</script>

<template>
  <div 
    class="entity-column" 
    @scroll="handleScroll"
    :data-column-id="columnId"
  >
    <div class="column-header">
      <div class="search-container">
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search entities..." 
          class="search-input"
        />
        <span class="search-icon" v-if="!searchQuery">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </span>
        <span class="clear-search" v-if="searchQuery" @click="searchQuery = ''">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </span>
      </div>
    </div>
    
    <div v-if="loading" class="column-loading">
      <div class="spinner"></div>
      <span>Loading...</span>
    </div>
    
    <div v-else-if="error" class="column-error">
      <span>{{ error }}</span>
      <button @click="loadEntities" class="retry-button">Retry</button>
    </div>
    
    <div v-else class="entity-list">
      <div 
        v-for="entity in filteredEntities" 
        :key="entity.id"
        class="entity-item"
        :class="{ 
          'selected': entity.id === selectedId,
          'has-children': entity.hasChildren 
        }"
        @click="selectEntity(entity.id)"
      >
        <span class="entity-name">{{ entity.name }}</span>
        <span v-if="entity.hasChildren" class="child-indicator">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
          </svg>
        </span>
      </div>
      
      <div v-if="filteredEntities.length === 0" class="empty-message">
        <span v-if="searchQuery">No matching entities</span>
        <span v-else>No entities found</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-column {
  min-width: 240px;
  width: 240px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-secondary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

/* Add smooth-scrolling class programmatically when syncing */
.entity-column.scrolling-smooth {
  scroll-behavior: smooth;
}

.entity-column::-webkit-scrollbar {
  width: 6px;
}

.entity-column::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.entity-column::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 3px;
}

.entity-column::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.column-header {
  padding: 8px;
  border-bottom: 1px solid var(--qui-hover-border);
  position: sticky;
  top: 0;
  background: var(--qui-bg-secondary);
  z-index: 5;
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 6px 28px 6px 10px;
  border-radius: 4px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
}

.search-icon {
  position: absolute;
  right: 8px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
}

.clear-search {
  position: absolute;
  right: 8px;
  color: var(--qui-text-secondary);
  cursor: pointer;
  opacity: 0.6;
}

.clear-search:hover {
  opacity: 1;
}

.entity-list {
  flex: 1;
  padding: 4px 0;
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 4px;
  margin: 1px 4px;
  transition: all 0.15s var(--qui-animation-bounce);
  justify-content: space-between;
}

.entity-item:hover {
  background: var(--qui-overlay-hover);
}

.entity-item.selected {
  background: var(--qui-overlay-active);
  box-shadow: 0 0 0 1px var(--qui-accent-color);
  color: var(--qui-accent-color);
}

.entity-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.child-indicator {
  margin-left: 8px;
  opacity: 0.6;
  transform: translateX(0);
  transition: transform 0.2s var(--qui-animation-bounce);
}

.entity-item:hover .child-indicator {
  opacity: 1;
  transform: translateX(2px);
}

.entity-item.selected .child-indicator {
  color: var(--qui-accent-color);
}

.column-loading, .column-error, .empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: var(--qui-text-secondary);
  height: 100px;
  font-size: var(--qui-font-size-small);
  text-align: center;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid transparent;
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.retry-button {
  margin-top: 8px;
  padding: 4px 8px;
  background: var(--qui-overlay-primary);
  border: none;
  border-radius: 4px;
  color: var(--qui-text-primary);
  cursor: pointer;
  font-size: var(--qui-font-size-small);
}

.retry-button:hover {
  background: var(--qui-overlay-secondary);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
