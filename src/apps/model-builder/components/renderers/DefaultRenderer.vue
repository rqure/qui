<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

// Compute a default style based on available properties
const style = computed(() => {
  const { 
    backgroundColor = 'rgba(0, 176, 255, 0.2)', 
    borderColor = '#00b0ff',
    borderWidth = 1,
    opacity = 1
  } = props.properties;
  
  return {
    backgroundColor,
    border: `${borderWidth}px solid ${borderColor}`,
    opacity,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxSizing: 'border-box'
  };
});

// Get the component name or type for display
const componentName = computed(() => {
  return props.properties.name || 'Unknown Component';
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});
</script>

<template>
  <div v-if="isVisible" class="default-renderer" :style="style">
    <div class="component-info">
      <span class="component-type">{{ componentName }}</span>
      <span class="component-message">Custom renderer not available</span>
    </div>
  </div>
</template>

<style scoped>
.default-renderer {
  border-radius: 4px;
  position: relative;
}

.component-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 8px;
  text-align: center;
  color: #00b0ff;
}

.component-type {
  font-weight: var(--qui-font-weight-medium);
  font-size: var(--qui-font-size-small);
}

.component-message {
  font-size: 10px;
  opacity: 0.8;
  font-style: italic;
}
</style>
