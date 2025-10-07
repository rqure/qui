<script setup lang="ts">
import { computed } from 'vue';
import ComponentSampleRenderer from './ComponentSampleRenderer.vue';
import type { CanvasNode, PaletteTemplate } from '../types';

const props = defineProps<{
  nodes: CanvasNode[];
  templates: Record<string, PaletteTemplate>;
}>();

const previewStyle = computed(() => ({
  minHeight: `${Math.max(360, Math.max(...props.nodes.map((node) => node.position.y + node.size.y), 0) + 120)}px`,
}));
</script>

<template>
  <section class="preview">
    <header class="preview__header">
      <h2>Preview</h2>
      <p>Arrange components on the canvas; this preview mirrors their layout with sample styling.</p>
    </header>
    <div class="preview__stage" :style="previewStyle">
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
        <ComponentSampleRenderer
          :component-id="node.componentId"
          :name="node.name"
          :props="node.props"
          :template="props.templates[node.componentId]"
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
  border: 1px dashed rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.28);
  overflow: hidden;
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
