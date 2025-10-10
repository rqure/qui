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
  parentId?: string | number | null;
  children?: CanvasComponent[];
}

interface Props {
  components: CanvasComponent[];
  viewport?: { x: number; y: number };
  editMode?: boolean;
  selectedComponentId?: string | number | null;
  selectedComponentIds?: Set<string | number>;
  dropTargetContainerId?: string | number | null; // Container being hovered during drag
  showGrid?: boolean;
  showViewportBoundary?: boolean;
  zoom?: number;
  pan?: { x: number; y: number };
}

const props = withDefaults(defineProps<Props>(), {
  editMode: false,
  selectedComponentId: null,
  dropTargetContainerId: null,
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

// Build component tree with parent-child relationships
const componentTree = computed(() => {
  const componentsById = new Map<string | number, CanvasComponent>();
  const rootComponents: CanvasComponent[] = [];
  
  // First pass: clone all components and index by ID, preserving existing children arrays
  props.components.forEach(comp => {
    componentsById.set(comp.id, { ...comp, children: comp.children || [] });
  });
  
  // Second pass: build tree structure (only if children aren't already provided)
  props.components.forEach(comp => {
    const component = componentsById.get(comp.id)!;
    
    // If component already has children from input, skip tree building for it
    if (comp.children && comp.children.length > 0) {
      // Component already has its children, just add to root if no parent
      if (!comp.parentId) {
        rootComponents.push(component);
      }
      return;
    }
    
    if (comp.parentId && componentsById.has(comp.parentId)) {
      const parent = componentsById.get(comp.parentId)!;
      if (!parent.children) parent.children = [];
      parent.children.push(component);
    } else {
      rootComponents.push(component);
    }
  });
  
  if (import.meta.env.DEV) {
    console.log('FaceplateCanvas - componentTree:', rootComponents);
    console.log('FaceplateCanvas - componentsById:', Array.from(componentsById.entries()));
  }
  
  return rootComponents;
});

// Check if component is a container
function isContainer(type: string): boolean {
  return type === 'primitive.container' || type === 'primitive.container.tabs';
}

// Calculate automatic child layout within container
function calculateChildLayout(container: CanvasComponent, children: CanvasComponent[]): CanvasComponent[] {
  if (!children || children.length === 0) return [];
  
  const config = container.config || {};
  const padding = Number(config.padding) || 16;
  const gap = Number(config.gap) || 12;
  const direction = config.layoutDirection === 'horizontal' ? 'horizontal' : 'vertical';
  const wrap = Boolean(config.wrap);
  
  const containerWidth = container.size.x;
  const containerHeight = container.size.y;
  const availableWidth = containerWidth - (padding * 2);
  const availableHeight = containerHeight - (padding * 2);
  
  let currentX = padding;
  let currentY = padding;
  let rowMaxHeight = 0;
  let colMaxWidth = 0;
  
  return children.map(child => {
    const childWidth = child.size.x;
    const childHeight = child.size.y;
    
    // Calculate position based on layout direction
    if (direction === 'horizontal') {
      // Check if we need to wrap
      if (wrap && currentX + childWidth > availableWidth + padding && currentX > padding) {
        currentX = padding;
        currentY += rowMaxHeight + gap;
        rowMaxHeight = 0;
      }
      
      const position = { x: currentX, y: currentY };
      currentX += childWidth + gap;
      rowMaxHeight = Math.max(rowMaxHeight, childHeight);
      
      return { ...child, position };
    } else {
      // Vertical layout
      if (wrap && currentY + childHeight > availableHeight + padding && currentY > padding) {
        currentY = padding;
        currentX += colMaxWidth + gap;
        colMaxWidth = 0;
      }
      
      const position = { x: currentX, y: currentY };
      currentY += childHeight + gap;
      colMaxWidth = Math.max(colMaxWidth, childWidth);
      
      return { ...child, position };
    }
  });
}

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
  
  // Don't stopPropagation - let it bubble to BuilderCanvas for drag handling
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

// Recursive component definition for rendering nested components
const ComponentNode = {
  name: 'ComponentNode',
  components: {
    PrimitiveRenderer,
  },
  props: {
    component: Object as () => CanvasComponent,
    editMode: Boolean,
    isSelected: Boolean,
    isMultiSelected: Boolean,
    parentVisible: { type: Boolean, default: true },
    parentOpacity: { type: Number, default: 1 },
    isInsideContainer: { type: Boolean, default: false },
    dropTargetContainerId: { type: [String, Number], default: null },
  },
  emits: ['component-click', 'component-drag-start'],
  setup(props: any, { emit }: any) {
    const isContainerType = computed(() => {
      return isContainer(props.component.type);
    });
    
    const isDropTarget = computed(() => {
      return isContainerType.value && props.dropTargetContainerId === props.component.id;
    });
    
    // Check if this component should be visible (cascades from parent)
    const isVisible = computed(() => {
      if (!props.parentVisible) return false;
      // Check if component has visible property (for containers and other components)
      const visible = props.component.config?.visible ?? true;
      // Also check bindings if present
      if (props.component.bindings?.visible !== undefined) {
        return props.component.bindings.visible && visible;
      }
      return visible;
    });
    
    // Calculate effective opacity (cascades from parent)
    const effectiveOpacity = computed(() => {
      const componentOpacity = props.component.config?.opacity ?? 1;
      const bindingOpacity = props.component.bindings?.opacity ?? 1;
      return props.parentOpacity * componentOpacity * bindingOpacity;
    });
    
    const layoutChildren = computed(() => {
      // When rendering in runtime (not edit mode), just return children as-is
      // Flexbox will handle the layout based on container config
      if (!isContainerType.value || !props.component.children?.length) {
        return props.component.children || [];
      }
      
      // In edit mode, we still calculate positions for absolute positioning
      // In runtime/view mode, we just return the children and let flexbox position them
      if (!props.editMode) {
        return props.component.children;
      }
      
      return calculateChildLayout(props.component, props.component.children);
    });
    
    const componentStyle = computed(() => {
      // If inside a container (in runtime/view mode), don't use absolute positioning
      // Let flexbox handle it
      if (props.isInsideContainer && !props.editMode) {
        const style: Record<string, any> = {
          width: `${props.component.size.x}px`,
          height: `${props.component.size.y}px`,
          // Don't set position - let it be default (static) for flexbox
        };
        if (effectiveOpacity.value !== 1) {
          style.opacity = effectiveOpacity.value;
        }
        return style;
      }
      
      // Top-level components or edit mode use absolute positioning
      const baseStyle = getComponentStyle(props.component);
      if (effectiveOpacity.value !== 1) {
        return {
          ...baseStyle,
          opacity: effectiveOpacity.value,
        };
      }
      return baseStyle;
    });
    
    const handlePointerDown = (event: PointerEvent) => {
      if (!props.editMode) return;
      const isMultiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
      emit('component-click', { id: props.component.id, event, isMultiSelect });
      emit('component-drag-start', { id: props.component.id, event });
    };
    
    return {
      isContainerType,
      isDropTarget,
      isVisible,
      effectiveOpacity,
      layoutChildren,
      componentStyle,
      handlePointerDown,
    };
  },
  template: `
    <div
      v-show="isVisible"
      class="faceplate-canvas__component"
      :class="{
        'faceplate-canvas__component--selected': isSelected && editMode,
        'faceplate-canvas__component--multi-selected': isMultiSelected && editMode,
        'faceplate-canvas__component--interactive': editMode,
        'faceplate-canvas__component--container': isContainerType,
        'faceplate-canvas__component--inside-container': isInsideContainer,
        'faceplate-canvas__component--drop-target': isDropTarget,
      }"
      :style="componentStyle"
      :data-component-id="component.id"
      @pointerdown="handlePointerDown"
      @click.stop
    >
      <PrimitiveRenderer
        class="faceplate-canvas__component-content"
        :type="component.type"
        :config="component.config"
        :bindings="component.bindings"
        :edit-mode="editMode"
      >
        <!-- Render children inside container -->
        <template v-if="isContainerType && layoutChildren.length">
          <ComponentNode
            v-for="child in layoutChildren"
            :key="child.id"
            :component="child"
            :edit-mode="editMode"
            :is-selected="false"
            :is-multi-selected="false"
            :parent-visible="isVisible"
            :parent-opacity="effectiveOpacity"
            :is-inside-container="true"
            :drop-target-container-id="dropTargetContainerId"
            @component-click="$emit('component-click', $event)"
            @component-drag-start="$emit('component-drag-start', $event)"
          />
        </template>
      </PrimitiveRenderer>
    </div>
  `,
};
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

      <!-- Components (recursive tree rendering) -->
      <template v-for="component in componentTree" :key="component.id">
        <ComponentNode
          :component="component"
          :edit-mode="editMode"
          :is-selected="isComponentSelected(component.id)"
          :is-multi-selected="isComponentMultiSelected(component.id)"
          :drop-target-container-id="dropTargetContainerId"
          @component-click="emit('component-click', $event)"
          @component-drag-start="emit('component-drag-start', $event)"
        />
      </template>

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
  background-image: 
    /* Major grid (every 10 cells = 100px) */
    linear-gradient(to right, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.08) 1px, transparent 1px),
    /* Minor grid (every cell = 10px) */
    linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 10px 10px, 10px 10px;
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
  padding: 0;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  transition: border 0.18s ease, box-shadow 0.18s ease;
  pointer-events: auto;
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
  border-radius: inherit;
}

