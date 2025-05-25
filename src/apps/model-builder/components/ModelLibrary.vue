<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useDataStore } from '@/stores/data';
import type { EntityId } from '@/core/data/types';
import { ValueType } from '@/core/data/types';

const emit = defineEmits<{
  (e: 'select-model', modelId: EntityId): void;
}>();

const dataStore = useDataStore();
const loading = ref(true);
const error = ref<string | null>(null);
const models = ref<{ id: EntityId; name: string; thumbnail?: string; lastModified?: Date }[]>([]);
const searchQuery = ref('');

// Load all models from the server
async function loadModels() {
  loading.value = true;
  error.value = null;
  models.value = [];
  
  try {
    // Find all UIModel entities
    const modelEntities = await dataStore.find("UIModel");
    
    // Process each model entity
    for (const entity of modelEntities) {
      // Read the name field
      const nameField = entity.field("Name");
      await dataStore.read([nameField]);
      const name = nameField.value.getString() || 'Untitled Model';
      
      // Get the last modified timestamp
      const modifiedField = entity.field("LastModified");
      await dataStore.read([modifiedField]);
      const lastModified = modifiedField.value.type === ValueType.Timestamp 
        ? modifiedField.value.getTimestamp()
        : undefined;
      
      // Try to get thumbnail if available
      let thumbnail: string | undefined;
      try {
        const thumbnailField = entity.field("Thumbnail");
        await dataStore.read([thumbnailField]);
        if (thumbnailField.value && thumbnailField.value.type === ValueType.BinaryFile) {
          thumbnail = thumbnailField.value.getBinaryFile();
        }
      } catch (e) {
        console.warn(`No thumbnail for model ${entity.entityId}`);
      }
      
      // Add to models list
      models.value.push({
        id: entity.entityId,
        name,
        lastModified,
        thumbnail
      });
    }
    
    loading.value = false;
  } catch (err) {
    error.value = 'Failed to load models: ' + (err as Error).message;
    loading.value = false;
  }
}

// Handle model selection
const selectModel = (modelId: EntityId) => {
  emit('select-model', modelId);
};

// Filter models by search query
const filteredModels = computed(() => {
  if (!searchQuery.value) {
    return models.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  return models.value.filter(model => 
    model.name.toLowerCase().includes(query)
  );
});

// Format a date in a readable format
const formatDate = (date?: Date): string => {
  if (!date) return 'Unknown';
  
  // Format the date in a user-friendly way
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  
  if (dateOnly.getTime() === today.getTime()) {
    // Today, show time only
    return `Today at ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  } else if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) {
    // Within the last week
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } else {
    // Older dates
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }
};

// Initialize component
onMounted(() => {
  loadModels();
});
</script>

<template>
  <div class="model-library">
    <!-- Search input -->
    <div class="mb-search-container">
      <div class="mb-search-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M9.5,3A6.5,6.5 0 0,1 16,9.5C16,11.11 15.41,12.59 14.44,13.73L14.71,14H15.5L20.5,19L19,20.5L14,15.5V14.71L13.73,14.44C12.59,15.41 11.11,16 9.5,16A6.5,6.5 0 0,1 3,9.5A6.5,6.5 0 0,1 9.5,3M9.5,5C7,5 5,7 5,9.5C5,12 7,14 9.5,14C12,14 14,12 14,9.5C14,7 12,5 9.5,5Z" />
        </svg>
      </div>
      <input 
        type="text" 
        class="mb-search-input"
        placeholder="Search models..."
        v-model="searchQuery"
      >
      <div 
        v-if="searchQuery" 
        class="mb-search-clear"
        @click="searchQuery = ''"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
        </svg>
      </div>
    </div>
    
    <!-- Loading state -->
    <div v-if="loading" class="library-loading">
      <div class="mb-spinner"></div>
      <span>Loading models...</span>
    </div>
    
    <!-- Error state -->
    <div v-else-if="error" class="library-error">
      <span>{{ error }}</span>
      <button class="mb-button" @click="loadModels">Retry</button>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="models.length === 0" class="library-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24">
        <path fill="#666" d="M15,5.5L15,9.5L12.5,6.5L9.5,10L7.5,7.5L4,12L6,12L7.5,10L9.5,12.5L13,8L15,10.5L15,14.5L19,14.5L19,5.5L15,5.5M5,15L4,16L4,20L8,20L9,19L19,19L20,18L20,15L5,15M8,17A1,1 0 0,1 9,18A1,1 0 0,1 8,19A1,1 0 0,1 7,18A1,1 0 0,1 8,17Z" />
      </svg>
      <span>No models found</span>
      <p>Create a new model to get started.</p>
    </div>
    
    <!-- Model list -->
    <div v-else class="model-list mb-custom-scrollbar">
      <div 
        v-for="model in filteredModels" 
        :key="model.id"
        class="model-item"
        @click="selectModel(model.id)"
      >
        <!-- Model thumbnail -->
        <div class="model-thumbnail">
          <img 
            v-if="model.thumbnail" 
            :src="model.thumbnail" 
            alt="Model thumbnail" 
            class="thumbnail-image"
          >
          <div v-else class="thumbnail-placeholder">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
              <path fill="currentColor" d="M15,5.5L15,9.5L12.5,6.5L9.5,10L7.5,7.5L4,12L6,12L7.5,10L9.5,12.5L13,8L15,10.5L15,14.5L19,14.5L19,5.5L15,5.5M5,15L4,16L4,20L8,20L9,19L19,19L20,18L20,15L5,15M8,17A1,1 0 0,1 9,18A1,1 0 0,1 8,19A1,1 0 0,1 7,18A1,1 0 0,1 8,17Z" />
            </svg>
          </div>
        </div>
        
        <!-- Model info -->
        <div class="model-info">
          <div class="model-name">{{ model.name }}</div>
          <div class="model-date">{{ formatDate(model.lastModified) }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.model-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  gap: 12px;
}

.library-loading,
.library-error,
.library-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--qui-text-secondary);
}

.library-empty {
  color: #666;
}

.library-empty svg {
  margin-bottom: 12px;
}

.library-empty p {
  margin: 0;
  font-size: var(--qui-font-size-small);
}

.model-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding-right: 4px;
}

.model-item {
  display: flex;
  background: var(--qui-bg-primary);
  border-radius: 6px;
  border: 1px solid var(--qui-hover-border);
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s var(--qui-animation-bounce);
}

.model-item:hover {
  transform: translateY(-2px);
  border-color: var(--qui-accent-color);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.model-thumbnail {
  width: 80px;
  height: 80px;
  background: var(--qui-bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border-right: 1px solid var(--qui-hover-border);
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--qui-text-secondary);
  background: rgba(0, 0, 0, 0.2);
}

.model-info {
  padding: 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  flex: 1;
}

.model-name {
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
}

.model-date {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}
</style>
