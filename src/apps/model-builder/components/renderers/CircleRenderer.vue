<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

// Compute component style based on properties
const style = computed(() => {
  const { 
    backgroundColor = '#FFFFFF', 
    borderColor = '#000000',
    borderWidth = 1,
    opacity = 1
  } = props.properties;
  
  return {
    backgroundColor,
    border: `${borderWidth}px solid ${borderColor}`,
    opacity,
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    boxSizing: 'border-box'
  };
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});
</script>

<template>
  <div v-if="isVisible" class="circle" :style="style"></div>
</template>

<style scoped>
.circle {
  position: relative;
}
</style>
