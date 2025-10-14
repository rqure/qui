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
        :class="{ 'is-dragging': isDragging, 'is-resizing': isResizing }"
        :style="{
          left: selectionBounds.x + 'px',
          top: selectionBounds.y + 'px',
          width: selectionBounds.width + 'px',
          height: selectionBounds.height + 'px'
        }"
        @mousedown="onSelectionBoxMouseDown"
      >
        <!-- Resize handles -->
        <div class="resize-handle handle-nw" @mousedown.stop="startResize($event, 'nw')" title="Resize"></div>
        <div class="resize-handle handle-ne" @mousedown.stop="startResize($event, 'ne')" title="Resize"></div>
        <div class="resize-handle handle-sw" @mousedown.stop="startResize($event, 'sw')" title="Resize"></div>
        <div class="resize-handle handle-se" @mousedown.stop="startResize($event, 'se')" title="Resize"></div>
        <div class="rotate-handle" @mousedown.stop="startRotate($event)" title="Rotate">↻</div>
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

const props = withDefaults(defineProps<{
  model: any; // Model instance with methods
  selectedShapeIndex: number | null;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBackground?: string;
}>(), {
  canvasWidth: 1000,
  canvasHeight: 600,
  canvasBackground: '#1a1a1a'
});

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
const isRotating = ref(false);
const resizeHandle = ref<string | null>(null);
const dragStart = ref<{ x: number; y: number } | null>(null);
const shapeStartLocation = ref<{ x: number; y: number } | null>(null);
const shapeStartRotation = ref<number>(0);
const shapeStartSize = ref<{ width: number; height: number; radius: number } | null>(null);

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
  
  // Toggle Leaflet map dragging based on selection
  if (canvas.value) {
    const leafletMap = (canvas.value as any).map;
    if (leafletMap) {
      if (props.selectedShapeIndex === null) {
        // No shape selected - enable map panning
        leafletMap.dragging.enable();
      } else {
        // Shape selected - disable map panning to allow shape dragging
        leafletMap.dragging.disable();
      }
    }
  }
});

// Initialize canvas
function initCanvas() {
  if (!canvasRef.value) return;
  
  // Add canvas ID to the element
  canvasRef.value.id = canvasId;
  
  canvas.value = new Canvas(canvasId, { canvasBackground: props.canvasBackground });
  
  // Set up canvas
  canvas.value.setBoundary({ x: 0, y: 0 }, { x: props.canvasWidth, y: props.canvasHeight });
  canvas.value.setBackgroundColor(props.canvasBackground);
  
  // Add click handler and disable drag when shape selected
  const leafletMap = (canvas.value as any).map;
  if (leafletMap) {
    leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      handleCanvasClick(e);
    });
    
    // Disable map dragging initially
    leafletMap.dragging.disable();
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

// Shape dragging - mousedown for proper drag behavior
function onSelectionBoxMouseDown(event: MouseEvent) {
  // Don't start drag if clicking on resize handles
  if ((event.target as HTMLElement).classList.contains('resize-handle')) {
    return;
  }
  
  startDrag(event);
  event.stopPropagation();
  event.preventDefault();
}

function onContainerClick(event: MouseEvent) {
  // Just for deselection when clicking outside
  if (!selectedShape.value) return;
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
  
  const shapeAny = selectedShape.value as any;
  shapeStartSize.value = {
    width: shapeAny.getWidth?.() || 100,
    height: shapeAny.getHeight?.() || 100,
    radius: shapeAny.getRadius?.() || 50
  };
  
  document.body.style.cursor = `${handle}-resize`;
  event.preventDefault();
}

function startRotate(event: MouseEvent) {
  if (!selectedShape.value) return;
  
  isRotating.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  shapeStartLocation.value = selectedShape.value.getLocation();
  shapeStartRotation.value = selectedShape.value.getRotation();
  
  document.body.style.cursor = 'grab';
  event.preventDefault();
}

