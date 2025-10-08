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
  viewport?: Vector2;
}>();

const emit = defineEmits<{
  (event: 'node-selected', payload: { nodeId: string; isMultiSelect: boolean }): void;
  (event: 'node-requested', payload: CanvasDropPayload): void;
  (event: 'nodes-updated', updates: Array<{ nodeId: string; position: Vector2 }>): void;
  (event: 'nodes-move-end', updates: Array<{ nodeId: string; position: Vector2 }>): void;
  (event: 'canvas-clicked'): void;
  (event: 'drag-select-complete', selectedIds: string[]): void;
}>();

type DragState = {
  pointerStart: Vector2;
  element: HTMLElement;
  selection: string[];
  origins: Map<string, Vector2>;
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
  const baseWidth = props.viewport?.x ?? GRID_SIZE * 8;
  const baseHeight = props.viewport?.y ?? GRID_SIZE * 6;

  if (!props.nodes || props.nodes.length === 0) {
    return {
      width: baseWidth,
      height: baseHeight,
    };
  }

  const maxNodeWidth = Math.max(
    baseWidth,
    ...props.nodes.map((node) => node.position.x + Math.max(node.size.x, GRID_SIZE)),
  );

  const maxNodeHeight = Math.max(
    baseHeight,
    ...props.nodes.map((node) => node.position.y + Math.max(node.size.y, GRID_SIZE)),
  );

  return {
    width: maxNodeWidth + GRID_SIZE,
    height: maxNodeHeight + GRID_SIZE,
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

  const selection = new Set(props.selectedNodeIds ? Array.from(props.selectedNodeIds) : []);
  if (isMultiSelect) {
    if (selection.has(nodeId)) {
      selection.delete(nodeId);
    } else {
      selection.add(nodeId);
    }
    if (!selection.size) {
      selection.add(nodeId);
    }
  } else {
    selection.clear();
    selection.add(nodeId);
  }

  const originMap = new Map<string, Vector2>();
  selection.forEach((id) => {
    const nodeEl = id === nodeId ? target : canvasRef.value?.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
    if (nodeEl) {
      originMap.set(id, { x: nodeEl.offsetLeft, y: nodeEl.offsetTop });
    } else {
      const node = props.nodes.find((candidate) => candidate.id === id);
      if (node) {
        originMap.set(id, { ...node.position });
      }
    }
  });

  dragState.current = {
    pointerStart: { x: event.clientX, y: event.clientY },
    element: target,
    selection: Array.from(selection),
    origins: originMap,
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

  const { origins, selection, pointerStart } = dragState.current;
  const primaryOrigin = origins.get(selection[0]);
  if (!primaryOrigin) {
    return;
  }

  const deltaX = event.clientX - pointerStart.x;
  const deltaY = event.clientY - pointerStart.y;
  const snappedPrimary = snapToGrid({
    x: primaryOrigin.x + deltaX,
    y: primaryOrigin.y + deltaY,
  });

  const shift = {
    x: snappedPrimary.x - primaryOrigin.x,
    y: snappedPrimary.y - primaryOrigin.y,
  };

  const updates = selection.map((id) => {
    const origin = origins.get(id);
    if (!origin) {
      return null;
    }
    return {
      nodeId: id,
      position: {
        x: Math.max(0, origin.x + shift.x),
        y: Math.max(0, origin.y + shift.y),
      },
    };
  }).filter((update): update is { nodeId: string; position: Vector2 } => Boolean(update));

  if (updates.length) {
    emit('nodes-updated', updates);
  }
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
  const { element, selection, origins, pointerStart } = dragState.current;
  element.releasePointerCapture(event.pointerId);

  const primaryOrigin = origins.get(selection[0]);
  if (primaryOrigin) {
    const snappedPrimary = snapToGrid({
      x: primaryOrigin.x + (event.clientX - pointerStart.x),
      y: primaryOrigin.y + (event.clientY - pointerStart.y),
    });
    const shift = {
      x: snappedPrimary.x - primaryOrigin.x,
      y: snappedPrimary.y - primaryOrigin.y,
    };

    const updates = selection.map((id) => {
      const origin = origins.get(id);
      if (!origin) {
        return null;
      }
      return {
        nodeId: id,
        position: {
          x: Math.max(0, origin.x + shift.x),
          y: Math.max(0, origin.y + shift.y),
        },
      };
    }).filter((update): update is { nodeId: string; position: Vector2 } => Boolean(update));

    if (updates.length) {
      emit('nodes-move-end', updates);
    }
  }

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
        :data-node-id="node.id"
  :style="{ left: `${node.position.x}px`, top: `${node.position.y}px`, width: `${node.size.x}px`, height: `${node.size.y}px` }"
        @pointerdown="handleNodePointerDown($event, node.id)"
        @click.stop
      >
        <ComponentSampleRenderer
          class="canvas__node-preview"
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
  align-items: stretch;
  justify-content: stretch;
  padding: 0;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  cursor: grab;
  transition: border 0.18s ease, box-shadow 0.18s ease;
}

.canvas__node:focus-visible {
  outline: none;
  border-color: rgba(0, 200, 255, 0.7);
}

.canvas__node:active {
  cursor: grabbing;
}

.canvas__node--selected {
  border-color: rgba(0, 255, 194, 0.6);
  box-shadow: 0 0 0 3px rgba(0, 255, 194, 0.18);
}

.canvas__node--multi-selected {
  border-color: rgba(100, 150, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.18);
}

.canvas__node-preview {
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: inherit;
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
