<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

// Compute text content from properties
const textContent = computed(() => {
  return props.properties.text || '';
});

// Compute style based on properties
const style = computed(() => {
  const { 
    fontFamily = 'Arial',
    fontSize = 16,
    fontWeight = 'normal',
    textColor = '#000000',
    textAlign = 'left',
    backgroundColor = 'transparent',
    opacity = 1
  } = props.properties;
  
  return {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight,
    color: textColor,
    textAlign,
    backgroundColor,
    opacity,
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: textAlign === 'center' ? 'center' : 
                   textAlign === 'right' ? 'flex-end' : 'flex-start',
    boxSizing: 'border-box',
    overflow: 'hidden'
  };
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});
</script>

<template>
  <div v-if="isVisible" class="text-component" :style="style">
    {{ textContent }}
  </div>
</template>

<style scoped>
.text-component {
  position: relative;
  word-wrap: break-word;
  line-height: 1.2;
  padding: 2px;
  white-space: pre-wrap;
}
</style>
