<script setup lang="ts">
import { computed } from 'vue';
import PrimitiveRenderer from './PrimitiveRenderer.vue';
import type { CanvasNode, PaletteTemplate } from '../types';

const props = defineProps<{
  nodes: CanvasNode[];
  templates: Record<string, PaletteTemplate>;
}>();

const previewMetrics = computed(() => {
  if (!props.nodes.length) {
    return { width: 480, height: 360 };
  }

  const maxX = Math.max(...props.nodes.map((node) => node.position.x + node.size.x));
  const maxY = Math.max(...props.nodes.map((node) => node.position.y + node.size.y));

  return {
    width: Math.max(480, maxX + 120),
    height: Math.max(360, maxY + 120),
  };
});

const previewStyle = computed(() => ({
  minWidth: `${previewMetrics.value.width}px`,
  minHeight: `${previewMetrics.value.height}px`,
}));
</script>

<template>
  <section class="preview">
    <header class="preview__header">
      <h2>Preview</h2>
      <p>Arrange components on the canvas; this preview mirrors their layout with sample styling.</p>
    </header>
    <div class="preview__stage" :style="previewStyle">
      <div class="preview__grid"></div>
      <div v-if="!props.nodes.length" class="preview__placeholder">
        Drag components onto the canvas to see them rendered here.
      </div>
      <article
        v-for="node in props.nodes"
        :key="node.id"
        class="preview__widget"
        :style="{
          left: `${node.position.x}px`,
          top: `${node.position.y}px`,
          width: `${node.size.x}px`,
          height: `${node.size.y}px`,
        }"
      >
        <PrimitiveRenderer
          :type="node.componentId"
          :config="node.props"
          :edit-mode="true"
        />
      </article>
    </div>
  </section>
</template>

<style scoped>
.preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
  background: rgba(2, 12, 18, 0.6);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(12px);
}

.preview__header h2 {
  margin: 0;
  font-size: 16px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.preview__header p {
  margin: 6px 0 0;
  font-size: 12px;
  opacity: 0.65;
}

.preview__stage {
  position: relative;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.22);
  overflow: auto;
}

.preview__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 120px 120px;
  pointer-events: none;
}

.preview__placeholder {
  padding: 36px;
  text-align: center;
  opacity: 0.65;
  font-size: 14px;
}

.preview__widget {
  position: absolute;
  display: flex;
  border-radius: 12px;
}
</style>
