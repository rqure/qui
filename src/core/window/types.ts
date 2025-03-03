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
  }
}

export interface WindowOptions {
  title: string
  width?: number
  height?: number
  x?: number
  y?: number
  component: Component
  icon?: string
}
