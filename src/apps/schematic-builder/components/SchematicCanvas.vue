<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Vector2, CanvasNode, PaletteTemplate } from '../types';

const props = defineProps<{
  nodes: CanvasNode[];
  selectedNodeIds: string[];
  zoom: number;
  pan: Vector2;
  viewportSize: Vector2;
  templates: Record<string, PaletteTemplate>;
}>();

const emit = defineEmits<{
  (event: 'add-node', payload: { templateId: string; position: Vector2 }): void;
  (event: 'node-update', payload: { nodeId: string; props?: Record<string, unknown>; position?: Vector2; size?: Vector2; name?: string }): void;
  (event: 'nodes-update', payload: { updates: Array<{ nodeId: string; position?: Vector2; size?: Vector2 }> }): void;
  (event: 'delete-nodes', payload: { nodeIds: string[] }): void;
  (event: 'selection-change', payload: { selectedIds: string[] }): void;
  (event: 'zoom-change', zoom: number): void;
  (event: 'pan-change', pan: Vector2): void;
  (event: 'viewport-size-change', size: Vector2): void;
}>();

const mapContainer = ref<HTMLDivElement | null>(null);
let map: L.Map | null = null;
let svgLayer: L.SVGOverlay | null = null;
let svgElement: SVGSVGElement | null = null;
const nodeShapes = ref<Map<string, SVGElement>>(new Map());

const isDragging = ref(false);
const dragStartNode = ref<string | null>(null);
const dragStartPos = ref<L.LatLng | null>(null);
const selectedNodes = ref<Set<string>>(new Set());

onMounted(() => {
  if (!mapContainer.value) return;

  // Initialize Leaflet map with CRS.Simple (for flat 2D coordinate system)
  map = L.map(mapContainer.value, {
    crs: L.CRS.Simple,
    center: [props.viewportSize.y / 2, props.viewportSize.x / 2],
    zoom: 0,
    minZoom: -2,
    maxZoom: 2,
    zoomControl: true,
    attributionControl: false,
  });

  // Set bounds to viewport size
  const bounds = L.latLngBounds(
    L.latLng(0, 0),
    L.latLng(props.viewportSize.y, props.viewportSize.x)
  );
  map.setMaxBounds(bounds);
  map.fitBounds(bounds);

  // Add a simple grid/background
  L.tileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88f9vPQAJCwNkfTfXGQAAAABJRU5ErkJggg==', {
    minZoom: -2,
    maxZoom: 2,
    tileSize: 256,
    noWrap: true,
  }).addTo(map);

  // Create SVG overlay for rendering shapes
  svgElement = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  svgElement.style.position = 'absolute';
  svgElement.style.top = '0';
  svgElement.style.left = '0';
  
  svgLayer = L.svgOverlay(svgElement, bounds, {
    interactive: true,
  }).addTo(map);

  // Handle map events
  map.on('zoomend', () => {
    if (map) {
      emit('zoom-change', map.getZoom());
      updateAllNodes();
    }
  });

  map.on('moveend', () => {
    if (map) {
      const center = map.getCenter();
      emit('pan-change', { x: center.lng, y: center.lat });
      updateAllNodes();
    }
  });

  // Handle clicks on the map
  map.on('click', (e: L.LeafletMouseEvent) => {
    // Check if click was on a node
    const clickedNode = findNodeAtPoint(e.latlng);
    if (!clickedNode) {
      selectedNodes.value = new Set();
      emit('selection-change', { selectedIds: [] });
    }
  });

  // Initial render of nodes
  nextTick(() => {
    updateAllNodes();
  });
});

onBeforeUnmount(() => {
  nodeShapes.value.clear();
  if (map) {
    map.remove();
    map = null;
  }
  svgLayer = null;
  svgElement = null;
});

function findNodeAtPoint(latlng: L.LatLng): string | null {
  for (const node of props.nodes) {
    const nodePos = node.position;
    const nodeSize = node.size;
    
    // Check if point is within node bounds
    if (latlng.lng >= nodePos.x && latlng.lng <= nodePos.x + nodeSize.x &&
        latlng.lat >= nodePos.y && latlng.lat <= nodePos.y + nodeSize.y) {
      return node.id;
    }
  }
  return null;
}

