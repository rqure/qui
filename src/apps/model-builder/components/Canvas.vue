<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { LMap, LControl } from '@vue-leaflet/vue-leaflet';
import "leaflet/dist/leaflet.css";
import type { LatLngExpression, LeafletEvent, LeafletMouseEvent } from 'leaflet';
import L from 'leaflet';

interface Point {
  x: number;
  y: number;
  zoom?: number;
}

interface BoundaryPoints {
  bottomLeft: Point;
  topRight: Point;
}

const mapRef = ref<{ leafletObject: LMap } | null>(null);
const mousePosition = ref<Point>({ x: 0, y: 0, zoom: 0 });
const boundaryPoints = ref<BoundaryPoints>({
  bottomLeft: { x: 0, y: 0 },
  topRight: { x: 0, y: 0 }
});

// Custom events
const mouseMoveCallbacks = ref<Function[]>([]);
const zoomCallbacks = ref<Function[]>([]);

// Computed properties
const boundaryHeight = computed(() => 
  Math.abs(boundaryPoints.value.bottomLeft.y - boundaryPoints.value.topRight.y)
);

const boundaryWidth = computed(() => 
  Math.abs(boundaryPoints.value.bottomLeft.x - boundaryPoints.value.topRight.x)
);

const center = computed(() => ({
  x: (boundaryPoints.value.bottomLeft.x + boundaryPoints.value.topRight.x) / 2,
  y: (boundaryPoints.value.bottomLeft.y + boundaryPoints.value.topRight.y) / 2
}));

onMounted(() => {
  const map = mapRef.value?.leafletObject;
  if (!map) return;

  // Set up map options
  map.setZoom(0);
  map.doubleClickZoom.disable();

  // Event listeners
  map.on('mousemove', (event: LeafletMouseEvent) => {
    mousePosition.value = {
      x: Number(event.latlng.lng.toFixed(5)),
      y: Number(event.latlng.lat.toFixed(5)),
      zoom: map.getZoom()
    };
    mouseMoveCallbacks.value.forEach(cb => cb(mousePosition.value));
  });

  map.on('zoom', () => {
    mousePosition.value = {
      ...mousePosition.value,
      zoom: map.getZoom()
    };
    zoomCallbacks.value.forEach(cb => cb(mousePosition.value));
  });
});

// Methods
const moveTo = (point: Point, zoom = 0) => {
  mapRef.value?.leafletObject?.flyTo([point.y, point.x], zoom);
};

const setMinZoom = (value: number) => {
  mapRef.value?.leafletObject?.setMinZoom(value);
};

const setMaxZoom = (value: number) => {
  mapRef.value?.leafletObject?.setMaxZoom(value);
};

const setBoundary = (from: Point, to: Point) => {
  boundaryPoints.value = { bottomLeft: from, topRight: to };
  const boundary: [LatLngExpression, LatLngExpression] = [
    [from.y, from.x],
    [to.y, to.x]
  ];
  
  mapRef.value?.leafletObject?.fitBounds(boundary);
  mapRef.value?.leafletObject?.setMaxBounds(boundary);
};

const setBackgroundColor = (color: string) => {
  if (mapRef.value?.leafletObject?._container) {
    mapRef.value.leafletObject._container.style.backgroundColor = color;
  }
};

defineExpose({
  moveTo,
  setMinZoom,
  setMaxZoom,
  setBoundary,
  setBackgroundColor,
  mousePosition,
  boundaryHeight,
  boundaryWidth,
  center
});
</script>

<template>
  <LMap
    ref="mapRef"
    :center="[0, 0]"
    :zoom="0"
    :crs="L.CRS.Simple"
    :zoomControl="false"
    :attributionControl="false"
    :scrollWheelZoom="false"
    :smoothWheelZoom="true"
    :smoothSensitivity="1.5"
    class="map-container"
  >
    <LControl position="topright">
      <slot name="controls"></slot>
    </LControl>
    <slot></slot>
  </LMap>
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  background-color: var(--bs-body-bg);
}
</style>