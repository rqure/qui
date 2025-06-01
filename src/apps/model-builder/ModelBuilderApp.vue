<script setup lang="ts">
import { ref } from 'vue';
import Toolbar from './components/Toolbar.vue';
import ComponentsExplorer from './components/ComponentsExplorer.vue';
import Canvas from './components/Canvas.vue';
import PropertiesEditor from './components/PropertiesEditor.vue';
import type { Drawable } from '@/core/utils/drawing/drawable';

const showGrid = ref(true);
const mode = ref<'pan' | 'select'>('pan');
const canvasRef = ref<InstanceType<typeof Canvas> | null>(null);
const selectedItem = ref<Drawable>();

const handleCenter = () => {
  canvasRef.value?.centerCanvas();
};

const handleModeChange = (newMode: 'pan' | 'select') => {
  mode.value = newMode;
};

const handleSelectionChange = (item?: Drawable) => {
  selectedItem.value = item;
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
      @selection-change="handleSelectionChange"
    />
    <Transition name="slide">
      <PropertiesEditor
        v-if="selectedItem"
        v-model:selectedItem="selectedItem"
      />
    </Transition>
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
    position: relative;
}

:deep(.toolbar) {
    grid-area: toolbar;
    z-index: 2;
}

:deep(.sidebar) {
    grid-area: sidebar;
    z-index: 2;
}

/* Add slide animation */
.slide-enter-active,
.slide-leave-active {
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  transform: translateX(0);
}
</style>