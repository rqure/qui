<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

// Get component properties with defaults
const isOn = computed(() => {
  const value = props.properties.value;
  return value === true || value === 'true' || value === 1;
});
const label = computed(() => props.properties.label || 'Switch');
const activeColor = computed(() => props.properties.activeColor || '#00B0FF');
const trackColor = computed(() => props.properties.trackColor || '#CCCCCC');
const thumbColor = computed(() => props.properties.thumbColor || '#FFFFFF');

// Track style based on state
const trackStyle = computed(() => {
  return {
    backgroundColor: isOn.value ? activeColor.value : trackColor.value,
    width: '40px',
    height: '20px',
    borderRadius: '10px',
    position: 'relative' as const,
    transition: 'background-color 0.3s ease'
  };
});

// Thumb style based on state
const thumbStyle = computed(() => {
  return {
    backgroundColor: thumbColor.value,
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    position: 'absolute' as const,
    top: '2px',
    left: isOn.value ? '22px' : '2px',
    transition: 'left 0.3s ease',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
  };
});

// Container style to handle layout
const containerStyle = computed(() => {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    height: '100%',
    width: '100%',
    padding: '0 5px',
    boxSizing: 'border-box' as const
  };
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});

// Handle click in design mode - in runtime mode, this would update the value
function handleClick() {
  console.log('Switch clicked:', !isOn.value);
}
</script>

<template>
  <div v-if="isVisible" class="switch-component" :style="containerStyle" @click="handleClick">
    <div class="switch-track" :style="trackStyle">
      <div class="switch-thumb" :style="thumbStyle"></div>
    </div>
    <div class="switch-label">{{ label }}</div>
  </div>
</template>

<style scoped>
.switch-component {
  cursor: pointer;
  user-select: none;
}

.switch-label {
  font-size: 14px;
  color: inherit;
}
</style>
