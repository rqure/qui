<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { CSSProperties } from 'vue';
import type { ModelComponent } from '../types';
import ModelComponentRenderer from './ModelComponentRenderer.vue';
import { useZoom } from '../composables/useZoom';
import { usePanning } from '../composables/usePanning';
import { useMultiSelect } from '../composables/useMultiSelect';
import { useCanvasShortcuts } from '../composables/useCanvasShortcuts';
import { useComponentSelection } from '../composables/useComponentSelection';
import { useClipboard } from '../composables/useClipboard';
import { useKeyboardShortcuts } from '../composables/useKeyboardShortcuts';

const props = defineProps<{
  model: { 
    components: ModelComponent[];
    width: number;
    height: number;
  };
  selectedComponent: ModelComponent | null;
}>();

const emit = defineEmits<{
  (e: 'select-component', component: ModelComponent | null): void;
  (e: 'update-component', component: ModelComponent): void;
  (e: 'add-component', type: string, x: number, y: number): void;
  (e: 'delete-components', componentIds: string[]): void;
  (e: 'paste-components', components: ModelComponent[]): void;
}>();

// Canvas ref and state
const canvasRef = ref<HTMLDivElement | null>(null);
const canvasWrapperRef = ref<HTMLDivElement | null>(null);
const dragGhost = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);
const isResizing = ref(false);
const draggedComponent = ref<ModelComponent | null>(null);
const resizeDirection = ref('');

// Set up zoom functionality
const { zoomLevel, updateZoom, resetZoom, handleWheel } = useZoom(0.25, 3, 1);

// Set up panning
const { isPanning, canvasOffset, startPan, updatePan, endPan } = usePanning();

// Set up multi-select
const { 
  selectedComponents, 
  selectionRect, 
  isSelecting, 
  hasSelection,
  startSelection, 
  updateSelection, 
  endSelection,
  clearSelection 
} = useMultiSelect();

// Set up component selection
const { 
  selectComponent, 
  deselectComponent,
  isSelected,
  getSelectedComponents
} = useComponentSelection();

// Set up clipboard
const { copyComponents, pasteComponents, canPaste } = useClipboard();

// Drag state
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartLeft = ref(0);
const dragStartTop = ref(0);
const dragStartWidth = ref(0);
const dragStartHeight = ref(0);

// Mouse position relative to canvas
const mousePosition = ref({ x: 0, y: 0 });

// Update mouse position for pasting
function updateMousePosition(event: MouseEvent) {
  if (!canvasRef.value) return;
  
  const rect = canvasRef.value.getBoundingClientRect();
  mousePosition.value = {
    x: (event.clientX - rect.left - canvasOffset.value.x) / zoomLevel.value,
    y: (event.clientY - rect.top - canvasOffset.value.y) / zoomLevel.value
  };
}

// Computed styles
const canvasStyle = computed<CSSProperties>(() => ({
  transform: `scale(${zoomLevel.value})`,
  transformOrigin: '0 0',
  width: `${props.model.width}px`,
  height: `${props.model.height}px`,
  position: 'relative',
  backgroundColor: 'var(--mb-bg-canvas)',
  overflow: 'hidden',
  transition: isPanning.value ? 'none' : 'transform 0.1s ease',
  left: `${canvasOffset.value.x}px`,
  top: `${canvasOffset.value.y}px`
}));

const wrapperStyle = computed<CSSProperties>(() => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  cursor: isPanning.value ? 'grabbing' : 'default'
}));

// Sort components by z-index
const sortedComponents = computed(() => {
  return [...props.model.components].sort((a, b) => (a.z || 0) - (b.z || 0));
});

// Handle canvas click to deselect components
function handleCanvasClick(event: MouseEvent) {
  if (event.target === canvasRef.value && !isSelecting.value) {
    emit('select-component', null);
    clearSelection();
  }
}

// Handle drag over for new component drops
function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer!.dropEffect = 'copy';
}

// Handle drop of new components
function handleDrop(event: DragEvent) {
  event.preventDefault();
  const componentType = event.dataTransfer?.getData('application/x-model-component-type');
  if (componentType && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    const x = (event.clientX - rect.left - canvasOffset.value.x) / zoomLevel.value;
    const y = (event.clientY - rect.top - canvasOffset.value.y) / zoomLevel.value;
    emit('add-component', componentType, x, y);
  }
}

