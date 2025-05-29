<script setup lang="ts">
import { ref, onMounted, toRaw } from 'vue';
import { LMap } from '@vue-leaflet/vue-leaflet';
import "leaflet/dist/leaflet.css";
import L, { map } from 'leaflet';
import { QCanvas } from '@/core/utils/drawing/canvas';
import { ModelRegistry } from '@/core/utils/drawing/registry';
import { Circle } from '@/core/utils/drawing/circle';
import { Polygon } from '@/core/utils/drawing/polygon';
import { Polyline } from '@/core/utils/drawing/polyline';
import { Xyz } from '@/core/utils/drawing/xyz';

const mapRef = ref<HTMLElement | null>(null);
const lmap = ref<L.Map | null>(null);
const canvas = ref<QCanvas | null>(null);
const registry = ref<ModelRegistry>(new ModelRegistry());

onMounted(() => {
  if (!mapRef.value) return;
  
  lmap.value = L.map(mapRef.value, {
    crs: L.CRS.Simple,
    zoomControl: false,
    attributionControl: false,
  });

  canvas.value = new QCanvas(lmap.value as L.Map);
  canvas.value.setBoundry(new Xyz(-1000, -1000), new Xyz(1000, 1000));

  // Register available shape types
  registry.value.register('circle', (config) => {
    return registry.value.applyConfig(new Circle(), config);
  });

  registry.value.register('polygon', (config) => {
    return registry.value.applyConfig(new Polygon(), config);
  });

  registry.value.register('polyline', (config) => {
    return registry.value.applyConfig(new Polyline(), config);
  });
});

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  if (!canvas.value) return;

  const componentType = event.dataTransfer?.getData('componentType');
  const componentDefaults = JSON.parse(event.dataTransfer?.getData('componentDefaults') || '{}');

  if (!componentType) return;

  const modelGenerator = registry.value.get(componentType);
  if (!modelGenerator) return;

  const rect = (event.target as HTMLElement).getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const model = modelGenerator({
    type: componentType,
    offset: { x, y, z: 0 },
    ...componentDefaults
  });

  canvas.value.render(model);
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
};
</script>

<template>
  <div 
    class="canvas"
    ref="mapRef"
    @drop="handleDrop"
    @dragover="handleDragOver"
  >
  </div>
</template>

<style scoped>
.canvas {
  grid-area: canvas;
  height: 100%;
  width: 100%;
}

:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
  background: #f8f8f8;
}
</style>