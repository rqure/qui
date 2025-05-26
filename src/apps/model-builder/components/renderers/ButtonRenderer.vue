<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

// Get component properties with defaults
const text = computed(() => props.properties.text || 'Button');
const backgroundColor = computed(() => props.properties.backgroundColor || '#00B0FF');
const textColor = computed(() => props.properties.textColor || '#FFFFFF');
const borderRadius = computed(() => `${props.properties.borderRadius || 4}px`);
const fontSize = computed(() => `${props.properties.fontSize || 14}px`);
const padding = computed(() => `${props.properties.padding || 8}px`);

// Compute button style
const buttonStyle = computed(() => {
  return {
    backgroundColor: backgroundColor.value,
    color: textColor.value,
    borderRadius: borderRadius.value,
    fontSize: fontSize.value,
    padding: padding.value,
    border: 'none',
    cursor: 'pointer',
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    userSelect: 'none' as const,
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease'
  };
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});

// Handle button click - in a real implementation, this would trigger the action
function handleClick() {
  console.log('Button clicked:', props.properties.action || 'No action defined');
}
</script>

<template>
  <button 
    v-if="isVisible" 
    class="button-component" 
    :style="buttonStyle"
    @click="handleClick"
  >
    {{ text }}
  </button>
</template>

<style scoped>
.button-component {
  outline: none;
}

.button-component:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
}

.button-component:active {
  filter: brightness(0.95);
  transform: translateY(1px);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}
</style>
