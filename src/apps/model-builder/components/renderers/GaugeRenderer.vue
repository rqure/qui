<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue';

const props = defineProps<{
  properties: Record<string, any>;
}>();

const svgRef = ref<SVGElement | null>(null);

// Get component properties with defaults
const minValue = computed(() => props.properties.minValue ?? 0);
const maxValue = computed(() => props.properties.maxValue ?? 100);
const value = computed(() => {
  // Clamp value between min and max
  const val = props.properties.value ?? 50;
  return Math.max(minValue.value, Math.min(maxValue.value, val));
});
const showValue = computed(() => props.properties.showValue !== false);
const units = computed(() => props.properties.units || '');
const startAngle = computed(() => props.properties.startAngle ?? -135);
const endAngle = computed(() => props.properties.endAngle ?? 135);
const trackColor = computed(() => props.properties.trackColor || '#EEEEEE');
const valueColor = computed(() => props.properties.valueColor || '#00B0FF');
const needleColor = computed(() => props.properties.needleColor || '#FF0000');

// Calculate the angle for the current value
const valueAngle = computed(() => {
  const normalizedValue = (value.value - minValue.value) / (maxValue.value - minValue.value);
  return startAngle.value + normalizedValue * (endAngle.value - startAngle.value);
});

// Calculate SVG paths for gauge components
const gaugeRadius = computed(() => 40);
const trackPath = computed(() => {
  const radius = gaugeRadius.value;
  const startRad = (startAngle.value - 90) * Math.PI / 180;
  const endRad = (endAngle.value - 90) * Math.PI / 180;
  
  const startX = 50 + radius * Math.cos(startRad);
  const startY = 50 + radius * Math.sin(startRad);
  const endX = 50 + radius * Math.cos(endRad);
  const endY = 50 + radius * Math.sin(endRad);
  
  const largeArcFlag = Math.abs(endAngle.value - startAngle.value) <= 180 ? 0 : 1;
  
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
});

const valuePath = computed(() => {
  const radius = gaugeRadius.value;
  const startRad = (startAngle.value - 90) * Math.PI / 180;
  const valueRad = (valueAngle.value - 90) * Math.PI / 180;
  
  const startX = 50 + radius * Math.cos(startRad);
  const startY = 50 + radius * Math.sin(startRad);
  const endX = 50 + radius * Math.cos(valueRad);
  const endY = 50 + radius * Math.sin(valueRad);
  
  const largeArcFlag = Math.abs(valueAngle.value - startAngle.value) <= 180 ? 0 : 1;
  
  return `M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY}`;
});

const needlePoints = computed(() => {
  const angle = (valueAngle.value - 90) * Math.PI / 180;
  const radius = gaugeRadius.value - 5;
  
  const tipX = 50 + radius * Math.cos(angle);
  const tipY = 50 + radius * Math.sin(angle);
  
  // Calculate points for a triangle needle shape
  const baseAngle1 = angle + Math.PI / 2;
  const baseAngle2 = angle - Math.PI / 2;
  const baseWidth = 2;
  
  const baseX1 = 50 + baseWidth * Math.cos(baseAngle1);
  const baseY1 = 50 + baseWidth * Math.sin(baseAngle1);
  const baseX2 = 50 + baseWidth * Math.cos(baseAngle2);
  const baseY2 = 50 + baseWidth * Math.sin(baseAngle2);
  
  return `${tipX},${tipY} ${baseX1},${baseY1} ${baseX2},${baseY2}`;
});

// Format the displayed value
const formattedValue = computed(() => {
  const val = value.value.toFixed(1).replace(/\.0$/, '');
  return units.value ? `${val} ${units.value}` : val;
});

// Show or hide the component based on visibility property
const isVisible = computed(() => {
  return props.properties.visible !== false;
});

// Update gauge when properties change
watch([value, startAngle, endAngle], () => {
  // Animation could be added here
});

onMounted(() => {
  // Initialization if needed
});
</script>

<template>
  <div v-if="isVisible" class="gauge-component">
    <svg ref="svgRef" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <!-- Track (background arc) -->
      <path 
        :d="trackPath" 
        :stroke="trackColor" 
        stroke-width="6" 
        fill="none" 
        stroke-linecap="round"
      />
      
      <!-- Value arc -->
      <path 
        :d="valuePath" 
        :stroke="valueColor" 
        stroke-width="6" 
        fill="none" 
        stroke-linecap="round"
      />
      
      <!-- Center point -->
      <circle cx="50" cy="50" r="4" :fill="needleColor" />
      
      <!-- Needle -->
      <polygon :points="needlePoints" :fill="needleColor" />
      
      <!-- Value display -->
      <text 
        v-if="showValue"
        x="50" 
        y="75" 
        text-anchor="middle" 
        font-size="12" 
        font-weight="bold" 
        :fill="valueColor"
      >
        {{ formattedValue }}
      </text>
    </svg>
  </div>
</template>

<style scoped>
.gauge-component {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

svg {
  max-width: 100%;
  max-height: 100%;
}
</style>