/* In edit mode, prevent interactions with component internals so we can drag/select the wrapper */
.faceplate-canvas--edit-mode .faceplate-canvas__component-content {
  pointer-events: none;
}

/* Container specific styles */
.faceplate-canvas__component--container .faceplate-canvas__component-content {
  position: relative;
  /* Allow the PrimitiveRenderer to use flex layout */
  display: flex;
  flex-direction: column;
}

/* Components inside containers use flexbox positioning, not absolute */
/* Only apply in runtime (when not in edit mode) */
.faceplate-canvas:not(.faceplate-canvas--edit-mode) .faceplate-canvas__component--inside-container {
  /* Don't override position - let it be default for flexbox */
  position: static;
  /* flex-shrink: 0 prevents children from shrinking below their specified size */
  flex-shrink: 0;
}

/* In edit mode, keep absolute positioning for manual layout */
.faceplate-canvas--edit-mode .faceplate-canvas__component--inside-container {
  position: absolute;
  opacity: 0.85;
  border: 1px dashed rgba(100, 150, 255, 0.4);
}

/* Drop target highlighting during drag-to-contain */
.faceplate-canvas__component--drop-target {
  box-shadow: inset 0 0 0 3px rgba(0, 255, 194, 0.6), 0 0 12px rgba(0, 255, 194, 0.4) !important;
  animation: pulse-glow 1.5s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% {
    box-shadow: inset 0 0 0 3px rgba(0, 255, 194, 0.6), 0 0 12px rgba(0, 255, 194, 0.4);
  }
  50% {
    box-shadow: inset 0 0 0 3px rgba(0, 255, 194, 0.8), 0 0 16px rgba(0, 255, 194, 0.6);
  }
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
