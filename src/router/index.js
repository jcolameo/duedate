import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DeadlinesView from '../views/DeadlinesView.vue'
import StundenplanView from '../views/StundenplanView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/deadlines', name: 'deadlines', component: DeadlinesView },
    { path: '/stundenplan', name: 'stundenplan', component: StundenplanView },
    { path: '/settings', name: 'settings', component: SettingsView },
  ],
})

export default router
