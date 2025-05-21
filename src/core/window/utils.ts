import type { WindowState, WindowOptions } from './types'
import { v4 as uuidv4 } from 'uuid'

export const createWindowState = (options: WindowOptions): WindowState => ({
  id: options.id || uuidv4(), // Use provided ID or generate a UUID
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
  minWidth: 200,
  minHeight: 150,
  isResizing: false,
  resizeHandle: '',
  props: options.props || {},
})

// We can add more window-related utilities here in the future
// Like window positioning helpers, size constraints, etc.
