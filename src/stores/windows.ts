import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WindowState, WindowOptions } from '@/core/window/types'

export const useWindowStore = defineStore('windows', () => {
  const windows = ref<WindowState[]>([])
  const activeWindowId = ref<string | null>(null)
  let nextZIndex = 1

  const createWindow = (options: WindowOptions): WindowState => {
    const window: WindowState = {
      id: crypto.randomUUID(),
      title: options.title,
      x: options.x ?? 100,
      y: options.y ?? 100,
      width: options.width ?? 800,
      height: options.height ?? 600,
      isMinimized: false,
      isMaximized: false,
      zIndex: nextZIndex++,
      component: options.component,
    }
    windows.value.push(window)
    activateWindow(window.id)
    return window
  }

  const activateWindow = (id: string) => {
    activeWindowId.value = id
    const window = windows.value.find((w) => w.id === id)
    if (window) {
      window.zIndex = nextZIndex++
    }
  }

  const closeWindow = (id: string) => {
    const index = windows.value.findIndex((w) => w.id === id)
    if (index !== -1) {
      windows.value.splice(index, 1)
    }
  }

  const updateWindowPosition = (id: string, x: number, y: number) => {
    const window = windows.value.find((w) => w.id === id)
    if (window) {
      window.x = x
      window.y = y
    }
  }

  const activeWindow = computed(() => windows.value.find((w) => w.id === activeWindowId.value))

  return {
    windows,
    activeWindow,
    createWindow,
    activateWindow,
    closeWindow,
    updateWindowPosition,
  }
})
