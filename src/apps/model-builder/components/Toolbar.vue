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
  background-color: #f0f0f0;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  padding: 0 1rem;
}

.tool-item {
  padding: 0.5rem;
  cursor: pointer;
}

.tool-item:hover {
  background-color: #e0e0e0;
  border-radius: 4px;
}
</style>
