<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{
  showGrid: boolean,
  mode: 'pan' | 'select'
}>();

const emit = defineEmits<{
  'update:showGrid': [value: boolean]
  'update:mode': [value: 'pan' | 'select']
  'center': []
}>();

const toggleGrid = () => {
  emit('update:showGrid', !props.showGrid);
};

const toggleMode = () => {
  emit('update:mode', props.mode === 'pan' ? 'select' : 'pan');
};
</script>

<template>
  <div class="toolbar">
    <div class="tool-group">
      <div class="tool-item" @click="toggleMode">
        <span v-html="props.mode === 'pan' ? `
          <svg width='16' height='16' viewBox='0 0 16 16'>
            <path fill='currentColor' d='M8 2v2L6 2l2-2v2zm0 12V8l2 2-2 2z M2 8h2L2 6l-2 2h2zm12 0H8l2-2 2 2z'/>
          </svg>
        ` : `
          <svg width='16' height='16' viewBox='0 0 16 16'>
            <path fill='currentColor' d='M13 3L8 13 3 3h2l3 6 3-6z'/>
          </svg>
        `"></span>
        {{ props.mode === 'pan' ? 'Pan' : 'Select' }}
      </div>
    </div>
    <div class="tool-group">
      <div class="tool-item" @click="toggleGrid">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path fill="currentColor" d="M1 1h4v4H1zm5 0h4v4H6zm5 0h4v4h-4zM1 6h4v4H1zm5 0h4v4H6zm5 0h4v4h-4zM1 11h4v4H1zm5 0h4v4H6zm5 0h4v4h-4z" 
            :opacity="props.showGrid ? 1 : 0.5"/>
        </svg>
        Grid
      </div>
      <div class="tool-item" @click="emit('center')">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="3" fill="currentColor"/>
          <path fill="currentColor" d="M8 1v2m0 10v2M1 8h2m10 0h2" stroke="currentColor"/>
        </svg>
        Center
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
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-item:hover {
  background-color: var(--qui-overlay-hover);
  transform: var(--qui-hover-lift);
  border-radius: var(--qui-window-radius);
}

.tool-item :deep(svg) {
  width: 16px;
  height: 16px;
}
</style>