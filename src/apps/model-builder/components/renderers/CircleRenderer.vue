<script setup lang="ts">
import { computed } from 'vue'
import type { CSSProperties } from 'vue'

const props = defineProps<{
  properties: Record<string, any>;
}>()

// Compute component style with proper CSSProperties typing
const style = computed<CSSProperties>(() => {
  const {
    backgroundColor = '#FFFFFF',
    borderColor = '#000000',
    borderWidth = 1,
    opacity = 1
  } = props.properties

  return {
    backgroundColor,
    border: `${borderWidth}px solid ${borderColor}`,
    opacity,
    width: '100%' as CSSProperties['width'],
    height: '100%' as CSSProperties['height'],
    borderRadius: '50%' as CSSProperties['borderRadius'],
    boxSizing: 'border-box' as CSSProperties['boxSizing']
  }
})

// Show or hide the component based on visibility property
const isVisible = computed(() => props.properties.visible !== false)
</script>

<template>
  <div v-if="isVisible" class="circle" :style="style"></div>
</template>

<style scoped>
.circle {
  position: relative;
}
</style>
