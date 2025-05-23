<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useMenuStore } from '@/stores/menu'

const menuStore = useMenuStore()
const currentTime = ref(new Date())
const timeIntervalId = ref<number | null>(null)

// Format the time as HH:MM:SS in 24-hour format
const formattedTime = computed(() => {
  const hours = currentTime.value.getHours().toString().padStart(2, '0')
  const minutes = currentTime.value.getMinutes().toString().padStart(2, '0')
  const seconds = currentTime.value.getSeconds().toString().padStart(2, '0')
  return `${hours}:${minutes}:${seconds}`
})

// Format the date as MMM DD, YYYY
const formattedDate = computed(() => {
  const options: Intl.DateTimeFormatOptions = { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric'
  }
  return currentTime.value.toLocaleDateString(undefined, options)
})

// Format the day of week
const dayOfWeek = computed(() => {
  const options: Intl.DateTimeFormatOptions = { 
    weekday: 'long'
  }
  return currentTime.value.toLocaleDateString(undefined, options)
})

// Update the time every second
const updateTime = () => {
  currentTime.value = new Date()
}

// Handle click on clock to show calendar or date settings
const handleClockClick = (e: MouseEvent) => {
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      { 
        id: 'current-date', 
        label: dayOfWeek.value, 
        disabled: true 
      },
      { id: 'sep', separator: true, label: '' },
      { id: 'adjust-time', label: 'Adjust date & time', action: () => {} },
      { id: 'calendar', label: 'Open Calendar', action: () => {} }
    ],
    { type: 'clock-menu' }
  )
}

onMounted(() => {
  // Start the time update interval
  timeIntervalId.value = window.setInterval(updateTime, 1000)
})

onUnmounted(() => {
  // Clear the interval when component is unmounted
  if (timeIntervalId.value !== null) {
    clearInterval(timeIntervalId.value)
  }
})
</script>

<template>
  <div 
    class="clock-display" 
    @click="handleClockClick"
    :title="`${dayOfWeek} - Click to view calendar`"
  >
    <div class="time">{{ formattedTime }}</div>
    <div class="date">{{ formattedDate }}</div>
  </div>
</template>

<style scoped>
.clock-display {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  min-width: 90px;
  padding: 0 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s var(--qui-animation-bounce);
  position: relative;
  overflow: hidden;
}

.clock-display::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-secondary);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.clock-display:hover::before {
  opacity: 0.1;
}

.clock-display:active {
  transform: scale(0.98);
}

.time {
  font-size: var(--qui-font-size-base);
  font-weight: var(--qui-font-weight-medium);
  color: var(--qui-text-primary);
  position: relative;
  z-index: 1;
}

.date {
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
  position: relative;
  z-index: 1;
}
</style>
