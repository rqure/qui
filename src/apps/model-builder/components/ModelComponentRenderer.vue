<script setup lang="ts">
import { computed } from 'vue';
import { type ModelComponent } from '../types';
import { componentRegistry } from '../services/ComponentRegistry';

const props = defineProps<{
  component: ModelComponent;
  isSelected: boolean;
}>();

// Get the component renderer based on type
const componentRenderer = computed(() => {
  return componentRegistry[props.component.type] || null;
});

// Component style with position and size
const componentStyle = computed(() => {
  return {
    left: `${props.component.x}px`,
    top: `${props.component.y}px`,
    width: `${props.component.width}px`,
    height: `${props.component.height}px`,
    zIndex: props.isSelected ? 10 : props.component.z || 1
  };
});

// Prevent right-click context menu on components to allow custom handling
function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  event.stopPropagation();
}
</script>

<template>
  <div 
    class="model-component" 
    :class="{ 'selected': isSelected }" 
    :style="componentStyle"
    @contextmenu="handleContextMenu"
  >
    <!-- Render the actual component based on its type -->
    <component 
      v-if="componentRenderer"
      :is="componentRenderer"
      :properties="component.properties"
    />
    <div v-else class="unknown-component">
      Unknown component: {{ component.type }}
    </div>
    
    <!-- Show resize handles when selected -->
    <template v-if="isSelected">
      <div class="mb-drag-handle mb-drag-handle-nw"></div>
      <div class="mb-drag-handle mb-drag-handle-ne"></div>
      <div class="mb-drag-handle mb-drag-handle-sw"></div>
      <div class="mb-drag-handle mb-drag-handle-se"></div>
      <div class="mb-drag-handle mb-drag-handle-n"></div>
      <div class="mb-drag-handle mb-drag-handle-s"></div>
      <div class="mb-drag-handle mb-drag-handle-e"></div>
      <div class="mb-drag-handle mb-drag-handle-w"></div>
    </template>
  </div>
</template>

<style scoped>
.model-component {
  position: absolute;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  box-sizing: border-box;
  user-select: none;
  transition: box-shadow 0.2s ease, border-color 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.model-component:hover {
  border-color: rgba(0, 176, 255, 0.3);
}

.model-component.selected {
  border-color: #00b0ff;
  box-shadow: 0 0 8px rgba(0, 176, 255, 0.4);
}

.unknown-component {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--qui-danger-color);
  font-size: 12px;
  text-align: center;
  padding: 8px;
}

/* Resize handles are styled in global CSS */
.mb-drag-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #00b0ff;
  border: 1px solid rgba(255, 255, 255, 0.7);
  cursor: pointer;
  z-index: 10;
}

.mb-drag-handle-nw { top: -4px; left: -4px; cursor: nw-resize; }
.mb-drag-handle-ne { top: -4px; right: -4px; cursor: ne-resize; }
.mb-drag-handle-sw { bottom: -4px; left: -4px; cursor: sw-resize; }
.mb-drag-handle-se { bottom: -4px; right: -4px; cursor: se-resize; }
.mb-drag-handle-n { top: -4px; left: 50%; transform: translateX(-50%); cursor: n-resize; }
.mb-drag-handle-s { bottom: -4px; left: 50%; transform: translateX(-50%); cursor: s-resize; }
.mb-drag-handle-e { top: 50%; right: -4px; transform: translateY(-50%); cursor: e-resize; }
.mb-drag-handle-w { top: 50%; left: -4px; transform: translateY(-50%); cursor: w-resize; }
</style>
