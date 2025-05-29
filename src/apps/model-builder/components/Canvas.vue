<script setup lang="ts">
import { ref, onMounted, computed, readonly } from 'vue';
import { LMap, LControl } from '@vue-leaflet/vue-leaflet';
import { as2dArray, getCenter, type QBounds, type QXYZ, type QModelConfig } from '@/core/utils/drawing';
import Model from './Model.vue';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';

const bottomLeft = ref<QXYZ>({ x: 0, y: 0, z: 0 });
const topRight = ref<QXYZ>({ x: 1000, y: 1000, z: 0 });
const bounds = computed(() => {
    const b: QBounds  = {
        bottomLeft: bottomLeft.value,
        topRight: topRight.value,
    };
    return b;
});
const zoom = ref(0);
const minZoom = ref(1);
const maxZoom = ref(10);

const mapRef = ref<any>(null);
const models = ref<QModelConfig[]>([]);

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  if (!e.dataTransfer || !mapRef.value) return;

  const type = e.dataTransfer.getData('componentType');
  const defaults = JSON.parse(e.dataTransfer.getData('componentDefaults'));
  console.log('Drop event:', { type, defaults });
  
  const map = mapRef.value.leafletObject;
  if (!map) {
    console.error('Map not initialized');
    return;
  }

  // Convert screen coordinates to map coordinates
  const point = map.mouseEventToLatLng(e);
  console.log('Map coordinates:', point);

  const model: QModelConfig = {
    id: `model-${Date.now()}`,
    type,
    offset: { x: point.lng, y: point.lat, z: 0 },
    location: { x: 0, y: 0, z: 0 },
    ...defaults,
    isVisible: true,
    pivot: { x: 0, y: 0, z: 0 },
    rotation: 0,
    scale: { x: 1, y: 1, z: 1 },
    color: '#3388ff',
    fillColor: '#3388ff',
    fillOpacity: 0.2,
    weight: 2,
    opacity: 1
  };
  console.log('Created model:', model);

  models.value.push(model);
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
};
</script>

<template>
  <div class="canvas" @drop="handleDrop" @dragover="handleDragOver">
    <LMap
      ref="mapRef"
      :center="as2dArray(getCenter(bounds))"
      :zoom="zoom"
      :minZoom="minZoom"
      :maxZoom="maxZoom"
      :crs="L.CRS.Simple"
      :zoomControl="false"
      :attributionControl="false"
    >
      <Model :models="models" />
    </LMap>
  </div>
</template>

<style scoped>
.canvas {
  grid-area: canvas;
  height: 100%;
  width: 100%;
  position: relative;
}

:deep(.leaflet-container) {
  height: 100%;
  width: 100%;
}
</style>