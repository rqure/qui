<script setup lang="ts">
import ClockDisplay from './ClockDisplay.vue'
import NetworkStatus from './NetworkStatus.vue'
import VolumeControl from './VolumeControl.vue'
</script>

<template>
  <div class="system-tray">
    <NetworkStatus />
    <VolumeControl />
    <ClockDisplay />
  </div>
</template>

<style scoped>
.system-tray {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-left: auto;
  padding-left: 12px;
  height: 100%;
  position: relative;
}

/* Add subtle separator before system tray */
.system-tray::before {
  content: '';
  position: absolute;
  left: 0;
  top: 25%;
  bottom: 25%;
  width: 1px;
  background: var(--qui-overlay-primary);
  opacity: 0.3;
}
</style>
