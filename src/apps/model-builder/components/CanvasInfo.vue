<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  zoom: number;
  mouseX: number;
  mouseY: number;
  canvasWidth: number;
  canvasHeight: number;
}>();
</script>

<template>
  <div class="canvas-info">
    <div class="info-group">
      <span class="info-label">Zoom:</span>
      <span class="info-value">{{ zoom.toFixed(2) }}</span>
    </div>
    <div class="info-group">
      <span class="info-label">Mouse:</span>
      <span class="info-value">{{ mouseX.toFixed(0) }}, {{ mouseY.toFixed(0) }}</span>
    </div>
    <div class="info-group">
      <span class="info-label">Size:</span>
      <span class="info-value">{{ canvasWidth.toFixed(0) }} × {{ canvasHeight.toFixed(0) }}</span>
    </div>
  </div>
</template>

<style scoped>
.canvas-info {
  position: absolute;
  bottom: 10px;
  left: 10px;
  z-index: 1000;
  background: var(--qui-bg-secondary);
  border: var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  padding: 8px;
  display: flex;
  gap: 16px;
  font-family: var(--qui-font-family);
  font-size: var(--qui-font-size-small);
}

.info-group {
  display: flex;
  gap: 4px;
}

.info-label {
  color: var(--qui-text-secondary);
}

.info-value {
  color: var(--qui-text-primary);
  font-family: monospace;
}
</style>
