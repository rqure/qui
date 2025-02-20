import { defineStore } from 'pinia'
import type { WindowState, WindowOptions } from '@/core/window/types'
import { createWindowState } from '@/core/window/utils'

export const useWindowStore = defineStore('windows', {
  state: () => ({
    windows: [] as WindowState[],
    activeWindowId: null as string | null,
    nextZIndex: 100, // Start at a higher base value
  }),

  actions: {
    createWindow(options: WindowOptions) {
      const window = createWindowState(options)
      window.zIndex = this.nextZIndex++
      this.windows.push(window)
      this.activateWindow(window.id)
      return window
    },

    activateWindow(id: string) {
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        this.activeWindowId = id
        window.zIndex = this.nextZIndex++
        window.isMinimized = false
      }
    },

    closeWindow(id: string) {
      const index = this.windows.findIndex((w) => w.id === id)
      if (index !== -1) {
        this.windows.splice(index, 1)
      }
    },

    updateWindowPosition(id: string, x: number, y: number) {
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        window.x = x
        window.y = y
      }
    },

    updateWindowSize(id: string, width: number, height: number) {
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        window.width = width
        window.height = height
      }
    },

    minimizeWindow(id: string) {
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        window.isMinimized = true
        if (this.activeWindowId === id) {
          this.activeWindowId = null
        }
      }
    },

    unminimizeWindow(id: string) {
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        window.isMinimized = false
        this.activateWindow(id)
      }
    },

    maximizeWindow(id: string) {
      const window = this.windows.find((w) => w.id === id)
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
    },

    restoreWindow(id: string) {
      const window = this.windows.find((w) => w.id === id)
      if (window?.prevSize) {
        window.isMaximized = false
        window.x = window.prevSize.x
        window.y = window.prevSize.y
        window.width = window.prevSize.width
        window.height = window.prevSize.height
        window.prevSize = undefined
      }
    },

    updateWindowPrevState(
      id: string,
      state: { x: number; y: number; width: number; height: number },
    ) {
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        window.prevSize = state
      }
    },
  },

  getters: {
    activeWindow: (state) => state.windows.find((w) => w.id === state.activeWindowId) || null,
  },
})
