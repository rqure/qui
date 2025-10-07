<script setup lang="ts">
import { computed } from 'vue';

type PreviewNode = {
  id: string;
  name: string;
  componentId: string;
  position: { x: number; y: number };
  size: { x: number; y: number };
  props: Record<string, unknown>;
};

const props = defineProps<{
  nodes: PreviewNode[];
}>();

const previewStyle = computed(() => ({
  minHeight: `${Math.max(360, Math.max(...props.nodes.map((node) => node.position.y + node.size.y), 0) + 80)}px`,
}));
</script>

<template>
  <section class="preview">
    <header class="preview__header">
      <h2>Preview</h2>
      <p>Layout rendered with sample data. Live bindings will update once configured.</p>
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
        <header>
          <strong>{{ node.name }}</strong>
          <span>{{ node.componentId }}</span>
        </header>
        <div class="preview__body">
          <pre>{{ JSON.stringify(node.props, null, 2) }}</pre>
        </div>
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
  flex-direction: column;
  border-radius: 12px;
  background: rgba(0, 22, 32, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 18px 28px rgba(0, 0, 0, 0.24);
  overflow: hidden;
}

.preview__widget header {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview__widget header strong {
  font-size: 14px;
}

.preview__widget header span {
  font-size: 12px;
  opacity: 0.65;
}

.preview__body {
  flex: 1;
  padding: 12px 14px;
  font-size: 12px;
  opacity: 0.75;
}

.preview__body pre {
  margin: 0;
  font: 500 12px/1.4 "Fira Code", monospace;
}
</style>
