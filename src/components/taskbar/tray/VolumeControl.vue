<script setup lang="ts">
import { computed, markRaw, ref } from 'vue'
import { useMenuStore } from '@/stores/menu'

const menuStore = useMenuStore()
const volumeLevel = ref(75)
const isMuted = ref(false)

// Volume control
const toggleMute = () => {
  isMuted.value = !isMuted.value
}

// Volume icon based on state
const volumeIcon = computed(() => {
  if (isMuted.value) {
    return `<path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />`
  } else if (volumeLevel.value > 50) {
    return `<path fill="currentColor" d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z" />`
  } else if (volumeLevel.value > 0) {
    return `<path fill="currentColor" d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z" />`
  } else {
    return `<path fill="currentColor" d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z" />`
  }
})

// Update volume level
const setVolumeLevel = (level: number) => {
  volumeLevel.value = Math.max(0, Math.min(100, level))
  if (volumeLevel.value > 0) {
    isMuted.value = false
  }
}

// Create a volume slider component for the menu
const VolumeSliderComponent = {
  props: {
    initialValue: {
      type: Number,
      default: 75
    }
  },
  emits: ['update:volume'],
  setup(props: { initialValue: number }, { emit }: any) {
    const value = ref(props.initialValue)
    
    const updateValue = (e: Event) => {
      const target = e.target as HTMLInputElement
      value.value = parseInt(target.value)
      emit('update:volume', value.value)
    }
    
    return { value, updateValue }
  },
  template: `
    <div class="volume-slider-container">
      <input 
        type="range" 
        min="0" 
        max="100" 
        step="1" 
        v-model="value" 
        @input="updateValue"
        class="volume-slider" />
      <div class="volume-level">{{ value }}%</div>
    </div>
  `
}

// Handle volume click for context menu
const handleVolumeClick = (e: MouseEvent) => {
  e.preventDefault()
  
  const volumeSlider = markRaw(VolumeSliderComponent)
  
  menuStore.showMenu(
    { x: e.clientX, y: e.clientY },
    [
      {
        id: 'volume-slider',
        label: 'Volume',
        component: volumeSlider,
        props: { 
          initialValue: volumeLevel.value,
          'onUpdate:volume': setVolumeLevel 
        }
      },
      { id: 'sep1', separator: true, label: '' },
      { 
        id: 'mute', 
        label: isMuted.value ? 'Unmute' : 'Mute', 
        action: toggleMute
      }
    ],
    { type: 'volume-control' },
  )
}
</script>

<template>
  <div 
    class="volume-control" 
    :class="{ 'muted': isMuted }"
    @click="handleVolumeClick"
    :title="isMuted ? 'Muted' : `Volume: ${volumeLevel}%`"
  >
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" v-html="volumeIcon"></svg>
  </div>
</template>

<style scoped>
.volume-control {
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

.volume-control::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--qui-gradient-secondary);
  opacity: 0;
  transition: opacity 0.2s ease;
  border-radius: 4px;
}

.volume-control:hover::before {
  opacity: 0.1;
}

.volume-control:active {
  transform: scale(0.95);
}

.volume-control.muted {
  color: var(--qui-text-secondary);
  opacity: 0.7;
}

/* Style for the volume slider in context menu */
:global(.volume-slider-container) {
  padding: 8px 16px;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

:global(.volume-slider) {
  width: 100%;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--qui-overlay-primary);
  border-radius: 2px;
  outline: none;
}

:global(.volume-slider::-webkit-slider-thumb) {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--qui-accent-color);
  cursor: pointer;
  border: none;
  box-shadow: 0 0 4px rgba(0, 255, 136, 0.5);
  transition: all 0.2s ease;
}

:global(.volume-slider::-moz-range-thumb) {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--qui-accent-color);
  cursor: pointer;
  border: none;
  box-shadow: 0 0 4px rgba(0, 255, 136, 0.5);
  transition: all 0.2s ease;
}

:global(.volume-slider::-webkit-slider-thumb:hover),
:global(.volume-slider::-moz-range-thumb:hover) {
  transform: scale(1.2);
  box-shadow: 0 0 8px rgba(0, 255, 136, 0.7);
}

:global(.volume-level) {
  text-align: right;
  font-size: var(--qui-font-size-small);
  color: var(--qui-text-secondary);
}
</style>
