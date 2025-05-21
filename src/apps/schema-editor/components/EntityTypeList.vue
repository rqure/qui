<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityType } from '@/core/data/types';

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
    
    // Check if there are more results to load (using nextCursor instead of cursor)
    if (result.nextCursor > 0) {
      // Convert bigint to number for pagination
      let cursor = Number(result.nextCursor);
      
      while (cursor > 0) {
        const moreResults = await dataStore.getEntityTypes(1000, cursor);
        if (!moreResults || !moreResults.entityTypes || moreResults.entityTypes.length === 0) {
          break;
        }
        
        entityTypes.value = [...entityTypes.value, ...moreResults.entityTypes].sort((a, b) => a.localeCompare(b));
        
        // Check if there are more results to load
        if (!moreResults.nextCursor || moreResults.nextCursor <= 0) {
          break;
        }
        
        // Convert bigint to number for the next iteration
        cursor = Number(moreResults.nextCursor);
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
      <div class="search-input-wrapper">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" class="search-icon">
          <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        <input 
          type="text" 
          class="search-input" 
          placeholder="Search entity types..." 
          v-model="searchQuery"
        />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''" title="Clear search">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
    </div>
    
    <!-- Loading state -->
    <div v-if="loading" class="list-state-container">
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading entity types...</p>
      </div>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="list-state-container">
      <div class="error-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
        <p>{{ error }}</p>
        <button @click="loadEntityTypes" class="retry-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
            <path fill="currentColor" d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Try Again
        </button>
      </div>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="filteredEntityTypes.length === 0" class="list-state-container">
      <div class="empty-state">
        <div v-if="searchQuery">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <path fill="currentColor" d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <p>No results for "{{ searchQuery }}"</p>
          <button @click="searchQuery = ''" class="clear-button">Clear Search</button>
        </div>
        <div v-else>
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
            <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
          <p>No entity types found</p>
        </div>
      </div>
    </div>
    
    <!-- Entity types list -->
    <div v-else class="entity-types-container">
      <div v-if="filteredEntityTypes.length > 0" class="entity-count">
        {{ filteredEntityTypes.length }} {{ filteredEntityTypes.length === 1 ? 'entity type' : 'entity types' }}
      </div>
      
      <div class="entity-list">
        <div 
          v-for="entityType in filteredEntityTypes" 
          :key="entityType"
          class="entity-item"
          :class="{ 'selected': entityType === selectedType }"
          @click="selectEntityType(entityType)"
        >
          <div class="entity-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
            </svg>
          </div>
          <div class="entity-name">{{ entityType }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.entity-type-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--qui-bg-secondary);
}

.search-input-wrapper {
  position: relative;
  margin: 12px 16px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

.search-input {
  width: 100%;
  height: 36px;
  padding: 0 36px 0 36px;
  border-radius: 18px;
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 0 2px var(--qui-overlay-accent);
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-clear:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-primary);
}

.list-state-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.loading-state, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  color: var(--qui-text-secondary);
  gap: 12px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 2px solid var(--qui-overlay-accent);
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.error-state {
  color: var(--qui-danger-color);
}

.retry-button, .clear-button {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 12px;
  border-radius: 16px;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all 0.2s ease;
}

.retry-button:hover, .clear-button:hover {
  background: var(--qui-overlay-secondary);
  transform: translateY(-1px);
}

.entity-types-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.entity-count {
  padding: 8px 16px;
  font-size: 11px;
  color: var(--qui-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.entity-list {
  flex: 1;
  overflow-y: auto;
  padding-bottom: 16px;
  
  /* Scrollbar styling */
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

.entity-list::-webkit-scrollbar {
  width: 4px;
}

.entity-list::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.entity-list::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 2px;
}

.entity-list::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}

.entity-item {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  gap: 12px;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.1s ease;
  border-left: 3px solid transparent;
}

.entity-item:hover {
  background: var(--qui-overlay-primary);
}

.entity-item.selected {
  background: var(--qui-overlay-accent);
  border-left-color: var(--qui-accent-color);
}

.entity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--qui-accent-color);
  opacity: 0.8;
}

.entity-item.selected .entity-icon {
  opacity: 1;
}

.entity-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--qui-font-size-base);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
