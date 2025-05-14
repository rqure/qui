import type { Component } from 'vue'

export interface AppManifest {
  id: string
  name: string
  version: string
  icon?: string
  permissions: string[]
  defaultWindowSize?: {
    width: number
    height: number
  }
}

export interface AppComponent {
  default: Component
}

export interface RegisteredApp {
  manifest: AppManifest
  component: AppComponent
}