function createPrimitiveShape(node: CanvasNode, template: PaletteTemplate | undefined): SVGElement {
  const primitiveId = template?.primitiveId ?? 'Rectangle';
  const config = node.props;
  
  let shape: SVGElement;
  
  // Create SVG elements based on primitive type
  switch (primitiveId) {
    case 'Rectangle':
      shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      shape.setAttribute('x', String(node.position.x));
      shape.setAttribute('y', String(node.position.y));
      shape.setAttribute('width', String(node.size.x));
      shape.setAttribute('height', String(node.size.y));
      shape.setAttribute('fill', String(config.fill ?? '#3b82f6'));
      shape.setAttribute('stroke', String(config.stroke ?? '#1e40af'));
      shape.setAttribute('stroke-width', String(config.strokeWidth ?? 2));
      shape.setAttribute('rx', String(config.cornerRadius ?? 0));
      break;
      
    case 'Ellipse':
      shape = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      shape.setAttribute('cx', String(node.position.x + node.size.x / 2));
      shape.setAttribute('cy', String(node.position.y + node.size.y / 2));
      shape.setAttribute('rx', String(node.size.x / 2));
      shape.setAttribute('ry', String(node.size.y / 2));
      shape.setAttribute('fill', String(config.fill ?? '#3b82f6'));
      shape.setAttribute('stroke', String(config.stroke ?? '#1e40af'));
      shape.setAttribute('stroke-width', String(config.strokeWidth ?? 2));
      break;
      
    case 'Line':
      shape = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      shape.setAttribute('x1', String(node.position.x));
      shape.setAttribute('y1', String(node.position.y));
      shape.setAttribute('x2', String(node.position.x + node.size.x));
      shape.setAttribute('y2', String(node.position.y + node.size.y));
      shape.setAttribute('stroke', String(config.stroke ?? '#1e40af'));
      shape.setAttribute('stroke-width', String(config.strokeWidth ?? 2));
      break;
      
    case 'Text':
      shape = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      shape.setAttribute('x', String(node.position.x));
      shape.setAttribute('y', String(node.position.y + node.size.y / 2));
      shape.setAttribute('fill', String(config.color ?? '#ffffff'));
      shape.setAttribute('font-size', String(config.fontSize ?? 14));
      shape.setAttribute('font-family', String(config.fontFamily ?? 'sans-serif'));
      shape.textContent = String(config.text ?? 'Text');
      break;
      
    default:
      // Default to rectangle for unknown types
      shape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      shape.setAttribute('x', String(node.position.x));
      shape.setAttribute('y', String(node.position.y));
      shape.setAttribute('width', String(node.size.x));
      shape.setAttribute('height', String(node.size.y));
      shape.setAttribute('fill', String(config.fill ?? '#3b82f6'));
      shape.setAttribute('stroke', String(config.stroke ?? '#1e40af'));
      shape.setAttribute('stroke-width', String(config.strokeWidth ?? 2));
  }
  
  // Add common attributes
  shape.setAttribute('data-node-id', node.id);
  shape.style.cursor = node.locked ? 'not-allowed' : 'move';
  shape.style.opacity = node.hidden ? '0.3' : '1';
  
  // Add event listeners
  shape.addEventListener('click', (e) => {
    e.stopPropagation();
    handleNodeClick(node.id, e as any);
  });
  
  shape.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    if (!node.locked) {
      handleNodeDragStart(node.id, e);
    }
  });
  
  return shape;
}

function updateAllNodes() {
  if (!svgElement || !map) return;
  
  // Clear existing shapes
  while (svgElement.firstChild) {
    svgElement.removeChild(svgElement.firstChild);
  }
  nodeShapes.value.clear();
  
  // Add all nodes as SVG elements
  for (const node of props.nodes) {
    const template = props.templates[node.componentId];
    const shape = createPrimitiveShape(node, template);
    
    // Apply selection styling
    if (selectedNodes.value.has(node.id)) {
      shape.setAttribute('stroke', '#10b981');
      shape.setAttribute('stroke-width', '3');
    }
    
    svgElement.appendChild(shape);
    nodeShapes.value.set(node.id, shape);
  }
}

function handleNodeClick(nodeId: string, event: MouseEvent | PointerEvent) {
  if (event.ctrlKey || event.metaKey) {
    // Multi-select
    const newSelection = new Set(selectedNodes.value);
    if (newSelection.has(nodeId)) {
      newSelection.delete(nodeId);
    } else {
      newSelection.add(nodeId);
    }
    selectedNodes.value = newSelection;
    emit('selection-change', { selectedIds: Array.from(newSelection) });
  } else {
    // Single select
    selectedNodes.value = new Set([nodeId]);
    emit('selection-change', { selectedIds: [nodeId] });
  }
  updateAllNodes();
}

function handleNodeDragStart(nodeId: string, event: MouseEvent) {
  if (!map) return;
  
  isDragging.value = true;
  dragStartNode.value = nodeId;
  
  const containerPoint = map.mouseEventToContainerPoint(event);
  dragStartPos.value = map.containerPointToLatLng(containerPoint);
  
  if (!selectedNodes.value.has(nodeId)) {
    selectedNodes.value = new Set([nodeId]);
    emit('selection-change', { selectedIds: [nodeId] });
    updateAllNodes();
  }
  
  // Add mousemove and mouseup to document for better drag handling
  document.addEventListener('mousemove', handleNodeDrag);
  document.addEventListener('mouseup', handleNodeDragEnd);
}

function handleNodeDrag(event: MouseEvent) {
  if (!isDragging.value || !map || !dragStartPos.value) return;
  
  const containerPoint = map.mouseEventToContainerPoint(event);
  const currentPos = map.containerPointToLatLng(containerPoint);
  
  const dx = currentPos.lng - dragStartPos.value.lng;
  const dy = currentPos.lat - dragStartPos.value.lat;
  
  // Update positions for all selected nodes
  const updates = Array.from(selectedNodes.value).map(id => {
    const node = props.nodes.find(n => n.id === id);
    if (!node) return null;
    
    return {
      nodeId: id,
      position: {
        x: node.position.x + dx,
        y: node.position.y + dy,
      },
    };
  }).filter(Boolean) as Array<{ nodeId: string; position: Vector2 }>;
  
  if (updates.length > 0) {
    emit('nodes-update', { updates });
  }
  
  dragStartPos.value = currentPos;
}

function handleNodeDragEnd() {
  isDragging.value = false;
  dragStartNode.value = null;
  dragStartPos.value = null;
  
  document.removeEventListener('mousemove', handleNodeDrag);
  document.removeEventListener('mouseup', handleNodeDragEnd);
}

// Watch for prop changes to update internal state
watch(() => props.selectedNodeIds, (newIds) => {
  selectedNodes.value = new Set(newIds);
  updateAllNodes();
}, { immediate: true });

// Watch for node changes
watch(() => props.nodes, () => {
  updateAllNodes();
}, { deep: true });
</script>

<template>
  <div class="schematic-canvas">
    <div ref="mapContainer" class="leaflet-container"></div>
  </div>
</template>

<style scoped>
.schematic-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--qui-bg-primary);
}

.leaflet-container {
  width: 100%;
  height: 100%;
  background: #1a1a1a;
}
</style>