function handleMouseMove(event: MouseEvent) {
  if (!canvas.value || !selectedShape.value) return;
  
  const leafletMap = (canvas.value as any).map;
  if (!leafletMap) return;
  
  // Dragging shape
  if (isDragging.value && dragStart.value && shapeStartLocation.value) {
    // Calculate delta in screen space
    const dx = event.clientX - dragStart.value.x;
    const dy = event.clientY - dragStart.value.y;
    
    // Convert screen delta to canvas coordinates
    const zoom = leafletMap.getZoom();
    const scale = Math.pow(2, zoom);
    const canvasDx = dx / scale;
    const canvasDy = dy / scale;
    
    // Update shape location (Leaflet uses [lat, lng] which maps to [y, x])
    const newLocation = {
      x: shapeStartLocation.value.x + canvasDx,
      y: shapeStartLocation.value.y - canvasDy // Invert Y because screen Y increases down but canvas Y increases up
    };
    
    const snappedLocation = props.snapToGrid ? snapToGridCoords(newLocation) : newLocation;
    selectedShape.value.setLocation(snappedLocation);
    
    renderModel();
    emit('shape-update');
  }
  
  // Resizing shape
  else if (isResizing.value && resizeHandle.value && dragStart.value && shapeStartSize.value) {
    const dx = event.clientX - dragStart.value.x;
    const dy = event.clientY - dragStart.value.y;
    
    const zoom = leafletMap.getZoom();
    const scale = Math.pow(2, zoom);
    const canvasDx = dx / scale;
    const canvasDy = dy / scale;
    
    const shapeAny = selectedShape.value as any;
    
    // Handle Circle radius
    if (shapeAny.setRadius && typeof shapeAny.getRadius === 'function') {
      const radiusChange = Math.sqrt(canvasDx * canvasDx + canvasDy * canvasDy) * 
                          ((canvasDx + canvasDy) > 0 ? 1 : -1);
      const newRadius = Math.max(10, shapeStartSize.value.radius + radiusChange);
      shapeAny.setRadius(newRadius);
    }
    
    // Handle shapes with width/height
    else if (shapeAny.setWidth && shapeAny.setHeight) {
      let newWidth = shapeStartSize.value.width;
      let newHeight = shapeStartSize.value.height;
      
      // Apply resize based on handle direction
      switch (resizeHandle.value) {
        case 'se':
          newWidth += canvasDx;
          newHeight -= canvasDy;
          break;
        case 'sw':
          newWidth -= canvasDx;
          newHeight -= canvasDy;
          break;
        case 'ne':
          newWidth += canvasDx;
          newHeight += canvasDy;
          break;
        case 'nw':
          newWidth -= canvasDx;
          newHeight += canvasDy;
          break;
      }
      
      newWidth = Math.max(20, newWidth);
      newHeight = Math.max(20, newHeight);
      
      shapeAny.setWidth(newWidth);
      shapeAny.setHeight(newHeight);
    }
    
    renderModel();
    emit('shape-update');
  }
  
  // Rotating shape
  else if (isRotating.value && dragStart.value && shapeStartLocation.value && selectionBounds.value) {
    // Calculate angle from center of selection box to current mouse position
    const centerX = selectionBounds.value.x + selectionBounds.value.width / 2;
    const centerY = selectionBounds.value.y + selectionBounds.value.height / 2;
    
    const startAngle = Math.atan2(dragStart.value.y - centerY, dragStart.value.x - centerX);
    const currentAngle = Math.atan2(event.clientY - centerY, event.clientX - centerX);
    
    const deltaAngle = currentAngle - startAngle;
    const newRotation = shapeStartRotation.value + deltaAngle;
    
    selectedShape.value.setRotation(newRotation);
    renderModel();
    emit('shape-update');
  }
}

function handleMouseUp() {
  isDragging.value = false;
  isResizing.value = false;
  isRotating.value = false;
  resizeHandle.value = null;
  dragStart.value = null;
  shapeStartLocation.value = null;
  shapeStartRotation.value = 0;
  shapeStartSize.value = null;
  document.body.style.cursor = '';
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

// Canvas config update methods
function updateBoundary(from: { x: number; y: number }, to: { x: number; y: number }) {
  if (canvas.value) {
    canvas.value.setBoundary(from, to);
    renderModel();
  }
}

function updateBackground(color: string) {
  if (canvas.value) {
    canvas.value.setBackgroundColor(color);
    renderModel();
  }
}

// Expose methods
defineExpose({
  zoomIn,
  zoomOut,
  resetZoom,
  updateBoundary,
  updateBackground
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
  border: 2px solid var(--qui-accent-color, #00ff88);
  background: color-mix(in srgb, var(--qui-accent-color, #00ff88) 8%, transparent);
  pointer-events: all;
  cursor: move;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2),
              0 2px 8px rgba(0, 0, 0, 0.15),
              inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  transition: all 0.15s ease;
  border-radius: 2px;
}

.selection-box:hover {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.3),
              0 4px 12px rgba(0, 0, 0, 0.25),
              inset 0 0 0 1px rgba(255, 255, 255, 0.15);
  border-color: color-mix(in srgb, var(--qui-accent-color, #00ff88) 120%, white);
}

.selection-box.is-dragging {
  cursor: grabbing;
  box-shadow: 0 0 0 2px var(--qui-accent-color, #00ff88),
              0 6px 20px rgba(0, 0, 0, 0.4),
              inset 0 0 0 1px rgba(255, 255, 255, 0.2);
  opacity: 0.9;
}

.selection-box.is-resizing {
  box-shadow: 0 0 0 2px var(--qui-accent-color, #00ff88),
              0 6px 20px rgba(0, 0, 0, 0.4),
              inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.resize-handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background: var(--qui-accent-color, #00ff88);
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  pointer-events: all;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3), 
              inset 0 1px 2px rgba(255, 255, 255, 0.3);
  transition: all 0.15s ease;
}

.resize-handle:hover {
  transform: scale(1.3);
  background: color-mix(in srgb, var(--qui-accent-color, #00ff88) 120%, white);
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.4), 
              inset 0 1px 2px rgba(255, 255, 255, 0.4);
}

.handle-nw {
  top: -6px;
  left: -6px;
  cursor: nw-resize;
}

.handle-ne {
  top: -6px;
  right: -6px;
  cursor: ne-resize;
}

.handle-sw {
  bottom: -6px;
  left: -6px;
  cursor: sw-resize;
}

.handle-se {
  bottom: -6px;
  right: -6px;
  cursor: se-resize;
}

.rotate-handle {
  position: absolute;
  top: -36px;
  left: 50%;
  transform: translateX(-50%);
  width: 24px;
  height: 24px;
  background: var(--qui-accent-secondary, #0088ff);
  border: 2px solid rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  cursor: grab;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
  pointer-events: all;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3), 
              inset 0 1px 2px rgba(255, 255, 255, 0.3);
  transition: all 0.15s ease;
  user-select: none;
}

.rotate-handle:hover {
  transform: translateX(-50%) scale(1.2);
  background: color-mix(in srgb, var(--qui-accent-secondary, #0088ff) 120%, white);
  box-shadow: 0 3px 12px rgba(0, 0, 0, 0.4), 
              inset 0 1px 2px rgba(255, 255, 255, 0.4);
}

.rotate-handle:active {
  cursor: grabbing;
}
</style>
