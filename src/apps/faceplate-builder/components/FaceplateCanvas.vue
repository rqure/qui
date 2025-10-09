<script setup lang="ts">
import { computed, ref } from 'vue';
import PrimitiveRenderer from './PrimitiveRenderer.vue';

export interface CanvasComponent {
  id: string | number;
  type: string;
  position: {
    x: number;
    y: number;
  };
  size: {
    x: number;
    y: number;
  };
  config: Record<string, any>;
  bindings?: Record<string, unknown>;
}

interface Props {
  components: CanvasComponent[];
  viewport?: { x: number; y: number };
  editMode?: boolean;
  selectedComponentId?: string | number | null;
  selectedComponentIds?: Set<string | number>;
  showGrid?: boolean;
  showViewportBoundary?: boolean;
  zoom?: number;
  pan?: { x: number; y: number };
}

const props = withDefaults(defineProps<Props>(), {
  editMode: false,
  selectedComponentId: null,
  showGrid: true,
  showViewportBoundary: false,
  zoom: 1,
  pan: () => ({ x: 0, y: 0 }),
});

const emit = defineEmits<{
  (event: 'component-click', payload: { id: string | number; event: PointerEvent; isMultiSelect: boolean }): void;
  (event: 'canvas-click', pointerEvent: PointerEvent): void;
  (event: 'component-drag-start', payload: { id: string | number; event: PointerEvent }): void;
  (event: 'component-drag', payload: { id: string | number; position: { x: number; y: number } }): void;
  (event: 'component-drag-end', payload: { id: string | number; position: { x: number; y: number } }): void;
}>();

const GRID_SIZE = 120;

const canvasRef = ref<HTMLDivElement | null>(null);

const contentSize = computed(() => {
  const baseWidth = props.viewport?.x ?? GRID_SIZE * 8;
  const baseHeight = props.viewport?.y ?? GRID_SIZE * 6;

  if (!props.components || props.components.length === 0) {
    return {
      width: baseWidth,
      height: baseHeight,
    };
  }

  const maxNodeWidth = Math.max(
    baseWidth,
    ...props.components.map((comp) => comp.position.x + Math.max(comp.size.x, GRID_SIZE)),
  );

  const maxNodeHeight = Math.max(
    baseHeight,
    ...props.components.map((comp) => comp.position.y + Math.max(comp.size.y, GRID_SIZE)),
  );

  return {
    width: maxNodeWidth + GRID_SIZE,
    height: maxNodeHeight + GRID_SIZE,
  };
});

const surfaceStyle = computed(() => ({
  width: `${contentSize.value.width}px`,
  height: `${contentSize.value.height}px`,
  transform: `scale(${props.zoom}) translate(${props.pan.x}px, ${props.pan.y}px)`,
  transformOrigin: 'top left',
}));

const viewportBoundaryStyle = computed(() => {
  if (!props.viewport) return {};
  return {
    width: `${props.viewport.x}px`,
    height: `${props.viewport.y}px`,
  };
});

function getComponentStyle(component: CanvasComponent) {
  return {
    left: `${component.position.x}px`,
    top: `${component.position.y}px`,
    width: `${component.size.x}px`,
    height: `${component.size.y}px`,
  };
}

function isComponentSelected(id: string | number): boolean {
  if (props.selectedComponentIds && props.selectedComponentIds.size > 0) {
    return props.selectedComponentIds.has(id);
  }
  return props.selectedComponentId === id;
}

function isComponentMultiSelected(id: string | number): boolean {
  return props.selectedComponentIds ? props.selectedComponentIds.has(id) : false;
}

function handleComponentPointerDown(event: PointerEvent, id: string | number) {
  if (!props.editMode) return;
  
  event.stopPropagation();
  const isMultiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
  emit('component-click', { id, event, isMultiSelect });
  emit('component-drag-start', { id, event });
}

