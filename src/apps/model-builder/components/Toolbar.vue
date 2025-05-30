<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  showGrid: boolean
}>();

const emit = defineEmits<{
  'update:showGrid': [value: boolean]
}>();

const tools = ref([
  { name: 'select', icon: '◻️' },
  { name: 'connect', icon: '↔️' },
  { name: 'delete', icon: '🗑️' }
]);

const toggleGrid = () => {
  emit('update:showGrid', !props.showGrid);
};
</script>

<template>
  <div class="toolbar">
    <div class="tool-group">
      <div v-for="tool in tools" 
           :key="tool.name" 
           class="tool-item">
        {{ tool.icon }}
      </div>
    </div>
    <div class="tool-group">
      <div class="tool-item" @click="toggleGrid">
        {{ props.showGrid ? '☑' : '☐' }} Grid
      </div>
    </div>
  </div>
</template>

<style scoped>
.tool-group {
  display: flex;
  gap: 8px;
}

.toolbar {
  grid-area: toolbar;
  background-color: var(--qui-bg-secondary);
  border-bottom: var(--qui-window-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
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
