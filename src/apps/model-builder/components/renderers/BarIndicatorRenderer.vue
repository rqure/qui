<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

// Get component properties with defaults
const minValue = computed(() => props.properties.minValue ?? 0);
const maxValue = computed(() => props.properties.maxValue ?? 100);
const value = computed(() => {
  // Clamp value between min and max
  const val = props.properties.value ?? 50;
  return Math.max(minValue.value, Math.min(maxValue.value, val));
});
const showValue = computed(() => props.properties.showValue !== false);
const orientation = computed(() => props.properties.orientation || 'horizontal');
const barColor = computed(() => props.properties.barColor || '#00B0FF');
const trackColor = computed(() => props.properties.trackColor || '#EEEEEE');
const containerStyle = computed(() => {
  return {
    backgroundColor: trackColor.value,
    padding: '2px',
    boxSizing: 'border-box',
    width: '100%',
    height: '100%',
    borderRadius: '4px',
    position: 'relative' as const,
    overflow: 'hidden'
  };
});

// Calculate the percentage for the progress bar
const percentage = computed(() => {
  return ((value.value - minValue.value) / (maxValue.value - minValue.value)) * 100;
});

// Progress bar style based on orientation
const progressStyle = computed(() => {
  if (orientation.value === 'horizontal') {
    return {
      backgroundColor: barColor.value,
      width: `${percentage.value}%`,
      height: '100%',
      borderRadius: '3px',
      transition: 'width 0.3s ease'
    };
  } else {
    return {
      backgroundColor: barColor.value,
      width: '100%',
      height: `${percentage.value}%`,
      position: 'absolute' as const,
      bottom: 0,
      borderRadius: '3px',
      transition: 'height 0.3s ease'
    };
  }
});

// Value label style based on orientation
const valueLabelStyle = computed(() => {
  return {
    position: 'absolute' as const,
    color: '#FFFFFF',
    fontSize: '12px',
    fontWeight: 'bold',
    padding: '2px 6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(orientation.value === 'horizontal' ? {
      right: percentage.value < 15 ? 'auto' : '5px',
      left: percentage.value < 15 ? '5px' : 'auto',
      top: '50%',
      transform: 'translateY(-50%)',
      color: percentage.value < 15 ? barColor.value : '#FFFFFF'
    } : {
      bottom: '5px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: percentage.value < 15 ? barColor.value : '#FFFFFF'
    })
  };
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});

// Format the displayed value
const formattedValue = computed(() => {
  const val = value.value.toFixed(1).replace(/\.0$/, '');
  return props.properties.units ? `${val} ${props.properties.units}` : val;
});
</script>

<template>
  <div v-if="isVisible" class="bar-indicator" :style="containerStyle">
    <div class="progress-bar" :style="progressStyle">
      <div v-if="showValue && percentage >= 15" class="value-label" :style="valueLabelStyle">
        {{ formattedValue }}
      </div>
    </div>
    <div v-if="showValue && percentage < 15" class="value-label" :style="valueLabelStyle">
      {{ formattedValue }}
    </div>
  </div>
</template>

<style scoped>
.bar-indicator {
  position: relative;
}

.progress-bar {
  position: relative;
}

.value-label {
  white-space: nowrap;
  text-shadow: 0px 0px 2px rgba(0, 0, 0, 0.5);
  font-size: 12px;
  font-weight: bold;
  user-select: none;
}
</style>
