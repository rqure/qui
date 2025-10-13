<script setup lang="ts">
import { computed } from 'vue';
import PrimitiveRenderer from './PrimitiveRenderer.vue';
import { useComponentNode } from '../composables/useComponentNode';
import type { CanvasComponent } from './FaceplateCanvas.vue';

interface Props {
  component: CanvasComponent;
  editMode: boolean;
  isSelected: boolean;
  isMultiSelected: boolean;
  parentVisible?: boolean;
  parentOpacity?: number;
  isInsideContainer?: boolean;
  dropTargetContainerId?: string | number | null;
}

const props = withDefaults(defineProps<Props>(), {
  parentVisible: true,
  parentOpacity: 1,
  isInsideContainer: false,
  dropTargetContainerId: null,
});

const emit = defineEmits<{
  'component-click': [payload: { id: string | number; event: PointerEvent; isMultiSelect: boolean }];
  'component-drag-start': [payload: { id: string | number; event: PointerEvent }];
  'component-contextmenu': [payload: { id: string | number; event: MouseEvent }];
  'event-triggered': [payload: any];
}>();

const {
  isContainerType,
  isDropTarget,
  isVisible,
  effectiveOpacity,
  componentStyle,
} = useComponentNode({
  component: props.component,
  editMode: props.editMode,
  parentVisible: props.parentVisible,
  parentOpacity: props.parentOpacity,
  isInsideContainer: props.isInsideContainer,
  dropTargetContainerId: props.dropTargetContainerId,
});

// Calculate child layout for containers in edit mode
const layoutChildren = computed(() => {
  if (!isContainerType.value || !props.component.children?.length) {
    return props.component.children || [];
  }

  // In runtime mode, return children as-is for flexbox layout
  if (!props.editMode) {
    return props.component.children;
  }

  // In edit mode, calculate positions for absolute positioning
  return calculateChildLayout(props.component, props.component.children);
});

// Helper function to calculate child layout (extracted from FaceplateCanvas)
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

function handlePointerDown(event: PointerEvent) {
  if (!props.editMode) return;
  const isMultiSelect = event.shiftKey || event.ctrlKey || event.metaKey;
  emit('component-click', { id: props.component.id, event, isMultiSelect });
  emit('component-drag-start', { id: props.component.id, event });
}

function handleContextMenu(event: MouseEvent) {
  if (!props.editMode) return;
  event.preventDefault();
  event.stopPropagation();
  emit('component-contextmenu', { id: props.component.id, event });
}
</script>

<template>
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
      'faceplate-canvas__component--locked': component.locked && editMode,
    }"
    :style="componentStyle"
    :data-component-id="component.id"
    @pointerdown="handlePointerDown"
    @contextmenu="handleContextMenu"
    @click.stop
  >
    <!-- Drop zone overlay for containers -->
    <div
      v-if="isDropTarget && editMode"
      class="faceplate-canvas__drop-zone-overlay"
    >
      <div class="faceplate-canvas__drop-zone-content">
        <div class="faceplate-canvas__drop-zone-icon">📦</div>
        <div class="faceplate-canvas__drop-zone-text">Drop here to add to container</div>
      </div>
    </div>

    <PrimitiveRenderer
      class="faceplate-canvas__component-content"
      :type="component.type"
      :config="component.config"
      :bindings="component.bindings"
      :edit-mode="editMode"
      :event-handlers="component.eventHandlers"
      @event-triggered="$emit('event-triggered', $event)"
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
          @component-contextmenu="$emit('component-contextmenu', $event)"
          @event-triggered="$emit('event-triggered', $event)"
        />
      </template>
    </PrimitiveRenderer>

    <!-- Lock indicator -->
    <div v-if="component.locked && editMode" class="faceplate-canvas__lock-indicator">
      🔒
    </div>
  </div>
</template>

<style scoped>
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

.faceplate-canvas__component--locked {
  border-color: rgba(255, 200, 100, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(255, 200, 100, 0.15) !important;
  cursor: not-allowed !important;
  opacity: 0.8;
}

.faceplate-canvas__component--interactive:focus-visible {
  outline: none;
  border-color: rgba(0, 200, 255, 0.7);
}

.faceplate-canvas__lock-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(255, 200, 100, 0.95);
  border: 1px solid rgba(255, 180, 60, 0.8);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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

.faceplate-canvas__drop-zone-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 255, 194, 0.15);
  backdrop-filter: blur(4px);
  border: 3px dashed rgba(0, 255, 194, 0.8);
  border-radius: 8px;
  z-index: 1000;
  pointer-events: none;
  animation: drop-zone-pulse 1.5s ease-in-out infinite;
}

@keyframes drop-zone-pulse {
  0%, 100% {
    background: rgba(0, 255, 194, 0.15);
    border-color: rgba(0, 255, 194, 0.8);
  }
  50% {
    background: rgba(0, 255, 194, 0.25);
    border-color: rgba(0, 255, 194, 1);
  }
}

.faceplate-canvas__drop-zone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px;
  background: rgba(0, 20, 15, 0.85);
  border-radius: 12px;
  border: 2px solid rgba(0, 255, 194, 0.5);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
}

.faceplate-canvas__drop-zone-icon {
  font-size: 48px;
  animation: drop-zone-icon-bounce 1s ease-in-out infinite;
}

@keyframes drop-zone-icon-bounce {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.1);
  }
}

.faceplate-canvas__drop-zone-text {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 255, 194, 1);
  text-align: center;
  letter-spacing: 0.05em;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
}
</style>