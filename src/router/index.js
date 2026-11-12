import { createRouter, createWebHashHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'
import DeadlinesView from '../views/DeadlinesView.vue'
import StundenplanView from '../views/StundenplanView.vue'
import CalendarView from '../views/CalendarView.vue'
import SettingsView from '../views/SettingsView.vue'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/deadlines', name: 'deadlines', component: DeadlinesView },
    { path: '/stundenplan', name: 'stundenplan', component: StundenplanView },
    { path: '/calendar', name: 'calendar', component: CalendarView },
    // Old address of the calendar (it was "Meine Woche")
    { path: '/my-week', redirect: '/calendar' },
    { path: '/settings', name: 'settings', component: SettingsView },
    // Design reference (tokens + components), intentionally not in the sidebar
    { path: '/design', name: 'design', component: () => import('../views/DesignView.vue') },
  ],
})

export default router
