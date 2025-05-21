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
  props?: Record<string, any>
}

export interface WindowOptions {
  id?: string     // Make id an optional property
  title: string
  width?: number
  height?: number
  x?: number
  y?: number
  component: Component
  icon?: string
  props?: Record<string, any>  // Add props for passing to components
}