function handleCanvasPointerDown(event: PointerEvent) {
  if (event.target === canvasRef.value || (event.target as HTMLElement).classList.contains('faceplate-canvas__surface')) {
    emit('canvas-click', event);
  }
}

defineExpose({
  canvasRef,
});
</script>

<template>
  <section 
    ref="canvasRef"
    class="faceplate-canvas" 
    :class="{ 'faceplate-canvas--edit-mode': editMode }"
    @pointerdown="handleCanvasPointerDown"
  >
    <div 
      class="faceplate-canvas__surface" 
      :style="surfaceStyle"
    >
      <!-- Grid overlay (builder only) -->
      <div v-if="showGrid && editMode" class="faceplate-canvas__grid"></div>

      <!-- Viewport boundary indicator (builder only) -->
      <div 
        v-if="showViewportBoundary && viewport && editMode" 
        class="faceplate-canvas__viewport-boundary"
        :style="viewportBoundaryStyle"
      ></div>

      <!-- Components -->
      <div
        v-for="component in components"
        :key="component.id"
        class="faceplate-canvas__component"
        :class="{
          'faceplate-canvas__component--selected': isComponentSelected(component.id) && editMode,
          'faceplate-canvas__component--multi-selected': isComponentMultiSelected(component.id) && editMode,
          'faceplate-canvas__component--interactive': editMode,
        }"
        :style="getComponentStyle(component)"
        :data-component-id="component.id"
        @pointerdown="handleComponentPointerDown($event, component.id)"
      >
        <PrimitiveRenderer
          class="faceplate-canvas__component-content"
          :type="component.type"
          :config="component.config"
          :bindings="component.bindings"
          :edit-mode="false"
        />
      </div>

      <!-- Hint for empty canvas -->
      <div v-if="!components.length && editMode" class="faceplate-canvas__hint">
        Drag components here or drop them from the palette.
      </div>
    </div>
  </section>
</template>

<style scoped>
.faceplate-canvas {
  position: relative;
  flex: 1;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.24);
}

.faceplate-canvas__surface {
  position: relative;
  min-width: 100%;
  min-height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, rgba(12, 22, 32, 0.85), rgba(6, 12, 20, 0.92));
  transition: transform 0.2s ease-out;
}

.faceplate-canvas__grid {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(
      to right,
      rgba(255, 255, 255, 0.04) 1px,
      transparent 1px
    ),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 120px 120px;
  pointer-events: none;
  z-index: 0;
}

.faceplate-canvas__viewport-boundary {
  position: absolute;
  top: 0;
  left: 0;
  border: 2px dashed rgba(0, 255, 194, 0.4);
  background: rgba(0, 255, 194, 0.02);
  pointer-events: none;
  z-index: 1;
  box-shadow: inset 0 0 0 1px rgba(0, 255, 194, 0.2);
}

.faceplate-canvas__component {
  position: absolute;
  display: flex;
  align-items: stretch;
  justify-content: stretch;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  transition: border 0.18s ease, box-shadow 0.18s ease;
}

.faceplate-canvas__component--interactive {
  cursor: grab;
}

.faceplate-canvas__component--interactive:active {
  cursor: grabbing;
}

.faceplate-canvas__component--selected {
  border-color: rgba(0, 255, 194, 0.6);
  box-shadow: 0 0 0 3px rgba(0, 255, 194, 0.18);
}

.faceplate-canvas__component--multi-selected {
  border-color: rgba(100, 150, 255, 0.6);
  box-shadow: 0 0 0 3px rgba(100, 150, 255, 0.18);
}

.faceplate-canvas__component--interactive:focus-visible {
  outline: none;
  border-color: rgba(0, 200, 255, 0.7);
}

.faceplate-canvas__component-content {
  width: 100%;
  height: 100%;
  pointer-events: none;
  border-radius: inherit;
}

.faceplate-canvas__hint {
  position: absolute;
  inset: auto 16px 16px 16px;
  text-align: center;
  font-size: 13px;
  opacity: 0.55;
  pointer-events: none;
}
</style>
