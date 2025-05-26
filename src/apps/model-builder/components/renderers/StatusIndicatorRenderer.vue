<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

// Get component properties with defaults
const value = computed(() => props.properties.value ?? 0);
const showLabel = computed(() => props.properties.showLabel !== false);
const shape = computed(() => props.properties.shape || 'circle');
const size = computed(() => props.properties.size || 24);

// Parse status mapping from string to object
// Format: "0:#888888;1:#00B0FF;2:#FF9800;3:#F44336"
const statusMapping = computed(() => {
  const mapping: Record<number, string> = {};
  const mappingStr = props.properties.statusMapping || '0:#888888;1:#00B0FF;2:#FF9800;3:#F44336';
  
  mappingStr.split(';').forEach(item => {
    const [key, color] = item.split(':');
    if (key && color) {
      mapping[parseInt(key, 10)] = color;
    }
  });
  
  return mapping;
});

// Parse labels from string to object
// Format: "0:Unknown;1:Normal;2:Warning;3:Alarm"
const statusLabels = computed(() => {
  const labels: Record<number, string> = {};
  const labelsStr = props.properties.labels || '0:Unknown;1:Normal;2:Warning;3:Alarm';
  
  labelsStr.split(';').forEach(item => {
    const [key, label] = item.split(':');
    if (key && label) {
      labels[parseInt(key, 10)] = label;
    }
  });
  
  return labels;
});

// Determine current status color and label based on value
const currentColor = computed(() => {
  return statusMapping.value[value.value] || '#888888';
});

const currentLabel = computed(() => {
  return statusLabels.value[value.value] || 'Unknown';
});

// Calculate style for the indicator based on shape and size
const indicatorStyle = computed(() => {
  const baseStyle = {
    backgroundColor: currentColor.value,
    width: `${size.value}px`,
    height: `${size.value}px`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: `0 0 8px ${currentColor.value}80`
  };
  
  if (shape.value === 'circle') {
    return {
      ...baseStyle,
      borderRadius: '50%'
    };
  } else if (shape.value === 'square') {
    return {
      ...baseStyle,
      borderRadius: '4px'
    };
  } else if (shape.value === 'triangle') {
    return {
      ...baseStyle,
      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)',
      backgroundColor: 'transparent',
      position: 'relative' as const
    };
  }
  
  return baseStyle;
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});
</script>

<template>
  <div v-if="isVisible" class="status-indicator">
    <div class="indicator" :style="indicatorStyle">
      <!-- For triangle shape, we use a background div -->
      <div
        v-if="shape === 'triangle'"
        class="triangle-background"
        :style="{
          width: '100%',
          height: '100%',
          backgroundColor: currentColor,
          clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
        }"
      ></div>
    </div>
    <div v-if="showLabel" class="status-label" :style="{ color: currentColor }">
      {{ currentLabel }}
    </div>
  </div>
</template>

<style scoped>
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
}

.indicator {
  transition: background-color 0.3s ease, box-shadow 0.3s ease;
}

.status-label {
  font-size: 14px;
  font-weight: bold;
  transition: color 0.3s ease;
}
</style>