// Handle component selection
function handleSelectComponent(component: ModelComponent, additive = false) {
  if (!isResizing.value) {
    emit('select-component', component);
    selectComponent(component, additive);
  }
}

// Handle mouse down on canvas for multi-select
function handleCanvasMouseDown(event: MouseEvent) {
  if (event.button === 0) { // Left click
    if (event.shiftKey) {
      // Start multi-selection
      startSelection(event);
    } else if (event.button === 1 || event.altKey) {
      // Start panning
      startPan(event);
    }
  }
}

// Handle mouse move for multi-select and panning
function handleCanvasMouseMove(event: MouseEvent) {
  updateMousePosition(event);
  
  if (isSelecting.value) {
    updateSelection(event);
  } else if (isPanning.value) {
    updatePan(event);
  }
}

// Handle mouse up for multi-select and panning
function handleCanvasMouseUp(event: MouseEvent) {
  if (isSelecting.value) {
    endSelection(props.model.components);
    // Update selected component to match multi-selection
    const selectedIds = Array.from(selectedComponents.value);
    if (selectedIds.length === 1) {
      const selected = props.model.components.find(c => c.id === selectedIds[0]);
      if (selected) {
        emit('select-component', selected);
      }
    }
  }
  
  if (isPanning.value) {
    endPan();
  }
}

// Handle component drag start
function handleDragStart(event: MouseEvent, component: ModelComponent) {
  if (!canvasRef.value) return;

  isDragging.value = true;
  draggedComponent.value = component;

  // Store initial positions
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartLeft.value = component.x;
  dragStartTop.value = component.y;

  // Show drag ghost
  if (dragGhost.value) {
    dragGhost.value.style.display = 'block';
    dragGhost.value.style.left = `${component.x}px`;
    dragGhost.value.style.top = `${component.y}px`;
    dragGhost.value.style.width = `${component.width}px`;
    dragGhost.value.style.height = `${component.height}px`;
  }

  // Prevent text selection during drag
  event.preventDefault();
  window.addEventListener('mousemove', handleDrag);
  window.addEventListener('mouseup', handleDragEnd);
  
  // If not already selected, select this component
  if (!isSelected(component.id)) {
    handleSelectComponent(component, event.shiftKey);
  }
}

// Handle component dragging
function handleDrag(event: MouseEvent) {
  if (!isDragging.value || !draggedComponent.value) return;

  const deltaX = (event.clientX - dragStartX.value) / zoomLevel.value;
  const deltaY = (event.clientY - dragStartY.value) / zoomLevel.value;

  // Move all selected components if there are multiple selected
  if (selectedComponents.value.size > 1) {
    props.model.components.forEach(component => {
      if (selectedComponents.value.has(component.id)) {
        component.x += deltaX;
        component.y += deltaY;
        emit('update-component', component);
      }
    });
    
    // Update drag start position for the next drag event
    dragStartX.value = event.clientX;
    dragStartY.value = event.clientY;
  } else {
    // Just move the dragged component
    const newX = dragStartLeft.value + deltaX;
    const newY = dragStartTop.value + deltaY;

    // Update ghost position
    if (dragGhost.value) {
      dragGhost.value.style.left = `${newX}px`;
      dragGhost.value.style.top = `${newY}px`;
    }

    // Update component position
    draggedComponent.value.x = newX;
    draggedComponent.value.y = newY;

    emit('update-component', draggedComponent.value);
  }
}

// Handle drag end
function handleDragEnd() {
  isDragging.value = false;
  draggedComponent.value = null;
  isResizing.value = false;
  resizeDirection.value = '';

  if (dragGhost.value) {
    dragGhost.value.style.display = 'none';
  }

  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', handleDragEnd);
}

