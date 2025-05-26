import './assets/main.css'
import './assets/interactive.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

// Create Pinia before app to make stores available for initial auth check
const pinia = createPinia()

const app = createApp(App)
app.use(pinia)

// Mount the app
app.mount('#app')
