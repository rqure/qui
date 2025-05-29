<script setup lang="ts">
import { ref, onMounted, computed, readonly } from 'vue';
import { LMap, LControl } from '@vue-leaflet/vue-leaflet';
import Model from './Model.vue';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';

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
    >

    </LMap>
  </div>
</template>

<style scoped>

</style>