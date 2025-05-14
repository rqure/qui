<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';
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

const columns = ref<{ id: string; parentId?: EntityId; selectedId?: EntityId; width?: number }[]>([]);
const isResizing = ref(false);
const resizingColumnId = ref<string | null>(null);
const startX = ref(0);
const startWidth = ref(0);
const minColumnWidth = 150; // Minimum column width in pixels
const maxColumnWidth = 400; // Maximum column width in pixels

// Store the last used column width to apply to new columns
const lastUsedWidth = ref<number>(220); // Default starting width
const columnBrowserRef = ref<HTMLElement | null>(null);

// Initialize with root column
onMounted(async () => {
  if (!columns.value.length) {
    columns.value = [
      { 
        id: uuidv4(),
        width: 220 // Default width
      }
    ];
  }
  
  // Add global event listeners for resizing
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  
  // Remove event listeners when component is unmounted
  onUnmounted(() => {
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  });
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
  
  // Before removing columns, update our lastUsedWidth with the width of the last column
  if (columnIndex < columns.value.length - 1) {
    const lastColumn = columns.value[columns.value.length - 1];
    if (lastColumn.width) {
      lastUsedWidth.value = lastColumn.width;
    }
    
    // Remove any subsequent columns
    columns.value = columns.value.slice(0, columnIndex + 1);
  }
  
  const columnId = uuidv4();
  columns.value.push({
    id: columnId,
    parentId: entityId,
    width: lastUsedWidth.value // Use the last used width for consistency
  });
  
  // After adding a new column, scroll to the end
  setTimeout(() => {
    scrollToEnd();
  }, 50); // Short delay to ensure the DOM is updated
};

// Function to scroll to the end of the column browser
function scrollToEnd() {
  if (columnBrowserRef.value) {
    columnBrowserRef.value.scrollLeft = columnBrowserRef.value.scrollWidth;
  }
}

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

// Start column resize
function startResize(event: MouseEvent, columnId: string) {
  // Prevent text selection during resize
  event.preventDefault();
  
  const column = columns.value.find(col => col.id === columnId);
  if (!column) return;
  
  isResizing.value = true;
  resizingColumnId.value = columnId;
  startX.value = event.clientX;
  
  // Find the actual DOM element to get its current width
  const columnEl = document.querySelector(`.entity-column[data-column-id="${columnId}"]`) as HTMLElement;
  if (columnEl) {
    startWidth.value = columnEl.offsetWidth;
  } else {
    startWidth.value = column.width || 220;
  }
}

// Handle mouse movement during resize
function handleMouseMove(event: MouseEvent) {
  if (!isResizing.value || !resizingColumnId.value) return;
  
  const deltaX = event.clientX - startX.value;
  const newWidth = Math.max(minColumnWidth, Math.min(maxColumnWidth, startWidth.value + deltaX));
  
  // Update the column width in our state
  const columnIndex = columns.value.findIndex(col => col.id === resizingColumnId.value);
  if (columnIndex !== -1) {
    columns.value[columnIndex].width = newWidth;
  }
}

// End column resize
function handleMouseUp() {
  isResizing.value = false;
  resizingColumnId.value = null;
}

// Helper function to get column style based on its width
function getColumnStyle(column: { id: string; width?: number }) {
  if (column.width) {
    return {
      width: `${column.width}px`,
      minWidth: `${column.width}px`,
      maxWidth: `${column.width}px`
    };
  }
  return {};
}
</script>

<template>
  <div class="column-browser" ref="columnBrowserRef">
    <div 
      v-for="(column, index) in columns" 
      :key="column.id"
      class="column-container"
      :class="{ 'is-resizing': isResizing && resizingColumnId === column.id }"
    >
      <EntityColumn
        :column-id="column.id"
        :parent-id="column.parentId"
        :selected-id="column.selectedId"
        :style="getColumnStyle(column)"
        @entity-select="handleEntitySelect($event, column.parentId)"
        @scroll="syncColumnScroll"
      />
      
      <!-- Add resize handle after each column except the last -->
      <div 
        v-if="index < columns.length - 1"
        class="column-resize-handle"
        @mousedown="startResize($event, column.id)"
      ></div>
    </div>
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

.column-container {
  display: flex;
  position: relative;
  height: 100%;
}

.column-container.is-resizing * {
  user-select: none;
  pointer-events: none;
}

.column-resize-handle {
  width: 5px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 10;
}

.column-resize-handle:hover,
.column-resize-handle:active {
  background: rgba(0, 255, 136, 0.2);
}

/* Make sure the resize handles still work when the parent is resizing */
.column-container:not(.is-resizing) .column-resize-handle {
  pointer-events: auto;
}
</style>
