<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue';
import FaceplateCanvas, { type CanvasComponent } from './FaceplateCanvas.vue';
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
const canvasRef = ref<InstanceType<typeof FaceplateCanvas> | null>(null);
const wrapperRef = ref<HTMLElement | null>(null);

// Convert CanvasNode to CanvasComponent format
const canvasComponents = computed<CanvasComponent[]>(() => {
  return props.nodes.map(node => ({
    id: node.id,
    type: node.componentId,
    position: node.position,
    size: node.size,
    config: node.props,
  }));
});

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer && (event.dataTransfer.dropEffect = 'copy');
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  const componentId = event.dataTransfer?.getData('application/x-faceplate-component') || event.dataTransfer?.getData('text/plain');
  if (!componentId || !canvasRef.value?.canvasRef) return;

  const canvasEl = canvasRef.value.canvasRef;
  const rect = canvasEl.getBoundingClientRect();
  const localX = event.clientX - rect.left + canvasEl.scrollLeft;
  const localY = event.clientY - rect.top + canvasEl.scrollTop;

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

function handleComponentClick(payload: { id: string | number; event: PointerEvent; isMultiSelect: boolean }) {
  const nodeId = String(payload.id);
  const isMultiSelect = payload.isMultiSelect;
  
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
    const node = props.nodes.find((candidate) => candidate.id === id);
    if (node) {
      originMap.set(id, { ...node.position });
    }
  });

  const target = payload.event.currentTarget as HTMLElement | null;
  if (!target) return;

  dragState.current = {
    pointerStart: { x: payload.event.clientX, y: payload.event.clientY },
    element: target,
    selection: Array.from(selection),
    origins: originMap,
  };

  target.setPointerCapture(payload.event.pointerId);
}

function handleCanvasClick(pointerEvent: PointerEvent) {
  emit('canvas-clicked');
}

function handleCanvasPointerDown(event: PointerEvent) {
  if (!canvasRef.value?.canvasRef) return;
  
  // Only handle canvas background clicks, not component clicks
  const target = event.target as HTMLElement;
  if (target.closest('.faceplate-canvas__component') || target.classList.contains('faceplate-canvas__component')) {
    return;
  }

  const canvasEl = canvasRef.value.canvasRef;
  const rect = canvasEl.getBoundingClientRect();
  const point = {
    x: event.clientX - rect.left + canvasEl.scrollLeft,
    y: event.clientY - rect.top + canvasEl.scrollTop,
  };
  
  selectBoxState.start = point;
  selectBoxState.current = point;
  selectBoxState.isActive = true;
}



function handlePointerMove(event: PointerEvent) {
  // Handle drag-select box
  if (selectBoxState.isActive && canvasRef.value?.canvasRef) {
    const canvasEl = canvasRef.value.canvasRef;
    const rect = canvasEl.getBoundingClientRect();
    selectBoxState.current = {
      x: event.clientX - rect.left + canvasEl.scrollLeft,
      y: event.clientY - rect.top + canvasEl.scrollTop,
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
  <section 
    ref="wrapperRef"
    class="builder-canvas-wrapper"
    @dragover="handleDragOver"
    @drop="handleDrop"
  >
    <FaceplateCanvas
      ref="canvasRef"
      :components="canvasComponents"
      :viewport="viewport"
      :edit-mode="true"
      :selected-component-id="selectedNodeId"
      :selected-component-ids="selectedNodeIds"
      :show-grid="true"
      :show-viewport-boundary="!!viewport"
      @component-click="handleComponentClick"
      @canvas-click="handleCanvasClick"
      @pointerdown.capture="handleCanvasPointerDown"
    />
    <!-- Drag-select box overlay (positioned absolutely over canvas) -->
    <div 
      v-if="selectBoxState.isActive"
      class="builder-canvas-wrapper__select-box"
      :style="{
        left: `${Math.min(selectBoxState.start.x, selectBoxState.current.x)}px`,
        top: `${Math.min(selectBoxState.start.y, selectBoxState.current.y)}px`,
        width: `${Math.abs(selectBoxState.current.x - selectBoxState.start.x)}px`,
        height: `${Math.abs(selectBoxState.current.y - selectBoxState.start.y)}px`,
      }"
    ></div>
  </section>
</template>

<style scoped>
.builder-canvas-wrapper {
  position: relative;
  flex: 1;
  overflow: hidden;
}

.builder-canvas-wrapper__select-box {
  position: absolute;
  border: 2px dashed rgba(100, 150, 255, 0.8);
  background: rgba(100, 150, 255, 0.15);
  pointer-events: none;
  z-index: 1000;
}
</style>
