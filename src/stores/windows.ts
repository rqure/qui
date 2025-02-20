import { defineStore } from 'pinia'
import type { WindowState, WindowOptions } from '@/core/window/types'
import { createWindowState } from '@/core/window/utils'

export const useWindowStore = defineStore('windows', {
  state: () => ({
    windows: [] as WindowState[],
    activeWindowId: null as string | null, // Renamed from activeWindow
    nextZIndex: 1,
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
      this.activeWindowId = id // Updated to use new property name
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        window.zIndex = this.nextZIndex++
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
        // Keep track of active window when minimizing
        if (this.activeWindowId === id) {
          this.activeWindowId = null
        }
      }
    },

    maximizeWindow(id: string) {
      const win = this.windows.find((w) => w.id === id)
      if (win) {
        if (win.isMaximized) {
          if (win.prevSize) {
            win.x = win.prevSize.x
            win.y = win.prevSize.y
            win.width = win.prevSize.width
            win.height = win.prevSize.height
          }
        } else {
          win.prevSize = {
            x: win.x,
            y: win.y,
            width: win.width,
            height: win.height,
          }
          win.x = 0
          win.y = 0
          win.width = globalThis.window.innerWidth
          win.height = globalThis.window.innerHeight
        }
        win.isMaximized = !win.isMaximized
      }
    },

    restoreWindow(id: string) {
      const window = this.windows.find((w) => w.id === id)
      if (window) {
        window.isMinimized = false
        this.activateWindow(id)
      }
    },
  },

  getters: {
    activeWindow: (state) => state.windows.find((w) => w.id === state.activeWindowId) || null,
  },
})
