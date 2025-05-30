<script setup lang="ts">
import { ref, onMounted, toRaw } from 'vue';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { QCanvas } from '@/core/utils/drawing/canvas';
import { ModelRegistry } from '@/core/utils/drawing/registry';
import { Circle } from '@/core/utils/drawing/circle';
import { Polygon } from '@/core/utils/drawing/polygon';
import { Polyline } from '@/core/utils/drawing/polyline';
import { Xyz } from '@/core/utils/drawing/xyz';

const mapRef = ref<HTMLElement | null>(null);
let lmap: L.Map | null = null;
let canvas: QCanvas | null = null;
const registry = new ModelRegistry();

onMounted(() => {
  if (!mapRef.value) return;

  lmap = L.map(mapRef.value, {
    crs: L.CRS.Simple,
    zoomControl: false,
    attributionControl: false,
    preferCanvas: true,  // 👈 Critical for vector performance
    renderer: L.canvas(), // 👈 Force canvas renderer
  });

  canvas = new QCanvas(lmap as L.Map);
  canvas.setBoundry(new Xyz(-1000, -1000), new Xyz(1000, 1000));
  canvas.moveTo(canvas.center)

  // Register available shape types
  registry.register('circle', (config) => {
    return registry.applyConfig(new Circle(), config);
  });

  registry.register('polygon', (config) => {
    return registry.applyConfig(new Polygon(), config);
  });

  registry.register('polyline', (config) => {
    return registry.applyConfig(new Polyline(), config);
  });
});

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  if (!canvas || !lmap) return;

  const componentType = event.dataTransfer?.getData('componentType');
  const componentDefaults = JSON.parse(event.dataTransfer?.getData('componentDefaults') || '{}');

  if (!componentType) return;

  const modelGenerator = registry.get(componentType);
  if (!modelGenerator) return;

  // Get the map container's bounds
  const containerRect = mapRef.value!.getBoundingClientRect();
  
  // Calculate position relative to the map container
  const x = event.clientX - containerRect.left;
  const y = event.clientY - containerRect.top;
  
  // Convert the container-relative point to map coordinates
  const point = lmap.containerPointToLatLng([x, y]);
  
  const model = modelGenerator({
    type: componentType,
    offset: { x: point.lng, y: point.lat, z: 0 },
    ...componentDefaults
  });

  canvas.render(model);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};
</script>

<template>
  <div
    class="canvas"
    @drop="handleDrop"
    @dragover="handleDragOver"
    >

    <div style="height: 100%; width: 100%;"
      ref="mapRef"
    >
    </div>
  </div>
</template>

<style>
.canvas {
  height: 100%;
  width: 100%;
  background-color: var(--qui-bg-primary);
}

:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  background: var(--qui-bg-secondary);
}

/* Add theme styling for Leaflet controls */
:deep(.leaflet-control-zoom) {
  border: var(--qui-window-border) !important;
  background-color: var(--qui-bg-secondary) !important;
}

:deep(.leaflet-control-zoom a) {
  background-color: var(--qui-bg-primary) !important;
  color: var(--qui-text-primary) !important;
  border: var(--qui-window-border) !important;
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
}

:deep(.leaflet-control-zoom a:hover) {
  background-color: var(--qui-overlay-hover) !important;
  transform: var(--qui-hover-lift);
}
</style>