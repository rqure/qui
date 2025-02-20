import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { AppManifest, RegisteredApp } from '@/core/apps/types'
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
      windowStore.createWindow({
        title: app.manifest.name,
        component: app.component.default,
        icon: app.manifest.icon,
      })
    }
  }

  return {
    registeredApps,
    registerApp,
    launchApp,
  }
})
