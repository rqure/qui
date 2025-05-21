<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useDataStore } from '@/stores/data';
import { EntityFactories, type Entity, type EntityId, type EntityType } from '@/core/data/types';
import { useEntityDrag } from '@/core/utils/composables';

const props = defineProps<{
  columnId: string;
  parentId?: EntityId;
  selectedId?: EntityId;
}>();

const emit = defineEmits<{
  (e: 'entity-select', entityId: EntityId): void;
  (e: 'scroll', event: Event): void;
}>();

interface EntityItem {
  id: EntityId;
  name: string;
  type: EntityType;
  children: EntityId[];
}

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const entities = ref<EntityItem[]>([]);
const searchQuery = ref('');

// Group entities by their type
const groupedEntities = computed(() => {
  const filtered = searchQuery.value 
    ? entities.value.filter(entity => entity.name.toLowerCase().includes(searchQuery.value.toLowerCase()))
    : entities.value;

  const groups: Record<EntityType, EntityItem[]> = {};
  
  filtered.forEach(entity => {
    if (!groups[entity.type]) {
      groups[entity.type] = [];
    }
    groups[entity.type].push(entity);
  });

  // Sort entities in each group by name
  Object.keys(groups).forEach(type => {
    groups[type].sort((a, b) => a.name.localeCompare(b.name));
  });

  // Sort the group keys alphabetically
  const sortedGroups: [EntityType, EntityItem[]][] = Object.entries(groups)
    .sort(([typeA], [typeB]) => typeA.localeCompare(typeB));

  return sortedGroups;
});

