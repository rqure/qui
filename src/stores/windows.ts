import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { WindowState, WindowOptions } from '@/core/window/types'
import { createWindowState } from '@/core/window/utils'

export const useWindowStore = defineStore('windows', () => {
  const windows = ref<WindowState[]>([])
  const activeWindowId = ref<string | null>(null)

  const activeWindow = computed(() => windows.value.find(w => w.id === activeWindowId.value) || null)

  const createWindow = (options: WindowOptions) => {
    const windowState = createWindowState(options)
    
    // Set initial z-index to be higher than any existing window
    const highestZ = Math.max(0, ...windows.value.map(w => w.zIndex))
    windowState.zIndex = highestZ + 1
    
    windows.value.push(windowState)
    activateWindow(windowState.id)
    
    return windowState
  }

  const activateWindow = (id: string) => {
    const window = windows.value.find((w) => w.id === id)
    if (window) {
      activeWindowId.value = id
      window.zIndex = Math.max(0, ...windows.value.map(w => w.zIndex)) + 1
      window.isMinimized = false
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

  const updateWindowSize = (id: string, width: number, height: number) => {
    const window = windows.value.find((w) => w.id === id)
    if (window) {
      window.width = width
      window.height = height
    }
  }

  const minimizeWindow = (id: string) => {
    const window = windows.value.find((w) => w.id === id)
    if (window) {
      window.isMinimized = true
      if (activeWindowId.value === id) {
        activeWindowId.value = null
      }
    }
  }

  const unminimizeWindow = (id: string) => {
    const window = windows.value.find((w) => w.id === id)
    if (window) {
      window.isMinimized = false
      activateWindow(id)
    }
  }

  const maximizeWindow = (id: string) => {
    const window = windows.value.find((w) => w.id === id)
    if (window && !window.isMaximized) {
      window.prevSize = {
        x: window.x,
        y: window.y,
        width: window.width,
        height: window.height,
      }
      window.isMaximized = true
      window.x = 0
      window.y = 0
      window.width = document.documentElement.clientWidth
      window.height = document.documentElement.clientHeight
    }
  }

  const restoreWindow = (id: string) => {
    const window = windows.value.find((w) => w.id === id)
    if (window?.prevSize) {
      window.isMaximized = false
      window.x = window.prevSize.x
      window.y = window.prevSize.y
      window.width = window.prevSize.width
      window.height = window.prevSize.height
      window.prevSize = undefined
    }
  }

  const updateWindowPrevState = (
    id: string,
    state: { x: number; y: number; width: number; height: number },
  ) => {
    const window = windows.value.find((w) => w.id === id)
    if (window) {
      window.prevSize = state
    }
  }

  return {
    windows,
    activeWindow,
    activeWindowId,
    createWindow,
    activateWindow,
    closeWindow,
    updateWindowPosition,
    updateWindowSize,
    minimizeWindow,
    unminimizeWindow,
    maximizeWindow,
    restoreWindow,
    updateWindowPrevState,
  }
})
