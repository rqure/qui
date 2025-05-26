<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { type ModelComponent } from '../types';
import ModelComponentRenderer from './ModelComponentRenderer.vue';

const props = defineProps<{
  components: ModelComponent[];
  selectedComponent: ModelComponent | null;
  zoomLevel: number;
}>();

const emit = defineEmits<{
  (e: 'select-component', component: ModelComponent | null): void;
}>();

const canvasRef = ref<HTMLElement | null>(null);
const isDragging = ref(false);
const isResizing = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartLeft = ref(0);
const dragStartTop = ref(0);
const dragStartWidth = ref(0);
const dragStartHeight = ref(0);
const resizeDirection = ref('');
const draggedComponent = ref<ModelComponent | null>(null);
const dragGhost = ref<HTMLElement | null>(null);

// Canvas movement and zoom
const canvasPanX = ref(0);
const canvasPanY = ref(0);
const isPanning = ref(false);
const panStartX = ref(0);
const panStartY = ref(0);

// Computed scale factor based on zoom level
const scaleFactor = computed(() => {
  return props.zoomLevel / 100;
});

// Canvas style with transform for panning and zooming
const canvasStyle = computed(() => {
  return {
    transform: `translate(${canvasPanX.value}px, ${canvasPanY.value}px) scale(${scaleFactor.value})`,
    transformOrigin: '0 0'
  };
});

onMounted(() => {
  // Add event listeners for canvas interaction
  if (canvasRef.value) {
    canvasRef.value.addEventListener('wheel', handleCanvasWheel, { passive: false });
  }
  
  // Create drag ghost element for component dragging
  dragGhost.value = document.createElement('div');
  dragGhost.value.className = 'drag-ghost';
  document.body.appendChild(dragGhost.value);
});

// Handle component selection
function selectComponent(component: ModelComponent | null, event: MouseEvent) {
  // Don't trigger selection during drag or resize operations
  if (isDragging.value || isResizing.value) return;
  
  // Stop event propagation to prevent canvas click from deselecting
  event.stopPropagation();
  emit('select-component', component);
}

// Handle canvas click to deselect
function handleCanvasClick() {
  emit('select-component', null);
}

// Handle mouse down on component for drag
function handleComponentMouseDown(event: MouseEvent, component: ModelComponent) {
  // If right click, don't start drag
  if (event.button === 2) return;
  
  // Target element to check if resize handle
  const target = event.target as HTMLElement;
  
  // Check if clicked on a resize handle
  if (target.classList.contains('mb-drag-handle')) {
    startResize(event, component, target.classList[1].split('-').pop() || '');
    return;
  }
  
  // Otherwise start drag
  startDrag(event, component);
}

