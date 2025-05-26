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
    const result = await dataStore.getAllEntityTypes() || [];
    
    // Sort alphabetically
    entityTypes.value = result.sort((a, b) => a.localeCompare(b));
    
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
  overflow: hidden;
  width: 100%;
  position: relative;
  box-sizing: border-box;
}

.search-container {
  padding: 12px 16px;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.search-input-wrapper {
  position: relative;
  width: 100%;
  box-sizing: border-box;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border-radius: 20px;
  transition: all 0.2s ease;
  overflow: hidden;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--qui-text-secondary);
  opacity: 0.7;
  z-index: 1;
  transition: color 0.2s ease;
}

.search-input-wrapper:focus-within .search-icon {
  color: var(--qui-accent-color);
  opacity: 1;
}

.search-input {
  width: 100%;
  height: 32px; /* Consistent height */
  padding: 0 32px 0 32px; /* Adjusted for icon */
  border-radius: 16px; /* Keep the pill shape but smaller */
  border: 1px solid var(--qui-hover-border);
  background: var(--qui-bg-primary);
  color: var(--qui-text-primary);
  font-size: var(--qui-font-size-small);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: var(--qui-accent-color);
}

.search-clear {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--qui-overlay-primary);
  color: var(--qui-text-secondary);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 1;
}

.search-clear:hover {
  background: var(--qui-overlay-secondary);
  color: var(--qui-text-primary);
  transform: translateY(-50%) scale(1.05);
}

.search-clear:active {
  transform: translateY(-50%) scale(0.95);
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
  gap: 16px;
  max-width: 240px;
  animation: fade-in 0.3s ease-out;
}

.spinner {
  width: 36px;
  height: 36px;
  border: 3px solid var(--qui-overlay-accent);
  border-top-color: var(--qui-accent-color);
  border-radius: 50%;
  animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.05);
}

.error-state {
  color: var(--qui-danger-color);
}

.error-state svg {
  filter: drop-shadow(0 2px 5px rgba(244, 67, 54, 0.3));
  animation: pulse 2s ease-in-out infinite;
}

.retry-button, .clear-button {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 6px 12px; /* Smaller padding */
  border-radius: 4px; /* Consistent border radius */
  background: var(--qui-overlay-primary);
  color: var(--qui-text-primary);
  border: 1px solid var(--qui-hover-border);
  font-size: var(--qui-font-size-small);
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: 28px; /* Smaller height */
}

.retry-button:hover, .clear-button:hover {
  background: var(--qui-overlay-secondary);
  transform: translateY(-2px);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
}

.retry-button:active, .clear-button:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.entity-types-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fade-in 0.3s ease-out;
  width: 100%;
  box-sizing: border-box;
}

.entity-count {
  padding: 8px 16px;
  font-size: 11px;
  color: var(--qui-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: var(--qui-overlay-primary);
  border-top: 1px solid var(--qui-hover-border);
  border-bottom: 1px solid var(--qui-hover-border);
}

.entity-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 8px 16px;
  box-sizing: border-box;
  width: 100%;
  
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
  padding: 12px 16px;
  margin: 4px 0;
  gap: 12px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 8px;
  border-left: 3px solid transparent;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.entity-item:hover {
  background: var(--qui-overlay-primary);
  transform: translateX(2px);
}

.entity-item.selected {
  background: var(--qui-accent-color);
  color: var(--qui-bg-primary);
  border-left-color: var(--qui-accent-deep);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  font-weight: var(--qui-font-weight-medium);
}

.entity-item.selected:hover {
  background: var(--qui-accent-secondary);
}

.entity-item.selected::after {
  content: '';
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  animation: pulse 2s infinite;
}

.entity-item.selected .entity-name {
  font-weight: 500;
  color: var(--qui-bg-primary);
  letter-spacing: 0.2px;
}

.entity-item.selected .entity-icon {
  opacity: 1;
  background: rgba(255, 255, 255, 0.3);
  color: var(--qui-bg-primary);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
}

/* ...existing code... */

.entity-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  color: var(--qui-accent-color);
  opacity: 0.8;
  background: var(--qui-overlay-primary);
  transition: all 0.3s ease;
}

.entity-item:hover .entity-icon {
  transform: rotate(-5deg) scale(1.05);
  background: var(--qui-overlay-accent);
}

.entity-item.selected .entity-icon {
  opacity: 1;
  background: rgba(255, 255, 255, 0.3);
  color: var(--qui-bg-primary);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.2);
  transform: rotate(0) scale(1);
}

.entity-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--qui-font-size-base);
  font-weight: 400;
  transition: all 0.2s ease;
  min-width: 0; /* This helps with text overflow */
}

.entity-item.selected .entity-name {
  font-weight: 500;
  letter-spacing: 0.2px;
}

.empty-state svg {
  opacity: 0.5;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.1));
  transition: all 0.3s ease;
}

.empty-state:hover svg {
  opacity: 0.7;
  transform: scale(1.05);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 768px) {
  .entity-item {
    padding: 12px 8px;
  }
  
  .entity-icon {
    width: 28px;
    height: 28px;
  }

  .search-container {
    padding: 8px 12px;
  }
  
  .search-input-wrapper {
    margin: 0;
    max-width: 100%;
  }
}
</style>
