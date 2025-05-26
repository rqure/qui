<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';

const props = defineProps<{ properties: Record<string, any> }>();

const style = computed<CSSProperties>(() => {
  const {
    backgroundColor = '#FFFFFF',
    borderColor = '#000000',
    borderWidth = 1,
    opacity = 1,
    cornerRadius = 0
  } = props.properties;
  return {
    backgroundColor,
    border: `${borderWidth}px solid ${borderColor}`,
    borderRadius: `${cornerRadius}px` as CSSProperties['borderRadius'],
    opacity,
    width: '100%' as CSSProperties['width'],
    height: '100%' as CSSProperties['height'],
    boxSizing: 'border-box' as CSSProperties['boxSizing']
  };
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});
</script>

<template>
  <div v-if="isVisible" class="rectangle" :style="style"></div>
</template>

<style scoped>
.rectangle {
  position: relative;
}
</style>
