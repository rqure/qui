<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import ComponentSampleRenderer from './ComponentSampleRenderer.vue';
import type { CanvasNode, PaletteTemplate, Vector2 } from '../types';

type CanvasDropPayload = {
  componentId: string;
  position: Vector2;
};

const GRID_SIZE = 120;

const props = defineProps<{
  nodes: CanvasNode[];
  selectedNodeId: string | null;
  templates: Record<string, PaletteTemplate>;
}>();

const emit = defineEmits<{
  (event: 'node-selected', nodeId: string): void;
  (event: 'node-requested', payload: CanvasDropPayload): void;
  (event: 'node-updated', payload: { nodeId: string; position: Vector2 }): void;
  (event: 'node-move-end', payload: { nodeId: string; position: Vector2 }): void;
}>();

type DragState = {
  nodeId: string;
  origin: Vector2;
  pointerStart: Vector2;
  element: HTMLElement;
};

const dragState = reactive<{ current: DragState | null }>({ current: null });
const canvasRef = ref<HTMLDivElement | null>(null);

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer && (event.dataTransfer.dropEffect = 'copy');
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const componentId = event.dataTransfer?.getData('application/x-faceplate-component') || event.dataTransfer?.getData('text/plain');
  if (!componentId || !canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;

  const snapped = snapToGrid({ x: localX, y: localY });
  emit('node-requested', {
    componentId,
    position: snapped,
  });
}

function snapToGrid(point: Vector2): Vector2 {
  return {
    x: Math.max(0, Math.round(point.x / GRID_SIZE) * GRID_SIZE),
    y: Math.max(0, Math.round(point.y / GRID_SIZE) * GRID_SIZE),
  };
}

function handleNodePointerDown(event: PointerEvent, nodeId: string) {
  const target = event.currentTarget as HTMLElement | null;
  if (!target || event.button !== 0) return;

  emit('node-selected', nodeId);
  dragState.current = {
    nodeId,
    origin: { x: target.offsetLeft, y: target.offsetTop },
    pointerStart: { x: event.clientX, y: event.clientY },
    element: target,
  };

  target.setPointerCapture(event.pointerId);
}

function handlePointerMove(event: PointerEvent) {
  if (!dragState.current) return;

  const deltaX = event.clientX - dragState.current.pointerStart.x;
  const deltaY = event.clientY - dragState.current.pointerStart.y;
  const snapped = snapToGrid({
    x: dragState.current.origin.x + deltaX,
    y: dragState.current.origin.y + deltaY,
  });

  emit('node-updated', { nodeId: dragState.current.nodeId, position: snapped });
}

function handlePointerUp(event: PointerEvent) {
  if (!dragState.current) return;
  const { element, nodeId, origin, pointerStart } = dragState.current;
  element.releasePointerCapture(event.pointerId);
  const snapped = snapToGrid({
    x: origin.x + (event.clientX - pointerStart.x),
    y: origin.y + (event.clientY - pointerStart.y),
  });
  emit('node-move-end', { nodeId, position: snapped });
  dragState.current = null;
}

function setupListeners() {
  document.addEventListener('pointermove', handlePointerMove);
  document.addEventListener('pointerup', handlePointerUp);
}

function teardownListeners() {
  document.removeEventListener('pointermove', handlePointerMove);
  document.removeEventListener('pointerup', handlePointerUp);
}

onMounted(setupListeners);
onBeforeUnmount(teardownListeners);
</script>

<template>
  <section class="canvas" ref="canvasRef" @dragover="handleDragOver" @drop="handleDrop">
    <div class="canvas__grid"></div>
    <button
      v-for="node in props.nodes"
      :key="node.id"
      class="canvas__node"
      type="button"
      :class="{ 'canvas__node--selected': node.id === props.selectedNodeId }"
      :style="{ left: `${node.position.x}px`, top: `${node.position.y}px`, width: `${Math.max(node.size.x, GRID_SIZE)}px`, height: `${Math.max(node.size.y, GRID_SIZE)}px` }"
      @pointerdown="handleNodePointerDown($event, node.id)"
      @click.stop="emit('node-selected', node.id)"
    >
      <div class="canvas__node-header">
        <span class="canvas__node-title">{{ node.name }}</span>
        <span class="canvas__node-subtitle">{{ node.componentId }}</span>
      </div>
      <ComponentSampleRenderer
        :component-id="node.componentId"
        :name="node.name"
        :props="node.props"
        :template="props.templates[node.componentId]"
      />
    </button>
    <div v-if="!props.nodes.length" class="canvas__hint">
      Drag components here or drop them from the palette.
    </div>
  </section>
</template>

<style scoped>
.canvas {
  position: relative;
  flex: 1;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(12, 22, 32, 0.85), rgba(6, 12, 20, 0.92));
  overflow: hidden;
}

.canvas__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 120px 120px;
  pointer-events: none;
}

.canvas__node {
  position: absolute;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 12px;
  border: 1px solid rgba(0, 255, 194, 0.2);
  background: rgba(0, 18, 32, 0.78);
  color: inherit;
  padding: 16px;
  cursor: grab;
  box-shadow: 0 12px 20px rgba(0, 0, 0, 0.24);
  transition: border 0.18s ease, box-shadow 0.18s ease;
}

.canvas__node:active {
  cursor: grabbing;
}

.canvas__node--selected {
  border-color: rgba(0, 255, 194, 0.6);
  box-shadow: 0 18px 28px rgba(0, 255, 194, 0.18);
}

.canvas__node-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.canvas__node-title {
  font-size: 16px;
  font-weight: 600;
}

.canvas__node-subtitle {
  font-size: 12px;
  opacity: 0.65;
}

.canvas__hint {
  position: absolute;
  inset: auto 16px 16px 16px;
  text-align: center;
  font-size: 13px;
  opacity: 0.55;
  pointer-events: none;
}
</style>
