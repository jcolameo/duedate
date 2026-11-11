import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
// Phosphor defaults: one icon weight across the app (DESIGN.md §8)
app.provide('weight', 'bold')
app.use(router).mount('#app')
