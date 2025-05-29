<script setup lang="ts">
import { ref, onMounted, computed, readonly } from 'vue';
import { LMap, LControl, LCircle, LIcon, LMarker, LPolygon, LPolyline, LImageOverlay } from '@vue-leaflet/vue-leaflet';
import { absoluteOffset, as2dArray, as2dArrays, as3dArray, bounds2Array, boundsOf, centerOf, dimensionsOf, edgesOf, getCenter, locationOf, type QBounds, type QModelConfig, type QXYZ } from '@/core/utils/drawing';
import "leaflet/dist/leaflet.css";
import L, { LatLngBounds, type LatLngTuple } from 'leaflet';

const props = defineProps<{
  models: QModelConfig[]
}>();

function asDivIcon(m: QModelConfig): any {
    return L.divIcon({
        className: m.className || '',
        html: m.html || '',
        iconSize: as2dArray(dimensionsOf(m)),
        iconAnchor: as2dArray(centerOf(m)),
    }) as any;
}

</script>

<template>
    <template v-for="model in models" :key="model.id">
        <template v-if="model.type === 'circle'">
            <LCircle
                :latLng="as2dArray(locationOf(model))"
                :radius="model.radius"
                :color="model.color"
                :fillColor="model.fillColor"
                :fillOpacity="model.fillOpacity"
                :weight="model.weight"
                :opacity="model.opacity"
                :dashOffset="model.dashOffset"
                :stroke="model.stroke">
            </LCircle>
        </template>
        
        <template v-else-if="model.type === 'div'">
            <LMarker
                :latLng="as2dArray(locationOf(model))"
                :icon="asDivIcon(model)"
                :className="model.className">
            </LMarker>
        </template>

        <template v-else-if="model.type === 'polygon'">
            <LPolygon
                :latLngs="as2dArrays(edgesOf(model))"
                :color="model.color"
                :fillColor="model.fillColor"
                :fillOpacity="model.fillOpacity"
                :weight="model.weight"
                :opacity="model.opacity"
                :dashOffset="model.dashOffset"
                :stroke="model.stroke">
            </LPolygon>
        </template>
        
        <template v-else-if="model.type === 'polyline'">
            <LPolyline
                :latLngs="as2dArrays(edgesOf(model))"
                :color="model.color"
                :fillColor="model.fillColor"
                :fillOpacity="model.fillOpacity"
                :weight="model.weight"
                :opacity="model.opacity"
                :dashOffset="model.dashOffset"
                :stroke="model.stroke">
            </LPolyline>
        </template>

        <template v-else-if="model.type === 'imageOverlay'">
            <LImageOverlay
                :url="model.url || ''"
                :bounds="new LatLngBounds(bounds2Array(boundsOf(model)))"
                :opacity="model.opacity">
            </LImageOverlay>
        </template>
    </template>
</template>

<style scoped>
</style>