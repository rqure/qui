<script setup lang="ts">
import { ref } from 'vue';

const components = ref([
  { 
    name: 'Rectangle', 
    icon: `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <rect x="3" y="3" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `, 
    type: 'polygon', 
    defaults: { 
      edges: [
        { x: 0, y: 0, z: 0 },
        { x: 100, y: 0, z: 0 },
        { x: 100, y: 60, z: 0 },
        { x: 0, y: 60, z: 0 }
      ]
    } 
  },
  { 
    name: 'Circle', 
    icon: `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `, 
    type: 'circle', 
    defaults: { radius: 30 } 
  },
  { 
    name: 'Triangle', 
    icon: `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <path d="M12 3L3 21h18L12 3z" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `, 
    type: 'polygon', 
    defaults: { sides: 3, radius: 40 } 
  },
  { 
    name: 'Line', 
    icon: `
      <svg width="24" height="24" viewBox="0 0 24 24">
        <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" stroke-width="2"/>
      </svg>
    `, 
    type: 'polyline', 
    defaults: { length: 100 } 
  }
]);

const handleDragStart = (e: DragEvent, component: any) => {
  if (e.dataTransfer) {
    e.dataTransfer.setData('componentType', component.type);
    e.dataTransfer.setData('componentDefaults', JSON.stringify(component.defaults));
  }
};
</script>

<template>
  <div class="sidebar">
    <div v-for="component in components" 
         :key="component.name" 
         class="component-item"
         draggable="true"
         @dragstart="(e) => handleDragStart(e, component)">
      <span class="component-icon" v-html="component.icon"></span>
      <span class="component-name">{{ component.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  grid-area: sidebar;
  background-color: var(--qui-bg-secondary);
  border-right: var(--qui-window-border);
  padding: 1rem;
}

.component-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: move;
  background-color: var(--qui-bg-primary);
  border: var(--qui-window-border);
  border-radius: var(--qui-window-radius);
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
}

.component-item:hover {
  background-color: var(--qui-overlay-hover);
  transform: var(--qui-hover-lift);
  box-shadow: var(--qui-shadow-hover);
}

.component-icon {
  margin-right: 0.5rem;
}

.component-icon :deep(svg) {
  width: 24px;
  height: 24px;
  display: block;
}
</style>
