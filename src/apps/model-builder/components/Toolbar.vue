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
            <path fill='currentColor' d='M8 3L8 5M8 11L8 13M3 8L5 8M11 8L13 8M10.5 5.5L12 4M5.5 5.5L4 4M10.5 10.5L12 12M5.5 10.5L4 12' stroke='currentColor' stroke-width='1.5'/>
            <circle cx='8' cy='8' r='1.5' fill='currentColor'/>
          </svg>
        ` : `
          <svg width='16' height='16' viewBox='0 0 16 16'>
            <path fill='currentColor' d='M4 2L4 4.5L7 7.5L7 13L9 13L9 7.5L12 4.5L12 2L4 2Z'/>
            <path fill='none' stroke='currentColor' stroke-width='0.75' d='M4 2L4 4.5L7 7.5L7 13L9 13L9 7.5L12 4.5L12 2L4 2Z'/>
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
  gap: 6px;
}

.tool-item:hover {
  background-color: var(--qui-overlay-hover);
  transform: var(--qui-hover-lift);
  border-radius: var(--qui-window-radius);
}

.tool-item :deep(svg) {
  width: 16px;
  height: 16px;
  display: block; /* Ensures proper positioning */
  margin-top: -1px; /* Fine-tune vertical alignment with text */
  flex-shrink: 0; /* Prevents SVG from shrinking */
}
</style>