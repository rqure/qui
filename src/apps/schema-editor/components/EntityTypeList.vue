<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import { EntityType } from '@/core/data/types';

const props = defineProps<{
  selectedType: EntityType | null;
}>();

const emit = defineEmits<{
  (e: 'select', entityType: EntityType): void;
}>();

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const entityTypes = ref<EntityType[]>([]);
const searchQuery = ref('');

// Load entity types on component mount
onMounted(async () => {
  await loadEntityTypes();
});

// Filter entity types based on search query
const filteredEntityTypes = computed(() => {
  if (!searchQuery.value) {
    return entityTypes.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return entityTypes.value.filter(type => 
    type.toLowerCase().includes(query)
  );
});

async function loadEntityTypes() {
  try {
    loading.value = true;
    error.value = null;
    
    // Load all entity types
    const result = await dataStore.getEntityTypes(1000, 0);
    
    if (!result || !result.entityTypes) {
      entityTypes.value = [];
      console.error('No entityTypes property in the response:', result);
      error.value = 'Failed to load entity types: Invalid response format';
      loading.value = false;
      return;
    }
    
    // Sort alphabetically
    entityTypes.value = result.entityTypes.sort((a, b) => a.localeCompare(b));
    
    // If there is a cursor and more types to load, load them
    if (result.cursor > 0) {
      let cursor = result.cursor;
      
      while (cursor > 0) {
        const moreResults = await dataStore.getEntityTypes(1000, cursor);
        if (!moreResults || !moreResults.entityTypes || moreResults.entityTypes.length === 0) {
          break;
        }
        
        entityTypes.value = [...entityTypes.value, ...moreResults.entityTypes].sort((a, b) => a.localeCompare(b));
        
        if (moreResults.cursor <= 0) {
          break;
        }
        
        cursor = moreResults.cursor;
      }
    }
    
    console.log(`Loaded ${entityTypes.value.length} entity types`);
    loading.value = false;
  } catch (err) {
    console.error('Failed to load entity types:', err);
    error.value = 'Failed to load entity types: ' + (err instanceof Error ? err.message : String(err));
    loading.value = false;
  }
}

function selectEntityType(entityType: EntityType) {
  emit('select', entityType);
}

// Watch for changes to refresh the list
watch(() => props.selectedType, (newValue, oldValue) => {
  // If we just created a new entity type, refresh the list
  if (newValue && !oldValue) {
    loadEntityTypes();
  }
});
</script>

<template>
  <div class="entity-type-list">
    <div class="search-container">
      <div class="search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
      </div>
      <input 
        type="text" 
        class="search-input" 
        placeholder="Search entity types..." 
        v-model="searchQuery"
      />
      <div v-if="searchQuery" class="search-clear" @click="searchQuery = ''">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
    </div>
    
    <div v-if="loading" class="list-loading">
      <div class="spinner"></div>
      <span>Loading entity types...</span>
    </div>
    
    <div v-else-if="error" class="list-error">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
      <span>{{ error }}</span>
      <button @click="loadEntityTypes" class="retry-button">Retry</button>
    </div>
    
    <div v-else-if="filteredEntityTypes.length === 0" class="empty-list">
      <div v-if="searchQuery" class="no-results">
        <span>No entity types match "{{ searchQuery }}"</span>
      </div>
      <div v-else class="no-types">
        <span>No entity types found</span>
      </div>
    </div>
    
    <div v-else class="type-list-container">
      <div 
        v-for="entityType in filteredEntityTypes" 
        :key="entityType"
        class="type-item"
        :class="{ 'selected': entityType === selectedType }"
        @click="selectEntityType(entityType)"
      >
        <div class="type-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
        </div>
        <div class="type-name">{{ entityType }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-type-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-container {
  position: relative;
  padding: 12px 16px;
  border-bottom: 1px solid var(--qui-hover-border);
}

.search-input {
  width: 100%;
  padding: 8px 12px 8px 32px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--qui-hover-border);
  border-radius: 16px;
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
}

.search-input:focus {
  outline: none;
  border-color: #9c27b0;
  box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
}

.search-icon {
  position: absolute;
  left: 26px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

.search-clear {
  position: absolute;
  right: 26px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--qui-text-secondary);
  opacity: 0.7;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.search-clear:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.2);
}

.type-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
  
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.type-list-container::-webkit-scrollbar {
  width: 6px;
}

.type-list-container::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.type-list-container::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 3px;
}

.type-list-container::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.type-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 10px;
  border-left: 3px solid transparent;
}

.type-item:hover {
  background: rgba(156, 39, 176, 0.1);
}

.type-item.selected {
  background: rgba(156, 39, 176, 0.2);
  border-left-color: #9c27b0;
}

.type-icon {
  color: #9c27b0;
  opacity: 0.7;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-item.selected .type-icon {
  opacity: 1;
}

.type-name {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.list-loading, .list-error, .empty-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--qui-text-secondary);
  font-size: var(--qui-font-size-small);
  text-align: center;
  padding: 20px;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid rgba(156, 39, 176, 0.1);
  border-top-color: #9c27b0;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 12px;
}

.list-error svg {
  color: var(--qui-danger-color);
  margin-bottom: 8px;
}

.retry-button {
  margin-top: 12px;
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
  background: #9c27b0;
  color: white;
  transform: translateY(-1px);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