// Count of all filtered entities
const totalFilteredCount = computed(() => {
  return groupedEntities.value.reduce((count, [_, entities]) => count + entities.length, 0);
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
    if (!props.parentId) {
      const roots = await dataStore.find("Root") as Entity[];
      if (roots.length > 0) {
        entities.value.push({
          id: roots[0].entityId,
          name: roots[0].field("Name").value.getString(),
          type: "Root",
          children: roots[0].field("Children").value.getEntityList()
        });
      }
      loading.value = false;
      return;
    }

    const parentEntity = EntityFactories.newEntity(props.parentId);
    const children = parentEntity.field("Children");
    await dataStore.read([children]);
    
    const childrenIds = children.value.getEntityList();
    
    // Load all children entities with their basic info
    await Promise.all(childrenIds.map(async (childId: EntityId) => {
      try {
        const childEntity = EntityFactories.newEntity(childId);
        const nameField = childEntity.field("Name");
        const childrenField = childEntity.field("Children");
        
        await dataStore.read([nameField, childrenField]);
        
        const entityType = childEntity.entityType;
        const name = nameField.value.getString();
        const childrenList = childrenField.value.getEntityList();
        
        entities.value.push({
          id: childId,
          name: name || 'Unnamed',
          type: entityType,
          children: childrenList
        });
      } catch (err) {
        console.error(`Error loading child entity ${childId}:`, err);
      }
    }));
    
    loading.value = false;
  } catch (err) {
    console.error(`Error in loadEntities for ${props.parentId}:`, err);
    error.value = 'Failed to load entities';
    loading.value = false;
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

// Add drag functionality with the composable
const { startEntityDrag } = useEntityDrag();

// Start dragging an entity
function handleDragStart(event: DragEvent, entity: EntityItem) {
  startEntityDrag(event, entity.id, entity.type, entity.name);
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
        <span class="search-icon" v-if="!searchQuery">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
        </span>
        <input 
          type="text" 
          v-model="searchQuery" 
          placeholder="Search entities..." 
          class="search-input"
        />
        <span class="clear-search" v-if="searchQuery" @click="searchQuery = ''">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </span>
      </div>
    </div>
    
    <div v-if="loading" class="column-loading">
      <div class="spinner"></div>
      <span>Loading entities...</span>
    </div>
    
    <div v-else-if="error" class="column-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>{{ error }}</span>
      <button @click="loadEntities" class="retry-button">Retry</button>
    </div>
    
    <div v-else-if="totalFilteredCount === 0" class="empty-message">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
        <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
      </svg>
      <span v-if="searchQuery">No matching entities</span>
      <span v-else>No entities found</span>
    </div>
    
    <div v-else class="entity-list">
      <div v-for="[type, entitiesGroup] in groupedEntities" :key="type" class="entity-group">
        <div class="entity-group-header">
          <span class="entity-group-title">{{ type }}</span>
          <span class="entity-group-count">{{ entitiesGroup.length }}</span>
        </div>
        
        <div 
          v-for="entity in entitiesGroup" 
          :key="entity.id"
          class="entity-item"
          :class="{ 
            'selected': entity.id === selectedId,
            'has-children': entity.children.length > 0
          }"
          @click="selectEntity(entity.id)"
          draggable="true"
          @dragstart="handleDragStart($event, entity)"
        >
          <div class="entity-item-content">
            <span class="entity-drag-handle">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
                <path fill="currentColor" d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
              </svg>
            </span>
            <span class="entity-name">{{ entity.name }}</span>
          </div>
          <span v-if="entity.children.length > 0" class="child-indicator">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
            </svg>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-column {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  background: var(--qui-bg-secondary);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: width 0.1s ease;
  width: 220px; /* Default width, will be overridden by inline style */
  
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
  padding: 12px;
  border-bottom: 1px solid var(--qui-hover-border);
  position: sticky;
  top: 0;
  background: var(--qui-bg-secondary);
  z-index: 5;
  backdrop-filter: blur(5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-container {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  border-radius: 20px;
  border: 1px solid var(--qui-hover-border);
  background: rgba(0, 0, 0, 0.2);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
  transition: all 0.2s var(--qui-animation-bounce);
}

.search-input:focus {
  background: rgba(0, 0, 0, 0.3);
  border-color: var(--qui-accent-color);
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 255, 136, 0.2);
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--qui-text-secondary);
  opacity: 0.6;
}

.clear-search {
  position: absolute;
  right: 10px;
  color: var(--qui-text-secondary);
  cursor: pointer;
  opacity: 0.6;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  transition: all 0.2s var(--qui-animation-bounce);
}

.clear-search:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

.entity-list {
  flex: 1;
  padding: 8px 0;
}

.entity-group {
  margin-bottom: 12px;
}

.entity-group-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 16px;
  color: var(--qui-accent-color);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  font-weight: var(--qui-font-weight-medium);
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid rgba(0, 255, 136, 0.1);
}

.entity-group-count {
  background: rgba(0, 255, 136, 0.1);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 10px;
  font-weight: var(--qui-font-weight-bold);
  box-shadow: 0 0 5px rgba(0, 255, 136, 0.1);
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  border-radius: 6px;
  margin: 3px 6px;
  transition: all 0.15s var(--qui-animation-bounce);
  justify-content: space-between;
  border-left: 2px solid transparent;
  position: relative;
  overflow: hidden;
}

/* Add entity-item-content class for layout with drag handle */
.entity-item-content {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.entity-drag-handle {
  opacity: 0.4;
  display: flex;
  align-items: center;
  cursor: grab;
  transition: opacity 0.2s ease;
}

.entity-item:hover .entity-drag-handle {
  opacity: 0.7;
}

.entity-item.selected .entity-drag-handle {
  color: var(--qui-accent-color);
  opacity: 0.8;
}

/* Update entity-name to work with the new structure */
.entity-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;
  z-index: 1;
  font-weight: var(--qui-font-weight-medium);
  letter-spacing: 0.2px;
}

/* Add styles for active dragging */
.entity-item:active {
  cursor: grabbing;
}

.child-indicator {
  margin-left: 8px;
  opacity: 0.6;
  transform: translateX(0);
  transition: transform 0.2s var(--qui-animation-bounce);
  position: relative;
  z-index: 1;
}

.entity-item:hover .child-indicator {
  opacity: 1;
  transform: translateX(3px);
}

.entity-item.selected .child-indicator {
  color: var(--qui-accent-color);
  opacity: 1;
  filter: drop-shadow(0 0 3px var(--qui-accent-glow));
}

.column-loading, .column-error, .empty-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  color: var(--qui-text-secondary);
  height: 150px;
  font-size: var(--qui-font-size-small);
  text-align: center;
  gap: 12px;
}

.column-error svg, .empty-message svg {
  opacity: 0.6;
  margin-bottom: 4px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--qui-accent-bg-faint);
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 8px;
}

.retry-button {
  margin-top: 8px;
  padding: 6px 12px;
  background: var(--qui-overlay-primary);
  border: 1px solid var(--qui-hover-border);
  border-radius: 16px;
  color: var(--qui-text-primary);
  cursor: pointer;
  font-size: var(--qui-font-size-small);
  transition: all 0.2s var(--qui-animation-bounce);
}

.retry-button:hover {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  transform: translateY(-1px);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
