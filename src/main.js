import { createApp } from 'vue'
// Self-hosted fonts (OFL, via @fontsource) — no request to Google Fonts.
// Browsers only download the unicode subsets a page actually uses.
import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/bricolage-grotesque/wght.css'
import '@fontsource/space-mono/latin-400.css'
import '@fontsource/space-mono/latin-700.css'
import './style.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
// Phosphor defaults: one icon weight across the app (DESIGN.md §8)
app.provide('weight', 'bold')
app.use(router).mount('#app')
