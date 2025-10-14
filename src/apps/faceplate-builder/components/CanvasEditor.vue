<template>
  <div 
    class="canvas-editor" 
    ref="containerRef"
    @drop="onDrop"
    @dragover="onDragOver"
    @click="onContainerClick"
  >
    <div class="canvas-wrapper" ref="canvasRef"></div>
    
    <!-- Grid overlay -->
    <svg v-if="showGrid" class="grid-overlay" :viewBox="`0 0 ${containerSize.width} ${containerSize.height}`">
      <defs>
        <pattern id="grid" :width="gridSize" :height="gridSize" patternUnits="userSpaceOnUse">
          <path 
            :d="`M ${gridSize} 0 L 0 0 0 ${gridSize}`" 
            fill="none" 
            stroke="rgba(255,255,255,0.1)" 
            stroke-width="0.5"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
    
    <!-- Selection overlay -->
    <div v-if="selectedShapeIndex !== null && selectionBounds" class="selection-overlay">
      <div 
        class="selection-box"
        :style="{
          left: selectionBounds.x + 'px',
          top: selectionBounds.y + 'px',
          width: selectionBounds.width + 'px',
          height: selectionBounds.height + 'px'
        }"
      >
        <!-- Resize handles -->
        <div class="resize-handle handle-nw" @mousedown.stop="startResize($event, 'nw')"></div>
        <div class="resize-handle handle-ne" @mousedown.stop="startResize($event, 'ne')"></div>
        <div class="resize-handle handle-sw" @mousedown.stop="startResize($event, 'sw')"></div>
        <div class="resize-handle handle-se" @mousedown.stop="startResize($event, 'se')"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import { Canvas } from '@/core/canvas/canvas';
import { Model } from '@/core/canvas/model';
import type { Drawable } from '@/core/canvas/shapes/base';
import L from 'leaflet';

const props = defineProps<{
  model: any; // Model instance with methods
  selectedShapeIndex: number | null;
  showGrid: boolean;
  snapToGrid: boolean;
}>();

const emit = defineEmits<{
  (e: 'shape-select', index: number): void;
  (e: 'shape-update'): void;
  (e: 'shape-drop', shapeType: string, location: { x: number; y: number }): void;
  (e: 'canvas-click'): void;
}>();

// Refs
const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLElement | null>(null);
const canvas = ref<Canvas | null>(null);
const containerSize = ref({ width: 1000, height: 600 });
const canvasId = `canvas-editor-${Math.random().toString(36).substr(2, 9)}`;

// Grid
const gridSize = 20;

// Selection
const selectionBounds = ref<{ x: number; y: number; width: number; height: number } | null>(null);
const isDragging = ref(false);
const isResizing = ref(false);
const resizeHandle = ref<string | null>(null);
const dragStart = ref<{ x: number; y: number } | null>(null);
const shapeStartLocation = ref<{ x: number; y: number } | null>(null);

// Computed
const selectedShape = computed((): Drawable | null => {
  if (props.selectedShapeIndex === null) return null;
  return props.model.getShape(props.selectedShapeIndex) || null;
});

// Lifecycle
onMounted(() => {
  initCanvas();
  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
  updateContainerSize();
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  if (canvas.value) {
    canvas.value.destroy();
  }
});

// Watch for model changes
watch(() => props.model, () => {
  renderModel();
});

watch(() => props.model.getShapes().length, () => {
  renderModel();
});

watch(() => props.selectedShapeIndex, () => {
  updateSelectionBounds();
});

// Initialize canvas
function initCanvas() {
  if (!canvasRef.value) return;
  
  // Add canvas ID to the element
  canvasRef.value.id = canvasId;
  
  canvas.value = new Canvas(canvasId, { canvasBackground: '#1a1a1a' });
  
  // Set up canvas
  canvas.value.setBoundary({ x: 0, y: 0 }, { x: 1000, y: 600 });
  canvas.value.setBackgroundColor('#1a1a1a');
  
  // Add click handler
  const leafletMap = (canvas.value as any).map;
  if (leafletMap) {
    leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      handleCanvasClick(e);
    });
  }
  
  renderModel();
}

// Render model
function renderModel() {
  if (!canvas.value) return;
  
  // First erase the model if it was already drawn
  props.model.erase();
  
  // Draw the model (it will automatically draw all shapes)
  props.model.draw(canvas.value);
  
  updateSelectionBounds();
}

// Canvas click handler
function handleCanvasClick(e: L.LeafletMouseEvent) {
  const clickPoint = e.latlng;
  const shapes = props.model.getShapes();
  
  // Find clicked shape (reverse order for top-most)
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    if (isPointInShape(shape, clickPoint)) {
      emit('shape-select', i);
      return;
    }
  }
  
  // No shape clicked
  emit('canvas-click');
}

// Check if point is in shape (simplified)
function isPointInShape(shape: Drawable, point: L.LatLng): boolean {
  const loc = shape.getLocation();
  const distance = Math.sqrt(
    Math.pow(point.lat - loc.y, 2) + Math.pow(point.lng - loc.x, 2)
  );
  
  // Use 50px threshold for now (should be more sophisticated)
  return distance < 50;
}

// Update selection bounds
function updateSelectionBounds() {
  if (!selectedShape.value || !canvas.value) {
    selectionBounds.value = null;
    return;
  }
  
  const shape = selectedShape.value;
  const loc = shape.getLocation();
  
  // Convert canvas coords to screen coords
  const leafletMap = (canvas.value as any).map;
  if (!leafletMap) return;
  
  const point = leafletMap.latLngToContainerPoint([loc.y, loc.x]);
  
  // Use approximate bounds (should be more sophisticated)
  selectionBounds.value = {
    x: point.x - 60,
    y: point.y - 60,
    width: 120,
    height: 120
  };
}

