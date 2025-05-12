import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import scrollVisibility from './directives/scrollVisibility'

const app = createApp(App)

app.use(createPinia())

app.directive('scroll-visibility', scrollVisibility)

app.mount('#app')
