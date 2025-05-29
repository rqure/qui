<script setup lang="ts">
import { ref, onMounted, computed, readonly } from 'vue';
import { LMap, LControl } from '@vue-leaflet/vue-leaflet';
import { as2dArray, getCenter, type QBounds, type QXYZ } from '@/core/utils/drawing';
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

</script>

<template>
  <div class="canvas">
    <LMap
      :center="as2dArray(getCenter(bounds))"
      :zoom="zoom"
      :minZoom="minZoom"
      :maxZoom="maxZoom"
      :crs="L.CRS.Simple"
      :zoomControl="false"
      :attributionControl="false"
      :scrollWheelZoom="false"
      :smoothWheelZoom="true"
      :smoothSensitivity="1.5"
    >
    </LMap>
  </div>
</template>

<style scoped>
</style>