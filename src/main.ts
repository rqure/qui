import './assets/main.css'
import './assets/interactive.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import databaseBrowserApp from './apps/database-browser'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Now register apps after Pinia is initialized
import { useAppStore } from './stores/apps'
const appStore = useAppStore()
appStore.registerApp(databaseBrowserApp)

app.mount('#app')
