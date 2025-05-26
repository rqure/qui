<script setup lang="ts">
import { computed } from 'vue';
import type { CSSProperties } from 'vue';

const props = defineProps<{ properties: Record<string, any> }>();

const isOn = computed(() => {
  const v = props.properties.value;
  return v === true || v === 'true' || v === 1;
});
const activeColor = computed(() => props.properties.activeColor || '#00B0FF');
const trackColor = computed(() => props.properties.trackColor || '#CCCCCC');
const thumbColor = computed(() => props.properties.thumbColor || '#FFFFFF');

// Show or hide the component based on visibility property
const isVisible = computed(() => props.properties.visible !== false);

// Computed label
const label = computed(() => props.properties.label || 'Switch');

const trackStyle = computed<CSSProperties>(() => ({
  backgroundColor: isOn.value ? activeColor.value : trackColor.value,
  width: '40px',
  height: '20px',
  borderRadius: '10px',
  position: 'relative',
  transition: 'background-color 0.3s ease'
}));

const thumbStyle = computed<CSSProperties>(() => ({
  backgroundColor: thumbColor.value,
  width: '16px',
  height: '16px',
  borderRadius: '50%',
  position: 'absolute',
  top: '2px',
  left: isOn.value ? '22px' : '2px',
  transition: 'left 0.3s ease',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
}));

const containerStyle = computed<CSSProperties>(() => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  height: '100%',
  padding: '0 5px',
  boxSizing: 'border-box'
}));

// Handle click
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
