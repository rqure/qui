<script setup lang="ts">
import Toolbar from './components/Toolbar.vue';
import ComponentsExplorer from './components/ComponentsExplorer.vue';
import Canvas from './components/Canvas.vue';
</script>

<template>
  <div class="model-builder">
    <Toolbar />
    <ComponentsExplorer />
    <Canvas></Canvas>
  </div>
</template>

<style scoped>
.model-builder {
  display: grid;
  grid-template-areas:
    "toolbar toolbar"
    "sidebar canvas";
  grid-template-rows: 50px 1fr;
  grid-template-columns: 200px 1fr;
  height: 100%;
  width: 100%;
}
</style>