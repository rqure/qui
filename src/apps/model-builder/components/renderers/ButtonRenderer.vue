<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';

const props = defineProps<{ properties: Record<string, any> }>();

const text = props.properties.text || 'Button';

const buttonStyle = computed<CSSProperties>(() => {
  const backgroundColor = props.properties.backgroundColor || '#00B0FF';
  const textColor = props.properties.textColor || '#FFFFFF';
  const borderRadius = `${props.properties.borderRadius || 4}px`;
  const fontSize = `${props.properties.fontSize || 14}px`;
  const padding = `${props.properties.padding || 8}px`;
  return {
    backgroundColor,
    color: textColor,
    borderRadius: borderRadius as CSSProperties['borderRadius'],
    fontSize: fontSize as CSSProperties['fontSize'],
    padding: padding as CSSProperties['padding'],
    border: 'none',
    cursor: 'pointer',
    width: '100%' as CSSProperties['width'],
    height: '100%' as CSSProperties['height'],
    display: 'flex' as CSSProperties['display'],
    alignItems: 'center' as CSSProperties['alignItems'],
    justifyContent: 'center' as CSSProperties['justifyContent'],
    fontWeight: 'bold' as CSSProperties['fontWeight'],
    userSelect: 'none' as CSSProperties['userSelect'],
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
