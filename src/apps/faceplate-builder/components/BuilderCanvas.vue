<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
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
  selectedNodeIds?: Set<string>;
  templates: Record<string, PaletteTemplate>;
}>();

const emit = defineEmits<{
  (event: 'node-selected', payload: { nodeId: string; isMultiSelect: boolean }): void;
  (event: 'node-requested', payload: CanvasDropPayload): void;
  (event: 'node-updated', payload: { nodeId: string; position: Vector2 }): void;
  (event: 'node-move-end', payload: { nodeId: string; position: Vector2 }): void;
  (event: 'canvas-clicked'): void;
  (event: 'drag-select-complete', selectedIds: string[]): void;
}>();

type DragState = {
  nodeId: string;
  origin: Vector2;
  pointerStart: Vector2;
  element: HTMLElement;
};

type SelectBoxState = {
  start: Vector2;
  current: Vector2;
  isActive: boolean;
};

const dragState = reactive<{ current: DragState | null }>({ current: null });
const selectBoxState = reactive<SelectBoxState>({ start: { x: 0, y: 0 }, current: { x: 0, y: 0 }, isActive: false });
const canvasRef = ref<HTMLDivElement | null>(null);

const contentSize = computed(() => {
  if (!props.nodes || props.nodes.length === 0) {
    return {
      width: GRID_SIZE * 8,
      height: GRID_SIZE * 6,
    };
  }

  const maxWidth = Math.max(
    ...props.nodes.map((node) => node.position.x + Math.max(node.size.x, GRID_SIZE)),
    GRID_SIZE * 6,
  );

  const maxHeight = Math.max(
    ...props.nodes.map((node) => node.position.y + Math.max(node.size.y, GRID_SIZE)),
    GRID_SIZE * 5,
  );

  return {
    width: maxWidth + GRID_SIZE,
    height: maxHeight + GRID_SIZE,
  };
});

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
  event.stopPropagation();

  // Check if shift key is pressed for multi-selection
  const isMultiSelect = event.shiftKey;
  emit('node-selected', { nodeId, isMultiSelect });
  
  dragState.current = {
    nodeId,
    origin: { x: target.offsetLeft, y: target.offsetTop },
    pointerStart: { x: event.clientX, y: event.clientY },
    element: target,
  };

  target.setPointerCapture(event.pointerId);
}

function handleCanvasPointerDown(event: PointerEvent) {
  if (!canvasRef.value || event.target !== canvasRef.value) return;

  const rect = canvasRef.value.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
  
  selectBoxState.start = point;
  selectBoxState.current = point;
  selectBoxState.isActive = true;
}

function handleCanvasClick(event: MouseEvent) {
  if (!canvasRef.value) return;
  if (event.target === canvasRef.value) {
    emit('canvas-clicked');
  }
}

function handlePointerMove(event: PointerEvent) {
  // Handle drag-select box
  if (selectBoxState.isActive && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect();
    selectBoxState.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
    return;
  }
  
  // Handle node dragging
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
  // Handle drag-select completion
  if (selectBoxState.isActive) {
    const box = getSelectBox();
    const selectedIds: string[] = [];
    
    // Check which nodes intersect with the selection box
    for (const node of props.nodes) {
      const nodeBox = {
        x: node.position.x,
        y: node.position.y,
        width: node.size.x,
        height: node.size.y,
      };
      
      if (boxesIntersect(box, nodeBox)) {
        selectedIds.push(node.id);
      }
    }
    
    // Emit selection event with multiple nodes
    if (selectedIds.length > 0) {
      emit('drag-select-complete', selectedIds);
    }
    
    selectBoxState.isActive = false;
    return;
  }
  
  // Handle node drag completion
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

function getSelectBox() {
  const minX = Math.min(selectBoxState.start.x, selectBoxState.current.x);
  const minY = Math.min(selectBoxState.start.y, selectBoxState.current.y);
  const maxX = Math.max(selectBoxState.start.x, selectBoxState.current.x);
  const maxY = Math.max(selectBoxState.start.y, selectBoxState.current.y);
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function boxesIntersect(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number }
): boolean {
  return !(
    box1.x + box1.width < box2.x ||
    box2.x + box2.width < box1.x ||
    box1.y + box1.height < box2.y ||
    box2.y + box2.height < box1.y
  );
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
  <section class="canvas" @click="handleCanvasClick">
    <div
      ref="canvasRef"
      class="canvas__surface"
      :style="{ width: `${contentSize.width}px`, height: `${contentSize.height}px` }"
      @dragover="handleDragOver"
      @drop="handleDrop"
      @pointerdown="handleCanvasPointerDown"
    >
      <div class="canvas__grid"></div>
    
    <!-- Drag-select box -->
    <div 
      v-if="selectBoxState.isActive" 
      class="canvas__select-box"
      :style="{
        left: `${Math.min(selectBoxState.start.x, selectBoxState.current.x)}px`,
        top: `${Math.min(selectBoxState.start.y, selectBoxState.current.y)}px`,
        width: `${Math.abs(selectBoxState.current.x - selectBoxState.start.x)}px`,
        height: `${Math.abs(selectBoxState.current.y - selectBoxState.start.y)}px`,
      }"
    ></div>
    <button
      v-for="node in props.nodes"
      :key="node.id"
      class="canvas__node"
      type="button"
      :class="{ 
        'canvas__node--selected': node.id === props.selectedNodeId,
        'canvas__node--multi-selected': props.selectedNodeIds?.has(node.id)
      }"
      :style="{ left: `${node.position.x}px`, top: `${node.position.y}px`, width: `${Math.max(node.size.x, GRID_SIZE)}px`, height: `${Math.max(node.size.y, GRID_SIZE)}px` }"
      @pointerdown="handleNodePointerDown($event, node.id)"
      @click.stop
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
    </div>
  </section>
</template>

<style scoped>
.canvas {
  position: relative;
  flex: 1;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.24);
}

.canvas__surface {
  position: relative;
  min-width: 100%;
  min-height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(12, 22, 32, 0.85), rgba(6, 12, 20, 0.92));
}

.canvas__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
  background-size: 120px 120px;
  pointer-events: none;
  border-radius: inherit;
}

.canvas__select-box {
  position: absolute;
  border: 2px dashed rgba(100, 150, 255, 0.8);
  background: rgba(100, 150, 255, 0.15);
  pointer-events: none;
  z-index: 1000;
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

.canvas__node--multi-selected {
  border-color: rgba(100, 150, 255, 0.6);
  box-shadow: 0 12px 20px rgba(100, 150, 255, 0.15);
  background: rgba(100, 150, 255, 0.08);
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
