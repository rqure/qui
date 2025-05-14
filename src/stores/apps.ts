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

      windowStore.createWindow({
        title: app.manifest.name,
        component: app.component.default,
        icon: app.manifest.icon,
        width: defaultSize.width,
        height: defaultSize.height,
      })
    }
  }

  return {
    registeredApps,
    registerApp,
    launchApp,
  }
})
