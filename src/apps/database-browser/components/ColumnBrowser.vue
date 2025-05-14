<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useDataStore } from '@/stores/data';
import type { Entity, EntityId } from '@/core/data/types';
import EntityColumn from './EntityColumn.vue';
import { v4 as uuidv4 } from 'uuid';

const props = defineProps<{
  selectedEntityId?: EntityId | null;
}>();

const emit = defineEmits<{
  (e: 'entity-select', entityId: EntityId): void;
}>();

const columns = ref<{ id: string; parentId?: EntityId; selectedId?: EntityId }[]>([]);

// Initialize with root column
onMounted(async () => {
  if (!columns.value.length) {
    columns.value = [
      { 
        id: uuidv4(),
      }
    ];
  }
});

// Watch for external selection changes
watch(() => props.selectedEntityId, (newId) => {
  if (!newId) return;
  
  // Find if the entity is already in our column structure
  let found = false;
  let parentEntityId: EntityId | null = null;
  
  for (const column of columns.value) {
    if (column.selectedId === newId) {
      found = true;
      break;
    }
    // Track the last selected ID as potential parent
    parentEntityId = column.selectedId || null;
  }
  
  if (!found && parentEntityId) {
    // Add a new column with this entity as its parent
    handleEntitySelect(newId, parentEntityId);
  }
}, { immediate: true });

// Handle the selection of an entity in a column
const handleEntitySelect = async (entityId: EntityId, parentId?: EntityId) => {
  emit('entity-select', entityId);
  
  // Find the column index where this selection occurred
  const columnIndex = columns.value.findIndex(col => col.parentId === parentId);
  if (columnIndex === -1) return;
  
  // Update the selected entity in this column
  columns.value[columnIndex].selectedId = entityId;
  
  // Remove any subsequent columns
  if (columnIndex < columns.value.length - 1) {
    columns.value = columns.value.slice(0, columnIndex + 1);
  }
  
  const columnId = uuidv4();
  columns.value.push({
    id: columnId,
    parentId: entityId
  });
};

// Function to handle column scroll synchronization
const syncColumnScroll = (event: Event) => {
  const target = event.target as HTMLElement;
  const columns = document.querySelectorAll('.entity-column');
  
  // Skip if we're in a smooth scroll animation
  if (target.classList.contains('scrolling-smooth')) return;
  
  // Sync all columns to the same vertical scroll position
  columns.forEach(column => {
    if (column !== target && Math.abs(column.scrollTop - target.scrollTop) > 1) {
      column.scrollTop = target.scrollTop;
    }
  });
};
</script>

<template>
  <div class="column-browser">
    <EntityColumn
      v-for="column in columns"
      :key="column.id"
      :column-id="column.id"
      :parent-id="column.parentId"
      :selected-id="column.selectedId"
      @entity-select="handleEntitySelect($event, column.parentId)"
      @scroll="syncColumnScroll"
    />
  </div>
</template>

<style scoped>
.column-browser {
  display: flex;
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  height: 100%;
  background: var(--qui-bg-secondary);
  border-right: 1px solid var(--qui-hover-border);
  box-shadow: inset -5px 0 10px -5px rgba(0, 0, 0, 0.1);
  
  /* Custom scrollbar for horizontal scrolling */
  scrollbar-width: thin;
  scrollbar-color: var(--qui-scrollbar-thumb) var(--qui-scrollbar-track);
}

/* WebKit scrollbars */
.column-browser::-webkit-scrollbar {
  height: 6px;
}

.column-browser::-webkit-scrollbar-track {
  background: var(--qui-scrollbar-track);
}

.column-browser::-webkit-scrollbar-thumb {
  background: var(--qui-scrollbar-thumb);
  border-radius: 4px;
}

.column-browser::-webkit-scrollbar-thumb:hover {
  background: var(--qui-scrollbar-thumb-hover);
}
</style>
