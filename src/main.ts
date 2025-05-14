import './assets/main.css'
import './assets/interactive.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)

// Remove app registration from here - it will be handled after login

app.mount('#app')
