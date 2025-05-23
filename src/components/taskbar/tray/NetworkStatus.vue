<script setup lang="ts">
import { computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { useMenuStore } from '@/stores/menu'

const dataStore = useDataStore()
const menuStore = useMenuStore()

// Connection status helpers
const isConnected = computed(() => dataStore.isConnected)
const connectionStatus = computed(() => isConnected.value ? 'Connected' : 'Disconnected')

// Network status icons based on connection state
const networkIcon = computed(() => {
  if (isConnected.value) {
    return `<path fill="currentColor" d="M7,15H9C9,16.08 10.37,17 12,17C13.63,17 15,16.08 15,15H17C17,17.16 14.82,19 12,19C9.18,19 7,17.16 7,15M12,3C7.95,3 4.21,4.34 1,7.59L2.56,9.16C5.35,6.34 8.56,5 12,5C15.44,5 18.65,6.34 21.44,9.16L23,7.59C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.9L6.6,13.7C8.1,12.21 9.97,11.5 12,11.5C14.03,11.5 15.9,12.21 17.4,13.7L19.2,11.9C17.19,9.89 14.7,9 12,9Z" />`
  } else {
    return `<path fill="currentColor" d="M2.28,3L1,4.27L2.47,5.74C2.04,6 1.61,6.29 1.2,6.6L2.53,8C2.92,7.71 3.34,7.42 3.78,7.17L5.77,9.16C5.29,9.44 4.83,9.75 4.41,10.11L5.72,11.5C6.17,11.13 6.65,10.82 7.14,10.55L15.07,18.47L14,19.5L14,21L19,21V16L17.5,16L16.47,17.03L3,3.5L2.28,3M8.55,3.44C8.38,3.39 8.2,3.39 8.03,3.44L7.17,3.73L7.46,4.59C7.49,4.67 7.5,4.75 7.5,4.83C7.5,5.29 7.11,5.68 6.65,5.68C6.24,5.68 5.89,5.44 5.74,5.1L5.45,4.23L4.59,4.53C4.21,4.67 4.06,5.13 4.21,5.5C4.35,5.88 4.81,6.04 5.19,5.89L6.04,5.6L6.5,6.47C6.76,7.07 7.42,7.4 8.06,7.25C8.7,7.1 9.15,6.5 9.15,5.83C9.15,5.75 9.14,5.67 9.13,5.59L9.04,4.73L9.91,4.43C10.29,4.29 10.45,3.82 10.3,3.45C10.15,3.07 9.69,2.91 9.31,3.06L8.55,3.44M10.9,5.63C10.6,5.92 10.6,6.41 10.9,6.7C11.19,7 11.67,7 11.97,6.7C12.26,6.41 12.26,5.92 11.97,5.63C11.67,5.34 11.19,5.34 10.9,5.63M12.68,7.41C12.39,7.7 12.39,8.18 12.68,8.47C12.97,8.77 13.46,8.77 13.75,8.47C14.04,8.18 14.04,7.7 13.75,7.41C13.46,7.11 12.97,7.11 12.68,7.41M7.62,11.5C7.21,11.88 7.21,12.52 7.62,12.9C8.04,13.27 8.7,13.26 9.11,12.88C9.5,12.5 9.5,11.88 9.1,11.5C8.68,11.12 8.03,11.13 7.62,11.5M7.62,11.5C7.21,11.88 7.21,12.52 7.62,12.9C8.04,13.27 8.7,13.26 9.11,12.88C9.5,12.5 9.5,11.88 9.1,11.5C8.68,11.12 8.03,11.13 7.62,11.5Z" />`
  }
})

// Network status context menu
const handleNetworkClick = (e: MouseEvent) => {
  e.preventDefault()
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      { 
        id: 'connection-status', 
        label: `Status: ${connectionStatus.value}`, 
        disabled: true 
      },
      { id: 'sep1', separator: true, label: '' },
      { 
        id: 'reconnect', 
        label: 'Reconnect', 
        action: () => {
          if (!isConnected.value) {
            dataStore.connect()
          }
        },
        disabled: isConnected.value
      },
      { 
        id: 'network-settings', 
        label: 'Network Settings', 
        action: () => {} 
      },
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" v-html="networkIcon"></svg>
    <div class="status-indicator" :class="{ 'active': isConnected }"></div>
  </div>
</template>

<style scoped>
.network-status {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  cursor: pointer;
  color: var(--qui-text-secondary);
  transition: all 0.2s var(--qui-animation-bounce);
  position: relative;
}

.network-status::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-secondary);
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: 4px;
}

.network-status:hover::before {
  opacity: 0.1;
}

.network-status:active {
  transform: scale(0.95);
}

.network-status.disconnected {
  color: var(--qui-danger-color);
  opacity: 0.8;
}

.network-status.disconnected:hover {
  opacity: 1;
}

.status-indicator {
  position: absolute;
  right: 5px;
  bottom: 5px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--qui-danger-color);
  transition: all 0.3s ease;
}

.status-indicator.active {
  background-color: var(--qui-accent-color);
  box-shadow: 0 0 4px var(--qui-accent-color);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
  100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
}
</style>
