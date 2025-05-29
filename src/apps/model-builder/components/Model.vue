<script setup lang="ts">
import { ref, onMounted, computed, readonly } from 'vue';
import { LMap, LControl, LCircle, LIcon, LMarker, LPolygon, LPolyline, LImageOverlay } from '@vue-leaflet/vue-leaflet';
import { absoluteOffset, as2dArray, as2dArrays, as3dArray, bounds2Array, boundsOf, centerOf, dimensionsOf, edgesOf, getCenter, locationOf, type QBounds, type QModelConfig, type QXYZ } from '@/core/utils/drawing';
import "leaflet/dist/leaflet.css";
import L, { LatLngBounds, type LatLngTuple } from 'leaflet';

const models = ref<QModelConfig[]>([]);

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
    <div v-for="model in models">
        <LCircle v-if="model.type === 'circle'"
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
        
        <LMarker v-else-if="model.type === 'div'"
            :latLng="as2dArray(locationOf(model))"
            :icon="asDivIcon(model)"
            :className="model.className">
        </LMarker>

        <LPolygon v-else-if="model.type === 'polygon'"
            :latLngs="as2dArrays(edgesOf(model))"
            :color="model.color"
            :fillColor="model.fillColor"
            :fillOpacity="model.fillOpacity"
            :weight="model.weight"
            :opacity="model.opacity"
            :dashOffset="model.dashOffset"
            :stroke="model.stroke">
        </LPolygon>
        
        <LPolyline v-else-if="model.type === 'polyline'"
            :latLngs="as2dArrays(edgesOf(model))"
            :color="model.color"
            :fillColor="model.fillColor"
            :fillOpacity="model.fillOpacity"
            :weight="model.weight"
            :opacity="model.opacity"
            :dashOffset="model.dashOffset"
            :stroke="model.stroke">
        </LPolyline>

        <LImageOverlay v-else-if="model.type === 'imageOverlay'"
            :url="model.url || ''"
            :bounds="new LatLngBounds(bounds2Array(boundsOf(model)))"
            :opacity="model.opacity">
        </LImageOverlay>
    </div>

</template>

<style scoped>
</style>