// Handle keyboard shortcuts
useKeyboardShortcuts({
  onDelete: () => {
    const componentsToDelete = getSelectedComponents();
    if (componentsToDelete.length > 0) {
      emit('delete-components', componentsToDelete);
      clearSelection();
    }
  },
  onCopy: () => {
    const componentsToClone = props.model.components.filter(c => 
      selectedComponents.value.has(c.id)
    );
    copyComponents(componentsToClone);
  },
  onPaste: () => {
    const pastedComponents = pasteComponents({
      x: mousePosition.value.x,
      y: mousePosition.value.y
    });
    if (pastedComponents.length > 0) {
      emit('paste-components', pastedComponents);
    }
  },
  onZoomIn: () => updateZoom(1),
  onZoomOut: () => updateZoom(-1),
  onResetZoom: resetZoom,
  onEscape: () => {
    clearSelection();
    emit('select-component', null);
  }
});

// Set up canvas related event listeners
onMounted(() => {
  if (canvasWrapperRef.value) {
    canvasWrapperRef.value.addEventListener('wheel', handleWheel, { passive: false });
  }
});

onUnmounted(() => {
  if (canvasWrapperRef.value) {
    canvasWrapperRef.value.removeEventListener('wheel', handleWheel);
  }
  window.removeEventListener('mousemove', handleDrag);
  window.removeEventListener('mouseup', handleDragEnd);
});
</script>

<template>
  <div 
    ref="canvasWrapperRef" 
    class="canvas-container"
    :style="wrapperStyle"
    @mousemove="handleCanvasMouseMove"
    @mouseup="handleCanvasMouseUp"
    @mouseleave="endPan"
    @mousemove.passive="updateMousePosition"
  >
    <div 
      ref="canvasRef"
      class="model-canvas mb-canvas"
      :class="{ 'dragging': isDragging, 'panning': isPanning }"
      :style="canvasStyle"
      @click="handleCanvasClick"
      @mousedown="handleCanvasMouseDown"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <ModelComponentRenderer
        v-for="component in sortedComponents"
        :key="component.id"
        :component="component"
        :is-selected="isSelected(component.id)"
        @mousedown="handleDragStart($event, component)"
        @select="handleSelectComponent"
        @update="$emit('update-component', $event)"
      />
      <div ref="dragGhost" class="drag-ghost" />
      
      <!-- Selection rectangle -->
      <div 
        v-if="selectionRect"
        class="selection-rectangle"
        :style="{
          left: `${selectionRect.x}px`,
          top: `${selectionRect.y}px`,
          width: `${selectionRect.width}px`,
          height: `${selectionRect.height}px`
        }"
      ></div>
    </div>
    
    <!-- Zoom controls -->
    <div class="mb-zoom-controls">
      <button class="mb-zoom-button" @click="updateZoom(-1)" title="Zoom out">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
        </svg>
      </button>
      <div class="mb-zoom-value">{{ Math.round(zoomLevel * 100) }}%</div>
      <button class="mb-zoom-button" @click="updateZoom(1)" title="Zoom in">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
        </svg>
      </button>
      <button class="mb-zoom-button" @click="resetZoom()" title="Reset zoom">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M15 3l2.3 2.3-2.89 2.87 1.42 1.42L18.7 6.7 21 9V3h-6zM3 9l2.3-2.3 2.87 2.89 1.42-1.42L6.7 5.3 9 3H3v6zm6 12l-2.3-2.3 2.89-2.87-1.42-1.42L5.3 17.3 3 15v6h6zm12-6l-2.3 2.3-2.87-2.89-1.42 1.42 2.89 2.87L15 21h6v-6z"/>
        </svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: auto;
  background: var(--qui-bg-secondary);
}

.model-canvas {
  margin: 20px auto;
  box-shadow: var(--mb-shadow-lg);
}

.drag-ghost {
  position: absolute;
  display: none;
  border: 2px solid var(--mb-primary);
  background: var(--mb-primary-glow);
  pointer-events: none;
  z-index: 1000;
  border-radius: 4px;
}

.dragging {
  cursor: grabbing;
}

.panning {
  cursor: grabbing;
}

/* Selection rectangle */
.selection-rectangle {
  position: absolute;
  border: 1px dashed var(--mb-primary);
  background: rgba(0, 176, 255, 0.1);
  pointer-events: none;
  z-index: 999;
}

/* Grid background */
.model-canvas::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(to right, var(--qui-border-color) 1px, transparent 1px),
    linear-gradient(to bottom, var(--qui-border-color) 1px, transparent 1px);
  background-size: 20px 20px;
  opacity: 0.1;
  pointer-events: none;
}
</style>