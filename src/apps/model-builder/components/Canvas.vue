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
  if (!canvas) return;

  const componentType = event.dataTransfer?.getData('componentType');
  const componentDefaults = JSON.parse(event.dataTransfer?.getData('componentDefaults') || '{}');

  if (!componentType) return;

  const modelGenerator = registry.get(componentType);
  if (!modelGenerator) return;

  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const model = modelGenerator({
    type: componentType,
    offset: { x, y, z: 0 },
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
}

:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  background: #f8f8f8;
}
</style>