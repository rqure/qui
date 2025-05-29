<script setup lang="ts">
import { ref, onMounted, computed, readonly } from 'vue';
import { LMap, LControl } from '@vue-leaflet/vue-leaflet';
import "leaflet/dist/leaflet.css";
import L from 'leaflet';


</script>

<template>
    <LMap
        ref="mapRef"
    >

    </LMap>
</template>

<style scoped>

</style>