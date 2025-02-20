import type { Component } from 'vue'

export interface AppManifest {
  id: string
  name: string
  version: string
  icon?: string
  permissions: string[]
}

export interface AppComponent {
  default: Component
}

export interface RegisteredApp {
  manifest: AppManifest
  component: AppComponent
}