// Drag and drop
function onDragOver(event: DragEvent) {
  event.preventDefault();
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'copy';
  }
}

function onDrop(event: DragEvent) {
  event.preventDefault();
  
  if (!event.dataTransfer || !canvas.value) return;
  
  const shapeType = event.dataTransfer.getData('application/x-faceplate-shape');
  if (!shapeType) return;
  
  // Get drop location in canvas coordinates
  const leafletMap = (canvas.value as any).map;
  if (!leafletMap) return;
  
  const containerPoint = {
    x: event.offsetX,
    y: event.offsetY
  };
  
  const latLng = leafletMap.containerPointToLatLng(containerPoint);
  const location = { x: latLng.lng, y: latLng.lat };
  
  // Apply grid snap if enabled
  const snappedLocation = props.snapToGrid ? snapToGridCoords(location) : location;
  
  emit('shape-drop', shapeType, snappedLocation);
}

// Shape dragging
function onContainerClick(event: MouseEvent) {
  if (selectedShape.value && selectionBounds.value) {
    const bounds = selectionBounds.value;
    const x = event.offsetX;
    const y = event.offsetY;
    
    // Check if click is inside selection box
    if (x >= bounds.x && x <= bounds.x + bounds.width &&
        y >= bounds.y && y <= bounds.y + bounds.height) {
      startDrag(event);
      return;
    }
  }
}

function startDrag(event: MouseEvent) {
  if (!selectedShape.value) return;
  
  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  shapeStartLocation.value = selectedShape.value.getLocation();
  event.preventDefault();
}

function startResize(event: MouseEvent, handle: string) {
  if (!selectedShape.value) return;
  
  isResizing.value = true;
  resizeHandle.value = handle;
  dragStart.value = { x: event.clientX, y: event.clientY };
  shapeStartLocation.value = selectedShape.value.getLocation();
  event.preventDefault();
}

function handleMouseMove(event: MouseEvent) {
  if (isDragging.value && dragStart.value && shapeStartLocation.value && selectedShape.value && canvas.value) {
    const leafletMap = (canvas.value as any).map;
    if (!leafletMap) return;
    
    // Calculate delta in screen space
    const dx = event.clientX - dragStart.value.x;
    const dy = event.clientY - dragStart.value.y;
    
    // Convert to canvas space (approximately)
    const zoom = leafletMap.getZoom();
    const scale = Math.pow(2, zoom);
    const canvasDx = dx / scale;
    const canvasDy = dy / scale;
    
    // Update shape location
    const newLocation = {
      x: shapeStartLocation.value.x + canvasDx,
      y: shapeStartLocation.value.y + canvasDy
    };
    
    const snappedLocation = props.snapToGrid ? snapToGridCoords(newLocation) : newLocation;
    selectedShape.value.setLocation(snappedLocation);
    
    renderModel();
    emit('shape-update');
  }
  
  if (isResizing.value && resizeHandle.value && dragStart.value && selectedShape.value) {
    // TODO: Implement resize logic
    // For now, just emit update
    emit('shape-update');
  }
}

function handleMouseUp() {
  isDragging.value = false;
  isResizing.value = false;
  resizeHandle.value = null;
  dragStart.value = null;
  shapeStartLocation.value = null;
}

// Grid snapping
function snapToGridCoords(location: { x: number; y: number }): { x: number; y: number } {
  return {
    x: Math.round(location.x / gridSize) * gridSize,
    y: Math.round(location.y / gridSize) * gridSize
  };
}

// Zoom controls
function zoomIn() {
  if (canvas.value) {
    const leafletMap = (canvas.value as any).map;
    if (leafletMap) {
      leafletMap.zoomIn();
    }
  }
}

function zoomOut() {
  if (canvas.value) {
    const leafletMap = (canvas.value as any).map;
    if (leafletMap) {
      leafletMap.zoomOut();
    }
  }
}

function resetZoom() {
  if (canvas.value) {
    const leafletMap = (canvas.value as any).map;
    if (leafletMap) {
      leafletMap.setZoom(0);
      leafletMap.setView([300, 500], 0);
    }
  }
}

// Handle resize
function handleResize() {
  updateContainerSize();
  if (canvas.value) {
    const leafletMap = (canvas.value as any).map;
    if (leafletMap) {
      leafletMap.invalidateSize();
    }
  }
}

function updateContainerSize() {
  if (containerRef.value) {
    containerSize.value = {
      width: containerRef.value.clientWidth,
      height: containerRef.value.clientHeight
    };
  }
}

// Expose methods
defineExpose({
  zoomIn,
  zoomOut,
  resetZoom
});
</script>

<style scoped>
.canvas-editor {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.canvas-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.selection-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
}

.selection-box {
  position: absolute;
  border: 2px solid var(--qui-color-primary);
  background: rgba(0, 136, 255, 0.05);
  pointer-events: all;
  cursor: move;
}

.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--qui-color-primary);
  border: 1px solid white;
  border-radius: 50%;
  pointer-events: all;
}

.handle-nw {
  top: -5px;
  left: -5px;
  cursor: nw-resize;
}

.handle-ne {
  top: -5px;
  right: -5px;
  cursor: ne-resize;
}

.handle-sw {
  bottom: -5px;
  left: -5px;
  cursor: sw-resize;
}

.handle-se {
  bottom: -5px;
  right: -5px;
  cursor: se-resize;
}
</style>
