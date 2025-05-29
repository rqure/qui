<script setup lang="ts">
import { ref } from 'vue';

const components = ref([
  { 
    name: 'Rectangle', 
    icon: '⬜', 
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
  { name: 'Circle', icon: '⭕', type: 'circle', defaults: { radius: 30 } },
  { name: 'Triangle', icon: '▲', type: 'polygon', defaults: { sides: 3, radius: 40 } },
  { name: 'Line', icon: '➖', type: 'polyline', defaults: { length: 100 } }
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
      <span class="component-icon">{{ component.icon }}</span>
      <span class="component-name">{{ component.name }}</span>
    </div>
  </div>
</template>

<style scoped>
.sidebar {
  grid-area: sidebar;
  background-color: #f8f8f8;
  border-right: 1px solid #ddd;
  padding: 1rem;
}

.component-item {
  display: flex;
  align-items: center;
  padding: 0.5rem;
  margin-bottom: 0.5rem;
  cursor: move;
  background-color: white;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.component-item:hover {
  background-color: #f0f0f0;
}

.component-icon {
  margin-right: 0.5rem;
}
</style>
