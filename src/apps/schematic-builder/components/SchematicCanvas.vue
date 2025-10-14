<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Vector2, CanvasNode, PaletteTemplate } from '../types';
import PrimitiveRenderer from '@/apps/faceplate-builder/components/PrimitiveRenderer.vue';

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
const nodesLayer = ref<HTMLDivElement | null>(null);

const isDragging = ref(false);
const dragStartPos = ref<Vector2>({ x: 0, y: 0 });
const selectedNodes = ref<Set<string>>(new Set());

onMounted(() => {
  if (!mapContainer.value) return;

  // Initialize Leaflet map with CRS.Simple (for flat 2D coordinate system)
  map = L.map(mapContainer.value, {
    crs: L.CRS.Simple,
    center: [0, 0],
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
  map.fitBounds(bounds);

  // Add a simple grid/background
  L.tileLayer('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88f9vPQAJCwNkfTfXGQAAAABJRU5ErkJggg==', {
    minZoom: -2,
    maxZoom: 2,
    tileSize: 256,
    noWrap: true,
  }).addTo(map);

  // Handle map events
  map.on('zoomend', () => {
    if (map) {
      emit('zoom-change', map.getZoom());
    }
  });

  map.on('moveend', () => {
    if (map) {
      const center = map.getCenter();
      emit('pan-change', { x: center.lng, y: center.lat });
    }
  });
});

onBeforeUnmount(() => {
  if (map) {
    map.remove();
    map = null;
  }
});

function handleNodeClick(nodeId: string, event: MouseEvent) {
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
}

function handleNodeDragStart(nodeId: string, event: MouseEvent) {
  isDragging.value = true;
  dragStartPos.value = { x: event.clientX, y: event.clientY };
  
  if (!selectedNodes.value.has(nodeId)) {
    selectedNodes.value = new Set([nodeId]);
    emit('selection-change', { selectedIds: [nodeId] });
  }
}

function handleNodeDrag(nodeId: string, event: MouseEvent) {
  if (!isDragging.value) return;
  
  const dx = event.clientX - dragStartPos.value.x;
  const dy = event.clientY - dragStartPos.value.y;
  
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
  
  dragStartPos.value = { x: event.clientX, y: event.clientY };
}

function handleNodeDragEnd() {
  isDragging.value = false;
}

function handleCanvasClick(event: MouseEvent) {
  if (event.target === mapContainer.value) {
    selectedNodes.value = new Set();
    emit('selection-change', { selectedIds: [] });
  }
}

function handleDelete() {
  if (selectedNodes.value.size > 0) {
    emit('delete-nodes', { nodeIds: Array.from(selectedNodes.value) });
    selectedNodes.value = new Set();
  }
}

// Watch for prop changes to update internal state
watch(() => props.selectedNodeIds, (newIds) => {
  selectedNodes.value = new Set(newIds);
}, { immediate: true });

// Compute node styles for positioning
function getNodeStyle(node: CanvasNode) {
  return {
    position: 'absolute' as const,
    left: `${node.position.x}px`,
    top: `${node.position.y}px`,
    width: `${node.size.x}px`,
    height: `${node.size.y}px`,
    zIndex: node.zIndex ?? 1,
    opacity: node.hidden ? 0.3 : 1,
    pointerEvents: (node.locked ? 'none' : 'auto') as 'none' | 'auto',
  };
}
</script>

<template>
  <div class="schematic-canvas" @click="handleCanvasClick">
    <div ref="mapContainer" class="leaflet-container"></div>
    <div ref="nodesLayer" class="nodes-layer">
      <div
        v-for="node in nodes"
        :key="node.id"
        :style="getNodeStyle(node)"
        class="canvas-node-wrapper"
        :class="{ selected: selectedNodes.has(node.id), locked: node.locked }"
        @click.stop="handleNodeClick(node.id, $event)"
        @mousedown="handleNodeDragStart(node.id, $event)"
        @mousemove="handleNodeDrag(node.id, $event)"
        @mouseup="handleNodeDragEnd"
      >
        <PrimitiveRenderer
          :type="templates[node.componentId]?.primitiveId ?? 'Rectangle'"
          :config="node.props"
        />
      </div>
    </div>
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

.nodes-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1000;
}

.canvas-node-wrapper {
  pointer-events: auto;
  cursor: move;
  transition: opacity 0.2s;
}

.canvas-node-wrapper.selected {
  outline: 2px solid var(--qui-accent-primary);
  outline-offset: 2px;
}

.canvas-node-wrapper.locked {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
