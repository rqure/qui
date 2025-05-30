<script setup lang="ts">
import { ref } from 'vue';

const tools = ref([
  { name: 'select', icon: '◻️' },
  { name: 'connect', icon: '↔️' },
  { name: 'delete', icon: '🗑️' }
]);
</script>

<template>
  <div class="toolbar">
    <div v-for="tool in tools" 
         :key="tool.name" 
         class="tool-item">
      {{ tool.icon }}
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  grid-area: toolbar;
  background-color: var(--qui-bg-secondary);
  border-bottom: var(--qui-window-border);
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.tool-item {
  padding: 0.5rem;
  cursor: pointer;
  transition: all var(--qui-transition-speed) var(--qui-animation-bounce);
}

.tool-item:hover {
  background-color: var(--qui-overlay-hover);
  transform: var(--qui-hover-lift);
  border-radius: var(--qui-window-radius);
}
</style>