// Start component drag operation
function startDrag(event: MouseEvent, component: ModelComponent) {
  // Select the component
  emit('select-component', component);
  
  // Set drag state
  isDragging.value = true;
  draggedComponent.value = component;
  
  // Store initial positions
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartLeft.value = component.x;
  dragStartTop.value = component.y;
  
  // Update drag ghost
  if (dragGhost.value) {
    dragGhost.value.style.display = 'block';
    dragGhost.value.style.left = `${event.clientX}px`;
    dragGhost.value.style.top = `${event.clientY}px`;
  }
  
  // Add global event listeners
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

// Start component resize operation
function startResize(event: MouseEvent, component: ModelComponent, direction: string) {
  // Select the component
  emit('select-component', component);
  
  // Set resize state
  isResizing.value = true;
  draggedComponent.value = component;
  resizeDirection.value = direction;
  
  // Store initial positions and dimensions
  dragStartX.value = event.clientX;
  dragStartY.value = event.clientY;
  dragStartLeft.value = component.x;
  dragStartTop.value = component.y;
  dragStartWidth.value = component.width;
  dragStartHeight.value = component.height;
  
  // Add global event listeners
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  
  // Prevent default and stop propagation
  event.preventDefault();
  event.stopPropagation();
}

// Handle mouse move during drag or resize
function handleMouseMove(event: MouseEvent) {
  if (isDragging.value && draggedComponent.value) {
    // Calculate new position, taking into account the canvas zoom and pan
    const deltaX = (event.clientX - dragStartX.value) / scaleFactor.value;
    const deltaY = (event.clientY - dragStartY.value) / scaleFactor.value;
    
    // Update component position
    draggedComponent.value.x = Math.round(dragStartLeft.value + deltaX);
    draggedComponent.value.y = Math.round(dragStartTop.value + deltaY);
    
    // Update drag ghost position
    if (dragGhost.value) {
      dragGhost.value.style.left = `${event.clientX}px`;
      dragGhost.value.style.top = `${event.clientY}px`;
    }
  } else if (isResizing.value && draggedComponent.value) {
    // Calculate deltas considering zoom
    const deltaX = (event.clientX - dragStartX.value) / scaleFactor.value;
    const deltaY = (event.clientY - dragStartY.value) / scaleFactor.value;
    
    // Apply resizing based on direction
    switch(resizeDirection.value) {
      case 'nw':
        draggedComponent.value.x = Math.round(dragStartLeft.value + deltaX);
        draggedComponent.value.y = Math.round(dragStartTop.value + deltaY);
        draggedComponent.value.width = Math.max(10, dragStartWidth.value - deltaX);
        draggedComponent.value.height = Math.max(10, dragStartHeight.value - deltaY);
        break;
      case 'ne':
        draggedComponent.value.y = Math.round(dragStartTop.value + deltaY);
        draggedComponent.value.width = Math.max(10, dragStartWidth.value + deltaX);
        draggedComponent.value.height = Math.max(10, dragStartHeight.value - deltaY);
        break;
      case 'sw':
        draggedComponent.value.x = Math.round(dragStartLeft.value + deltaX);
        draggedComponent.value.width = Math.max(10, dragStartWidth.value - deltaX);
        draggedComponent.value.height = Math.max(10, dragStartHeight.value + deltaY);
        break;
      case 'se':
        draggedComponent.value.width = Math.max(10, dragStartWidth.value + deltaX);
        draggedComponent.value.height = Math.max(10, dragStartHeight.value + deltaY);
        break;
      case 'n':
        draggedComponent.value.y = Math.round(dragStartTop.value + deltaY);
        draggedComponent.value.height = Math.max(10, dragStartHeight.value - deltaY);
        break;
      case 's':
        draggedComponent.value.height = Math.max(10, dragStartHeight.value + deltaY);
        break;
      case 'e':
        draggedComponent.value.width = Math.max(10, dragStartWidth.value + deltaX);
        break;
      case 'w':
        draggedComponent.value.x = Math.round(dragStartLeft.value + deltaX);
        draggedComponent.value.width = Math.max(10, dragStartWidth.value - deltaX);
        break;
    }
  } else if (isPanning.value) {
    // Update canvas pan position
    canvasPanX.value = panStartX.value + (event.clientX - dragStartX.value);
    canvasPanY.value = panStartY.value + (event.clientY - dragStartY.value);
  }
}

// End drag or resize operation
function handleMouseUp() {
  isDragging.value = false;
  isResizing.value = false;
  isPanning.value = false;
  draggedComponent.value = null;
  
  // Hide drag ghost
  if (dragGhost.value) {
    dragGhost.value.style.display = 'none';
  }
  
  // Remove global event listeners
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
}

// Handle drop of new component onto canvas
function handleDrop(event: DragEvent) {
  if (!event.dataTransfer) return;
  
  const componentType = event.dataTransfer.getData('application/x-model-component-type');
  
  if (componentType) {
    // TODO: Create a new component of this type at the drop position
    console.log(`Drop component of type ${componentType}`);
  }
  
  event.preventDefault();
}

// Handle drag over for drop indication
function handleDragOver(event: DragEvent) {
  if (!event.dataTransfer) return;
  
  if (event.dataTransfer.types.includes('application/x-model-component-type')) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }
}

// Handle canvas wheel for zooming
function handleCanvasWheel(event: WheelEvent) {
  // Check if Ctrl key is pressed for zooming, otherwise allow normal scroll
  if (event.ctrlKey) {
    event.preventDefault();
    const delta = Math.sign(event.deltaY) * -5; // 5% zoom per wheel tick
    const newZoom = Math.max(50, Math.min(200, props.zoomLevel + delta));
    // TODO: Emit zoom change event
  }
}

// Handle canvas pan with middle mouse button
function handleCanvasMouseDown(event: MouseEvent) {
  // If middle mouse button or spacebar + left button
  if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
    isPanning.value = true;
    dragStartX.value = event.clientX;
    dragStartY.value = event.clientY;
    panStartX.value = canvasPanX.value;
    panStartY.value = canvasPanY.value;
    
    // Add global event listeners
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    // Change cursor to grabbing
    if (canvasRef.value) {
      canvasRef.value.style.cursor = 'grabbing';
    }
    
    event.preventDefault();
  }
}
</script>

<template>
  <div 
    ref="canvasRef"
    class="model-canvas mb-canvas" 
    @click="handleCanvasClick"
    @dragover="handleDragOver"
    @drop="handleDrop"
    @mousedown="handleCanvasMouseDown"
  >
    <div class="canvas-content" :style="canvasStyle">
      <!-- Render each component -->
      <ModelComponentRenderer
        v-for="component in components"
        :key="component.id"
        :component="component"
        :is-selected="component === selectedComponent"
        @mousedown="handleComponentMouseDown($event, component)"
        @click="selectComponent(component, $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.model-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1e1e2d;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 20px 20px;
}

.canvas-content {
  position: relative;
  width: 5000px;
  height: 5000px;
  transform-origin: 0 0;
  will-change: transform;
}

:deep(.drag-ghost) {
  position: absolute;
  display: none;
  width: 10px;
  height: 10px;
  background: rgba(0, 176, 255, 0.5);
  border-radius: 50%;
  pointer-events: none;
  z-index: 9999;
  transform: translate(-50%, -50%);
}
</style>
