import type { Component } from 'vue'

export interface WindowState {
  id: string
  title: string
  x: number
  y: number
  width: number
  height: number
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
  component: Component
  icon?: string
  minWidth: number
  minHeight: number
  maxWidth?: number
  maxHeight?: number
  isResizing: boolean
  resizeHandle: '' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
  prevSize?: {
    x: number
    y: number
    width: number
    height: number
  },
  parentId?: string
  props?: Record<string, any>
  onEvent?: (event: string, ...args: any[]) => void
}

export interface WindowOptions {
  id?: string     // Make id an optional property
  title: string
  width?: number
  height?: number
  x?: number
  y?: number
  minWidth?: number  // Add minWidth property
  minHeight?: number // Add minHeight property
  component: Component
  icon?: string
  parentId?: string
  props?: Record<string, any>  // Add props for passing to components
  onEvent?: (event: string, ...args: any[]) => void  // Add event handler
}
