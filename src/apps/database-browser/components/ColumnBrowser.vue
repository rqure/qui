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

// Add drop handling functionality
const isDropTarget = ref(false);

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

  // Set up event listeners for cross-window entity navigation
  window.addEventListener('entity:navigate', handleEntityNavigation);
  
  // Clean up on unmount
  onUnmounted(() => {
    window.removeEventListener('entity:navigate', handleEntityNavigation);
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

// Handle the global entity navigation event
function handleEntityNavigation(event: Event) {
  const customEvent = event as CustomEvent;
  if (customEvent.detail?.entityId) {
    navigateToEntity(customEvent.detail.entityId);
  }
}

// Function to navigate to an entity by ID
async function navigateToEntity(entityId: EntityId) {
  try {
    // First, check if entity exists
    const exists = await dataStore.entityExists(entityId);
    if (!exists) {
      console.warn(`Entity ${entityId} does not exist`);
      return;
    }
    
    // Select the entity
    emit('entity-select', entityId);
  } catch (error) {
    console.error('Error navigating to entity:', error);
  }
}

// Handle drop event when an entity is dropped onto the browser
function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDropTarget.value = false;
  
  if (!event.dataTransfer) return;
  
  // Check for our custom entity ID data
  const entityId = event.dataTransfer.getData('application/x-entity-id');
  if (entityId) {
    navigateToEntity(entityId);
  }
}

// Show drop target indicator when dragging over
function handleDragOver(event: DragEvent) {
  // Only accept our specific data type
  if (event.dataTransfer?.types.includes('application/x-entity-id')) {
    event.preventDefault();
    isDropTarget.value = true;
    
    // Set the visual feedback for drop
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'link';
    }
  }
}

// Clear drop target when leaving
function handleDragLeave() {
  isDropTarget.value = false;
}
</script>

<template>
  <div 
    class="column-browser" 
    ref="columnBrowserRef"
    :class="{ 'drop-target': isDropTarget }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
  >
    <!-- Overlay for drop zone indication -->
    <div v-if="isDropTarget" class="drop-zone-overlay">
      <div class="drop-zone-message">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
        </svg>
        <span>Drop to navigate</span>
      </div>
    </div>
    
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
      >
        <div class="resize-handle-dots">
          <span></span>
          <span></span>
        </div>
      </div>
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
  box-shadow: inset 0 5px 10px -5px rgba(0, 0, 0, 0.15);
  
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
  box-shadow: 1px 0 3px rgba(0, 0, 0, 0.1);
}

.column-container.is-resizing * {
  user-select: none;
  pointer-events: none;
}

.column-resize-handle {
  width: 10px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  position: absolute;
  right: 0;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s ease;
}

.resize-handle-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 16px;
  opacity: 0.4;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.resize-handle-dots span {
  width: 3px;
  height: 3px;
  background-color: var(--qui-accent-color);
  border-radius: 50%;
  margin: 2px 0;
}

.column-resize-handle:hover {
  background: var(--qui-accent-bg-faint);
}

.column-resize-handle:hover .resize-handle-dots {
  opacity: 0.8;
  transform: scaleY(1.2);
}

.column-resize-handle:active {
  background: var(--qui-accent-bg-light);
}

.column-resize-handle:active .resize-handle-dots {
  opacity: 1;
}

/* Make sure the resize handles still work when the parent is resizing */
.column-container:not(.is-resizing) .column-resize-handle {
  pointer-events: auto;
}

/* Drop target styling */
.column-browser.drop-target {
  outline: 2px dashed var(--qui-accent-color);
  outline-offset: -2px;
  background-color: rgba(0, 255, 136, 0.05);
}

.drop-zone-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  pointer-events: none;
}

.drop-zone-message {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 20px;
  border-radius: 8px;
  background: var(--qui-bg-primary);
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
  color: var(--qui-accent-color);
}

.drop-zone-message svg {
  width: 48px;
  height: 48px;
  filter: drop-shadow(0 0 5px var(--qui-accent-glow));
}
</style>
