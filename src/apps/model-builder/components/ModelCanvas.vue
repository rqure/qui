<script setup lang="ts">
import { ref, computed } from 'vue';
import type { CSSProperties } from 'vue';
import type { ModelComponent } from '../types';
import ModelComponentRenderer from './ModelComponentRenderer.vue';

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
}>();

// Canvas state
const canvasRef = ref<HTMLDivElement | null>(null);
const dragGhost = ref<HTMLDivElement | null>(null);
const isDragging = ref(false);
const isResizing = ref(false);
const draggedComponent = ref<ModelComponent | null>(null);
const resizeDirection = ref('');
const zoomLevel = ref(1);

// Drag state
const dragStartX = ref(0);
const dragStartY = ref(0);
const dragStartLeft = ref(0);
const dragStartTop = ref(0);
const dragStartWidth = ref(0);
const dragStartHeight = ref(0);

// Computed styles
const canvasStyle = computed<CSSProperties>(() => ({
  transform: `scale(${zoomLevel.value})`,
  transformOrigin: '0 0',
  width: `${props.model.width}px`,
  height: `${props.model.height}px`,
  position: 'relative',
  backgroundColor: 'var(--mb-bg-canvas)',
  overflow: 'hidden'
}));

// Sort components by z-index
const sortedComponents = computed(() => {
  return [...props.model.components].sort((a, b) => (a.z || 0) - (b.z || 0));
});

// Handle canvas click to deselect components
function handleCanvasClick(event: MouseEvent) {
  if (event.target === canvasRef.value) {
    emit('select-component', null);
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
    const x = (event.clientX - rect.left) / zoomLevel.value;
    const y = (event.clientY - rect.top) / zoomLevel.value;
    emit('add-component', componentType, x, y);
  }
}

// Handle component selection
function handleSelectComponent(component: ModelComponent) {
  if (!isResizing.value) {
    emit('select-component', component);
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
}

// Handle component dragging
function handleDrag(event: MouseEvent) {
  if (!isDragging.value || !draggedComponent.value) return;

  const deltaX = (event.clientX - dragStartX.value) / zoomLevel.value;
  const deltaY = (event.clientY - dragStartY.value) / zoomLevel.value;

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

// Update zoom level
function updateZoom(delta: number) {
  zoomLevel.value = Math.max(0.1, Math.min(2, zoomLevel.value + delta * 0.1));
}
</script>

<template>
  <div class="canvas-container">
    <div 
      ref="canvasRef"
      class="model-canvas mb-canvas"
      :class="{ 'dragging': isDragging }"
      :style="canvasStyle"
      @click="handleCanvasClick"
      @dragover="handleDragOver"
      @drop="handleDrop"
    >
      <ModelComponentRenderer
        v-for="component in sortedComponents"
        :key="component.id"
        :component="component"
        :is-selected="selectedComponent?.id === component.id"
        @mousedown="handleDragStart($event, component)"
        @select="handleSelectComponent"
        @update="$emit('update-component', $event)"
      />
      <div ref="dragGhost" class="drag-ghost" />
    </div>
    
    <!-- Zoom controls -->
    <div class="mb-zoom-controls">
      <button class="mb-zoom-button" @click="updateZoom(-1)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13H5v-2h14v2z"/>
        </svg>
      </button>
      <div class="mb-zoom-value">{{ Math.round(zoomLevel * 100) }}%</div>
      <button class="mb-zoom-button" @click="updateZoom(1)">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
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