<script setup lang="ts">
import { ref } from 'vue';
import Toolbar from './components/Toolbar.vue';
import ComponentsExplorer from './components/ComponentsExplorer.vue';
import Canvas from './components/Canvas.vue';

const showGrid = ref(true);
const mode = ref<'pan' | 'select'>('pan');
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null);

const handleCenter = () => {
  canvasRef.value?.centerCanvas();
};

const handleModeChange = (newMode: 'pan' | 'select') => {
  mode.value = newMode;
};
</script>

<template>
  <div class="model-builder">
    <Toolbar 
      v-model:showGrid="showGrid"
      v-model:mode="mode"
      @center="handleCenter"
    />
    <ComponentsExplorer />
    <Canvas 
      ref="canvasRef"
      :showGrid="showGrid"
      v-model:mode="mode"
    />
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
  background-color: var(--qui-bg-primary);
  color: var(--qui-text-primary);
}
</style>