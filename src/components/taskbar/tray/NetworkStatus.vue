<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { useMenuStore } from '@/stores/menu'

const dataStore = useDataStore()
const menuStore = useMenuStore()

// Connection status helpers
const isConnected = computed(() => dataStore.isConnected)
const connectionStatus = computed(() => isConnected.value ? 'Connected' : 'Disconnected')

// Network status context menu - simplified to only show status
const handleNetworkClick = (e: MouseEvent) => {
  e.preventDefault()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      { 
        id: 'connection-status', 
        label: `Status: ${connectionStatus.value}`, 
        disabled: true 
      }
    ],
    { type: 'network-control' },
  )
}
</script>

<template>
  <div 
    class="network-status" 
    :class="{ 'disconnected': !isConnected }"
    @click="handleNetworkClick"
    :title="connectionStatus"
  >
    <div class="network-icon">
      <!-- Main globe circle -->
      <div class="globe"></div>
      
      <!-- Latitude/longitude lines -->
      <div class="globe-line horizontal"></div>
      <div class="globe-line vertical"></div>
      
      <!-- Connection status indicator -->
      <div class="status-indicator" :class="{ 'active': isConnected }"></div>
    </div>
  </div>
</template>

<style scoped>
.network-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  color: var(--qui-text-secondary);
  transition: all 0.3s var(--qui-animation-bounce);
  position: relative;
  overflow: hidden;
  backdrop-filter: blur(var(--qui-backdrop-blur));
}

.network-status::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-secondary);
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 8px;
}

.network-status:hover::before {
  opacity: 0.3;
}

.network-status:hover {
  transform: var(--qui-hover-scale);
  box-shadow: var(--qui-shadow-hover);
}

.network-status:active {
  transform: var(--qui-active-scale);
  box-shadow: var(--qui-shadow-active);
}

.network-status.disconnected {
  color: var(--qui-danger-color);
}

.network-status.disconnected:hover {
  box-shadow: var(--qui-danger-glow);
}

/* Network icon container */
.network-icon {
  position: relative;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Globe styling */
.globe {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid currentColor;
  box-sizing: border-box;
  transition: all 0.3s ease;
}

.globe-line {
  position: absolute;
  background-color: transparent;
  border: 1px solid currentColor;
  box-sizing: border-box;
}

.globe-line.horizontal {
  width: 18px;
  height: 8px;
  border-top: 1px solid currentColor;
  border-bottom: 1px solid currentColor;
  border-left: 0;
  border-right: 0;
}

.globe-line.vertical {
  height: 18px;
  width: 8px;
  border-left: 1px solid currentColor;
  border-right: 1px solid currentColor;
  border-top: 0;
  border-bottom: 0;
}

/* Status indicator - new design */
.status-indicator {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: var(--qui-danger-color);
  box-shadow: 0 0 4px var(--qui-danger-color);
  z-index: 2;
  transition: all 0.3s ease;
}

.status-indicator.active {
  background-color: var(--qui-accent-color);
  box-shadow: 0 0 6px var(--qui-accent-color);
  animation: pulse 2s infinite;
}

/* Connected state */
.network-status:not(.disconnected) .globe {
  border-color: var(--qui-accent-color);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.3);
}

.network-status:not(.disconnected) .globe-line {
  border-color: var(--qui-accent-color);
}

/* Animations */
@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.7;
  }
}

/* Disconnected state - add visual feedback */
.network-status.disconnected .globe {
  border-color: var(--qui-danger-color);
  opacity: 0.7;
}

.network-status.disconnected .globe-line {
  border-color: var(--qui-danger-color);
  opacity: 0.7;
}

/* Add pulsing effect to connected globe */
.network-status:not(.disconnected) .globe {
  animation: globe-pulse 3s infinite alternate;
}

@keyframes globe-pulse {
  0% {
    box-shadow: 0 0 4px rgba(0, 255, 136, 0.2);
  }
  100% {
    box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
  }
}
</style>
