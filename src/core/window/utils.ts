import type { WindowState, WindowOptions } from './types'

export function createWindowState(options: WindowOptions): WindowState {
  return {
    id: crypto.randomUUID(),
    title: options.title,
    x: options.x ?? 100,
    y: options.y ?? 100,
    width: options.width ?? 800,
    height: options.height ?? 600,
    isMinimized: false,
    isMaximized: false,
    zIndex: 0,
    component: options.component,
    icon: options.icon,
  }
}

// We can add more window-related utilities here in the future
// Like window positioning helpers, size constraints, etc.
