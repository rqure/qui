<template>
  <div 
    class="canvas-editor" 
    ref="containerRef"
    @drop="onDrop"
    @dragover="onDragOver"
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import { Canvas } from '@/core/canvas/canvas';
import { Model } from '@/core/canvas/model';
import type { Drawable } from '@/core/canvas/shapes/base';
import type { Point } from '@/core/canvas/types';
import { Polygon, Circle } from '@/core/canvas/shapes';
import L from 'leaflet';

const props = withDefaults(defineProps<{
  model: any; // Model instance with methods
  selectedShapeIndex: number | null;
  showGrid: boolean;
  snapToGrid: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  canvasBackground?: string;
  updateTrigger?: number;
}>(), {
  canvasWidth: 1000,
  canvasHeight: 600,
  canvasBackground: '#1a1a1a',
  updateTrigger: 0
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
const selectionModel = ref<Model | null>(null);

// Grid
const gridSize = 20;

// Selection
const isDragging = ref(false);
const isResizing = ref(false);
const isRotating = ref(false);
const resizeHandle = ref<string | null>(null);
const activeHandle = ref<Drawable | null>(null);
const dragStart = ref<{ x: number; y: number } | null>(null);
const dragStartLatLng = ref<L.LatLng | null>(null);
const shapeStartLocation = ref<{ x: number; y: number } | null>(null);
const shapeStartRotation = ref<number>(0);
const shapeStartSize = ref<{ radius?: number; width?: number; height?: number; fontSize?: number; edges?: any[] | null } | null>(null);
const lastResizeUpdate = ref<{ x: number; y: number } | null>(null);

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
  updateSelectionShapes();
  
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

// Watch for selected shape property changes
watch(
  () => {
    props.updateTrigger; // dependency
    if (selectedShape.value) {
      const shape = selectedShape.value;
      const shapeAny = shape as any;
      // Create a reactive snapshot of relevant properties
      return {
        location: shape.getLocation(),
        rotation: shape.getRotation(),
        offset: shape.getOffset(),
        scale: shape.getScale(),
        color: shapeAny.getColor?.(),
        fillColor: shapeAny.getFillColor?.(),
        fillOpacity: shapeAny.getFillOpacity?.(),
        weight: shapeAny.getWeight?.(),
        radius: shapeAny.getRadius?.(),
        width: shapeAny.getWidth?.(),
        height: shapeAny.getHeight?.(),
        edges: JSON.stringify(shapeAny.getEdges?.()),
        text: shapeAny.getText?.(),
      };
    }
    return null;
  },
  () => {
    if (selectedShape.value) {
      renderModelOnly();
      nextTick(() => {
        updateSelectionShapes();
      });
    }
  },
  { deep: true }
);

// Initialize canvas
function initCanvas() {
  if (!canvasRef.value) return;
  
  // Add canvas ID to the element
  canvasRef.value.id = canvasId;
  
  canvas.value = new Canvas(canvasId, { canvasBackground: props.canvasBackground });
  
  // Set up canvas
  canvas.value.setBoundary({ x: 0, y: 0 }, { x: props.canvasWidth, y: props.canvasHeight });
  canvas.value.setBackgroundColor(props.canvasBackground);
  
  // Create selection model
  selectionModel.value = new Model();
  
  // Add click handler and disable drag when shape selected
  const leafletMap = (canvas.value as any).map;
  if (leafletMap) {
    leafletMap.on('click', (e: L.LeafletMouseEvent) => {
      handleCanvasClick(e);
    });
    leafletMap.on('mousedown', (e: L.LeafletMouseEvent) => {
      handleCanvasMouseDown(e);
    });
    leafletMap.on('zoomend', () => {
      handleZoomChange();
    });
    
    // Disable map dragging initially
    leafletMap.dragging.disable();
  }
  
  renderModel();
}

// Render model without updating selection (for property changes)
function renderModelOnly() {
  if (!canvas.value) return;
  
  // First erase the model if it was already drawn
  props.model.erase();
  
  // Draw the model (it will automatically draw all shapes)
  props.model.draw(canvas.value);
}

// Render model
function renderModel() {
  renderModelOnly();
  
  // Update selection shapes after render to reflect any changes
  nextTick(() => {
    updateSelectionShapes();
  });
}

// Canvas mouse down handler to detect handle clicks
function handleCanvasMouseDown(e: L.LeafletMouseEvent) {
  if (!selectionModel.value || !canvas.value) return;
  
  const clickPoint = e.latlng;
  const selectionShapes = selectionModel.value.getShapes();
  
  // Check if clicking on a selection handle
  for (const shape of selectionShapes) {
    if ((shape as any)._handleType && isPointInShape(shape, clickPoint)) {
      const handleType = (shape as any)._handleType;
      
      if (handleType === 'rotate') {
        startRotate(e.originalEvent as MouseEvent);
      } else {
        startResize(e.originalEvent as MouseEvent, handleType);
      }
      
      L.DomEvent.stopPropagation(e);
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
      }
      return;
    }
  }
  
  // Check if clicking on selection box itself (for dragging)
  if (selectedShape.value) {
    for (const shape of selectionShapes) {
      if (!(shape as any)._handleType && isPointInShape(shape, clickPoint)) {
        startDrag(e.originalEvent as MouseEvent);
        L.DomEvent.stopPropagation(e);
        if (e.originalEvent) {
          e.originalEvent.preventDefault();
          e.originalEvent.stopPropagation();
        }
        return;
      }
    }
    
    // Check if clicking on the selected shape itself (for dragging)
    if (isPointInShape(selectedShape.value, clickPoint)) {
      startDrag(e.originalEvent as MouseEvent);
      L.DomEvent.stopPropagation(e);
      if (e.originalEvent) {
        e.originalEvent.preventDefault();
        e.originalEvent.stopPropagation();
      }
      return;
    }
  }
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

// Check if point is in shape
function isPointInShape(shape: Drawable, point: L.LatLng): boolean {
  const loc = shape.getOffset();
  const shapeAny = shape as any;
  
  // Check for Circle
  if (shapeAny.getRadius && typeof shapeAny.getRadius === 'function') {
    const radius = shapeAny.getRadius();
    
    // For circles, we need to check in pixel space since radius is in pixels
    if (canvas.value) {
      const leafletMap = (canvas.value as any).map;
      const shapePoint = leafletMap.latLngToContainerPoint([loc.y, loc.x]);
      const clickPoint = leafletMap.latLngToContainerPoint(point);
      const pixelDistance = Math.sqrt(
        Math.pow(clickPoint.x - shapePoint.x, 2) + Math.pow(clickPoint.y - shapePoint.y, 2)
      );
      return pixelDistance <= radius;
    }
    
    // Fallback to coordinate distance (not accurate)
    const distance = Math.sqrt(
      Math.pow(point.lat - loc.y, 2) + Math.pow(point.lng - loc.x, 2)
    );
    return distance <= radius * 0.001; // rough approximation
  }
  
  // Check for shapes with explicit dimensions
  if (shapeAny.getWidth && shapeAny.getHeight) {
    const halfWidth = shapeAny.getWidth() / 2;
    const halfHeight = shapeAny.getHeight() / 2;
    return Math.abs(point.lng - loc.x) <= halfWidth && 
           Math.abs(point.lat - loc.y) <= halfHeight;
  }
  
  // Check for polygons/polylines
  if (shapeAny.getEdges && typeof shapeAny.getEdges === 'function') {
    const edges = shapeAny.getEdges();
    if (edges && edges.length > 0) {
      // Calculate bounds (edges are relative to shape position)
      const xs = edges.map((e: any) => e.x);
      const ys = edges.map((e: any) => e.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      // Check if point is within bounds (with some padding)
      const padding = 20;
      return point.lng >= loc.x + minX - padding && point.lng <= loc.x + maxX + padding &&
             point.lat >= loc.y + minY - padding && point.lat <= loc.y + maxY + padding;
    }
  }
  
  // For other shapes, use a simple distance threshold
  const distance = Math.sqrt(
    Math.pow(point.lat - loc.y, 2) + Math.pow(point.lng - loc.x, 2)
  );
  return distance < 50;
}

// Update selection shapes
function updateSelectionShapes() {
  if (!canvas.value) return;
  
  // Destroy existing selection model
  if (selectionModel.value) {
    selectionModel.value.erase();
    selectionModel.value.destroy();
  }
  
  // Create new selection model
  selectionModel.value = new Model();
  
  if (!selectedShape.value) return;
  
  const shape = selectedShape.value;
  const loc = shape.getOffset();
  const shapeAny = shape as any;
  
  // Create selection pane for high z-index
  const selectionPane = { name: 'selection', level: 1000 };
  canvas.value.getOrCreatePane(selectionPane.name, selectionPane.level);
  
  // Create selection box and handles based on shape type
  if (shapeAny.getRadius && typeof shapeAny.getRadius === 'function') {
    // Circle - show radius handle
    createCircleSelection(shape, loc, selectionPane);
  } else if (shapeAny.getWidth && shapeAny.getHeight) {
    // Div, SVGText, ImageOverlay - show corner resize handles
    createRectangleSelection(shape, loc, selectionPane);
  } else if (shapeAny.getEdges && typeof shapeAny.getEdges === 'function') {
    // Polygon, Polyline - show edge point handles
    createPolygonSelection(shape, loc, selectionPane);
  } else if (shapeAny.getText && shapeAny.getFontSize) {
    // Text - show font size handle
    createTextSelection(shape, loc, selectionPane);
  } else {
    // Default rectangular selection for unknown shapes
    createRectangleSelection(shape, loc, selectionPane);
  }
  
  // Draw selection shapes
  selectionModel.value.draw(canvas.value);
}

function createCircleSelection(shape: Drawable, loc: Point, selectionPane: any) {
  const shapeAny = shape as any;
  const radius = shapeAny.getRadius();
  
  // Create selection circle outline
  const selectionCircle = new Circle();
  selectionCircle.setFillColor('rgba(0, 255, 136, 0.05)');
  selectionCircle.setColor('#00ff88');
  selectionCircle.setFillOpacity(0.08);
  selectionCircle.setWeight(2);
  selectionCircle.setRadius(radius);
  selectionCircle.setOffset(loc);
  selectionCircle.setPane(selectionPane);
  (selectionCircle as any)._isSelectionShape = true;
  selectionModel.value!.addShape(selectionCircle);
  
  // Create radius handle (at the right edge)
  const radiusHandle = new Circle();
  radiusHandle.setRadius(6);
  radiusHandle.setFillColor('#00ff88');
  radiusHandle.setColor('#ffffff');
  radiusHandle.setFillOpacity(1);
  radiusHandle.setWeight(2);
  radiusHandle.setOffset({ x: loc.x + radius, y: loc.y });
  radiusHandle.setPane(selectionPane);
  (radiusHandle as any)._isSelectionShape = true;
  (radiusHandle as any)._handleType = 'radius';
  selectionModel.value!.addShape(radiusHandle);
  
  // Create rotate handle (circle above)
  const rotateHandle = new Circle();
  rotateHandle.setRadius(8);
  rotateHandle.setFillColor('#0088ff');
  rotateHandle.setColor('#ffffff');
  rotateHandle.setFillOpacity(1);
  rotateHandle.setWeight(2);
  rotateHandle.setOffset({ x: loc.x, y: loc.y - radius - 20 });
  rotateHandle.setPane(selectionPane);
  (rotateHandle as any)._isSelectionShape = true;
  (rotateHandle as any)._handleType = 'rotate';
  selectionModel.value!.addShape(rotateHandle);
}

function createRectangleSelection(shape: Drawable, loc: Point, selectionPane: any) {
  const shapeAny = shape as any;
  const width = shapeAny.getWidth() || 100;
  const height = shapeAny.getHeight() || 100;
  
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  
  // Create selection box (polygon)
  const selectionBox = new Polygon();
  selectionBox.setFillColor('rgba(0, 255, 136, 0.05)');
  selectionBox.setColor('#00ff88');
  selectionBox.setFillOpacity(0.08);
  selectionBox.setWeight(2);
  selectionBox.setOffset({ x: loc.x, y: loc.y });
  selectionBox.setPane(selectionPane);
  selectionBox.addEdge({ x: -halfWidth, y: -halfHeight });
  selectionBox.addEdge({ x: halfWidth, y: -halfHeight });
  selectionBox.addEdge({ x: halfWidth, y: halfHeight });
  selectionBox.addEdge({ x: -halfWidth, y: halfHeight });
  (selectionBox as any)._isSelectionShape = true;
  selectionModel.value!.addShape(selectionBox);
  
  // Create resize handles (circles at corners)
  const handleSize = 6;
  const handles = [
    { x: -halfWidth, y: -halfHeight, type: 'nw' },
    { x: halfWidth, y: -halfHeight, type: 'ne' },
    { x: halfWidth, y: halfHeight, type: 'se' },
    { x: -halfWidth, y: halfHeight, type: 'sw' },
  ];
  
  handles.forEach(h => {
    const handle = new Circle();
    handle.setRadius(handleSize);
    handle.setFillColor('#00ff88');
    handle.setColor('#ffffff');
    handle.setFillOpacity(1);
    handle.setWeight(2);
    handle.setOffset({ x: loc.x + h.x, y: loc.y + h.y });
    handle.setPane(selectionPane);
    (handle as any)._isSelectionShape = true;
    (handle as any)._handleType = h.type;
    selectionModel.value!.addShape(handle);
  });
  
  // Create rotate handle (circle above)
  const rotateHandle = new Circle();
  rotateHandle.setRadius(8);
  rotateHandle.setFillColor('#0088ff');
  rotateHandle.setColor('#ffffff');
  rotateHandle.setFillOpacity(1);
  rotateHandle.setWeight(2);
  rotateHandle.setOffset({ x: loc.x, y: loc.y - halfHeight - 20 });
  rotateHandle.setPane(selectionPane);
  (rotateHandle as any)._isSelectionShape = true;
  (rotateHandle as any)._handleType = 'rotate';
  selectionModel.value!.addShape(rotateHandle);
}

function createPolygonSelection(shape: Drawable, loc: Point, selectionPane: any) {
  const shapeAny = shape as any;
  const edges = shapeAny.getEdges();
  
  if (!edges || edges.length === 0) return;
  
  // Create selection polygon outline
  const selectionPoly = new Polygon();
  selectionPoly.setFillColor('rgba(0, 255, 136, 0.05)');
  selectionPoly.setColor('#00ff88');
  selectionPoly.setFillOpacity(0.08);
  selectionPoly.setWeight(2);
  selectionPoly.setOffset(loc);
  selectionPoly.setPane(selectionPane);
  
  edges.forEach((edge: any) => {
    selectionPoly.addEdge(edge);
  });
  
  (selectionPoly as any)._isSelectionShape = true;
  selectionModel.value!.addShape(selectionPoly);
  
  // Create handles at each edge point
  edges.forEach((edge: any, index: number) => {
    const handle = new Circle();
    handle.setRadius(6);
    handle.setFillColor('#00ff88');
    handle.setColor('#ffffff');
    handle.setFillOpacity(1);
    handle.setWeight(2);
    handle.setOffset({ x: loc.x + edge.x, y: loc.y + edge.y });
    handle.setPane(selectionPane);
    (handle as any)._isSelectionShape = true;
    (handle as any)._handleType = `edge-${index}`;
    selectionModel.value!.addShape(handle);
  });
  
  // Create rotate handle (above the shape)
  const xs = edges.map((e: any) => e.x);
  const ys = edges.map((e: any) => e.y);
  const centerX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const minY = Math.min(...ys);
  
  const rotateHandle = new Circle();
  rotateHandle.setRadius(8);
  rotateHandle.setFillColor('#0088ff');
  rotateHandle.setColor('#ffffff');
  rotateHandle.setFillOpacity(1);
  rotateHandle.setWeight(2);
  rotateHandle.setOffset({ x: loc.x + centerX, y: loc.y + minY - 30 });
  rotateHandle.setPane(selectionPane);
  (rotateHandle as any)._isSelectionShape = true;
  (rotateHandle as any)._handleType = 'rotate';
  selectionModel.value!.addShape(rotateHandle);
}

function createTextSelection(shape: Drawable, loc: Point, selectionPane: any) {
  const shapeAny = shape as any;
  const text = shapeAny.getText() || '';
  const fontSize = shapeAny.getFontSize() || 16;
  
  // Estimate text bounds
  const textWidth = Math.max(text.length * fontSize * 0.6, 40);
  const textHeight = fontSize * 1.2;
  
  const halfWidth = textWidth / 2;
  const halfHeight = textHeight / 2;
  
  // Create selection box
  const selectionBox = new Polygon();
  selectionBox.setFillColor('rgba(0, 255, 136, 0.05)');
  selectionBox.setColor('#00ff88');
  selectionBox.setFillOpacity(0.08);
  selectionBox.setWeight(2);
  selectionBox.setOffset({ x: loc.x, y: loc.y });
  selectionBox.setPane(selectionPane);
  selectionBox.addEdge({ x: -halfWidth, y: -halfHeight });
  selectionBox.addEdge({ x: halfWidth, y: -halfHeight });
  selectionBox.addEdge({ x: halfWidth, y: halfHeight });
  selectionBox.addEdge({ x: -halfWidth, y: halfHeight });
  (selectionBox as any)._isSelectionShape = true;
  selectionModel.value!.addShape(selectionBox);
  
  // Create font size handle (at bottom-right)
  const fontHandle = new Circle();
  fontHandle.setRadius(6);
  fontHandle.setFillColor('#00ff88');
  fontHandle.setColor('#ffffff');
  fontHandle.setFillOpacity(1);
  fontHandle.setWeight(2);
  fontHandle.setOffset({ x: loc.x + halfWidth, y: loc.y + halfHeight });
  fontHandle.setPane(selectionPane);
  (fontHandle as any)._isSelectionShape = true;
  (fontHandle as any)._handleType = 'fontsize';
  selectionModel.value!.addShape(fontHandle);
  
  // Create rotate handle (above the text)
  const rotateHandle = new Circle();
  rotateHandle.setRadius(8);
  rotateHandle.setFillColor('#0088ff');
  rotateHandle.setColor('#ffffff');
  rotateHandle.setFillOpacity(1);
  rotateHandle.setWeight(2);
  rotateHandle.setOffset({ x: loc.x, y: loc.y - halfHeight - 20 });
  rotateHandle.setPane(selectionPane);
  (rotateHandle as any)._isSelectionShape = true;
  (rotateHandle as any)._handleType = 'rotate';
  selectionModel.value!.addShape(rotateHandle);
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



function startDrag(event: MouseEvent) {
  if (!selectedShape.value) return;
  
  isDragging.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  shapeStartLocation.value = selectedShape.value.getOffset();
  document.body.style.cursor = 'grabbing';
  event.preventDefault();
}

function startResize(event: MouseEvent, handle: string) {
  if (!selectedShape.value) return;
  
  isResizing.value = true;
  resizeHandle.value = handle;
  dragStart.value = { x: event.clientX, y: event.clientY };
  shapeStartLocation.value = selectedShape.value.getOffset();
  
  const shapeAny = selectedShape.value as any;
  shapeStartSize.value = {
    radius: shapeAny.getRadius?.(),
    width: shapeAny.getWidth?.(),
    height: shapeAny.getHeight?.(),
    fontSize: shapeAny.getFontSize?.(),
    edges: shapeAny.getEdges?.() ? [...shapeAny.getEdges()] : null
  };
  
  lastResizeUpdate.value = null; // Reset throttling
  
  document.body.style.cursor = `${handle}-resize`;
  event.preventDefault();
}

function startRotate(event: MouseEvent) {
  if (!selectedShape.value || !canvas.value) return;
  
  const leafletMap = (canvas.value as any).map;
  if (!leafletMap) return;
  
  isRotating.value = true;
  dragStart.value = { x: event.clientX, y: event.clientY };
  dragStartLatLng.value = leafletMap.containerPointToLatLng([event.clientX, event.clientY]);
  shapeStartLocation.value = selectedShape.value.getOffset();
  shapeStartRotation.value = selectedShape.value.getRotation();
  
  document.body.style.cursor = 'grab';
  event.preventDefault();
}

function handleMouseMove(event: MouseEvent) {
  if (!canvas.value || !selectedShape.value) return;
  
  const leafletMap = (canvas.value as any).map;
  if (!leafletMap) return;
  
  // Get container coordinates
  const container = leafletMap.getContainer();
  const containerRect = container.getBoundingClientRect();
  const currentContainerX = event.clientX - containerRect.left;
  const currentContainerY = event.clientY - containerRect.top;
  
  // Dragging shape
  if (isDragging.value && dragStart.value && shapeStartLocation.value) {
    // Get container coordinates for start position
    const startContainerX = dragStart.value.x - containerRect.left;
    const startContainerY = dragStart.value.y - containerRect.top;
    
    // Convert to Leaflet coordinates
    const startLatLng = leafletMap.containerPointToLatLng([startContainerX, startContainerY]);
    const currentLatLng = leafletMap.containerPointToLatLng([currentContainerX, currentContainerY]);
    
    // Calculate delta in Leaflet coordinate space
    const canvasDx = currentLatLng.lng - startLatLng.lng;
    const canvasDy = currentLatLng.lat - startLatLng.lat;
    
    // Update shape location (Leaflet uses [lat, lng] which maps to [y, x])
    const newLocation = {
      x: shapeStartLocation.value.x + canvasDx,
      y: shapeStartLocation.value.y + canvasDy
    };
    
    const snappedLocation = props.snapToGrid ? snapToGridCoords(newLocation) : newLocation;
    selectedShape.value.setOffset(snappedLocation);
    
    renderModelOnly();
    updateSelectionShapes();
    emit('shape-update');
  }
  
  // Resizing shape
  else if (isResizing.value && resizeHandle.value && dragStart.value && shapeStartSize.value) {
    // Get container coordinates for start position
    const startContainerX = dragStart.value.x - containerRect.left;
    const startContainerY = dragStart.value.y - containerRect.top;
    
    // Convert to Leaflet coordinates
    const startLatLng = leafletMap.containerPointToLatLng([startContainerX, startContainerY]);
    const currentLatLng = leafletMap.containerPointToLatLng([currentContainerX, currentContainerY]);
    
    // Calculate delta in Leaflet coordinate space
    const canvasDx = currentLatLng.lng - startLatLng.lng;
    const canvasDy = currentLatLng.lat - startLatLng.lat;
    
    // Throttle updates to reduce lag
    if (!lastResizeUpdate.value || 
        Math.abs(currentContainerX - lastResizeUpdate.value.x) > 5 || 
        Math.abs(currentContainerY - lastResizeUpdate.value.y) > 5) {
      
      const shapeAny = selectedShape.value as any;
      
      if (resizeHandle.value === 'radius' && shapeAny.setRadius) {
        // Circle radius resize
        const newRadius = Math.max(5, shapeStartSize.value.radius! + canvasDx);
        shapeAny.setRadius(newRadius);
      } else if (resizeHandle.value.startsWith('edge-') && shapeAny.setEdges) {
        // Polygon/polyline edge point resize
        const edgeIndex = parseInt(resizeHandle.value.split('-')[1]);
        const edges = [...shapeStartSize.value.edges!];
        edges[edgeIndex] = {
          x: edges[edgeIndex].x + canvasDx,
          y: edges[edgeIndex].y + canvasDy
        };
        shapeAny.setEdges(edges);
      } else if (resizeHandle.value === 'fontsize' && shapeAny.setFontSize) {
        // Text font size resize
        const newFontSize = Math.max(8, shapeStartSize.value.fontSize! + canvasDy);
        shapeAny.setFontSize(newFontSize);
      } else if (shapeAny.setWidth && shapeAny.setHeight) {
        // Rectangle resize (Div, SVGText, ImageOverlay)
        let newWidth = shapeStartSize.value.width!;
        let newHeight = shapeStartSize.value.height!;
        
        switch (resizeHandle.value) {
          case 'se': // bottom-right
            newWidth += canvasDx;
            newHeight += canvasDy;
            break;
          case 'sw': // bottom-left
            newWidth -= canvasDx;
            newHeight += canvasDy;
            break;
          case 'ne': // top-right
            newWidth += canvasDx;
            newHeight -= canvasDy;
            break;
          case 'nw': // top-left
            newWidth -= canvasDx;
            newHeight -= canvasDy;
            break;
        }
        
        shapeAny.setWidth(Math.max(10, newWidth));
        shapeAny.setHeight(Math.max(10, newHeight));
      }
      
      renderModelOnly();
      updateSelectionShapes();
      emit('shape-update');
      
      lastResizeUpdate.value = { x: currentContainerX, y: currentContainerY };
    }
  }
  
  // Rotating shape
  else if (isRotating.value && dragStart.value && shapeStartLocation.value) {
    // Get shape center in container coordinates
    const shapeCenterLatLng = L.latLng(shapeStartLocation.value.y, shapeStartLocation.value.x);
    const shapeCenterPoint = leafletMap.latLngToContainerPoint(shapeCenterLatLng);
    
    // Calculate angles from shape center
    const startAngle = Math.atan2(dragStart.value.y - containerRect.top - shapeCenterPoint.y, 
                                  dragStart.value.x - containerRect.left - shapeCenterPoint.x);
    const currentAngle = Math.atan2(event.clientY - containerRect.top - shapeCenterPoint.y, 
                                     event.clientX - containerRect.left - shapeCenterPoint.x);
    
    const deltaAngle = currentAngle - startAngle;
    const newRotation = shapeStartRotation.value + deltaAngle;
    
    selectedShape.value.setRotation(newRotation);
    renderModelOnly();
    updateSelectionShapes();
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
  lastResizeUpdate.value = null;
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

function handleZoomChange() {
  if (!canvas.value) return;
  
  const zoom = canvas.value.getZoom();
  
  // Update zoom level for all shapes
  const shapes = props.model.getShapes();
  shapes.forEach((shape: Drawable) => {
    shape.setZoom(zoom);
  });
  
  // Re-render shapes that depend on zoom
  renderModelOnly();
  updateSelectionShapes();
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
  updateBackground,
  renderModel
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
</style>
