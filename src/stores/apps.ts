import { defineStore } from 'pinia'
import { ref, defineComponent, markRaw } from 'vue'
import type { RegisteredApp } from '@/core/apps/types'
import { useWindowStore } from './windows'

export const useAppStore = defineStore('apps', () => {
  const registeredApps = ref<Map<string, RegisteredApp>>(new Map())
  const windowStore = useWindowStore()

  function registerApp(app: RegisteredApp) {
    registeredApps.value.set(app.manifest.id, app)
  }

  function launchApp(appId: string) {
    const app = registeredApps.value.get(appId)
    if (app) {
      const defaultSize = app.manifest.defaultWindowSize || { width: 800, height: 600 }

      const window = windowStore.createWindow({
        title: app.manifest.name,
        component: app.component.default,
        icon: app.manifest.icon,
        width: defaultSize.width,
        height: defaultSize.height,
        props: {
          windowId: undefined // Will be set after creation
        }
      })
      
      // Set the window ID in the props after creation
      window.props = { ...window.props, windowId: window.id }
    }
  }

  return {
    registeredApps,
    registerApp,
    launchApp,
  }
})
