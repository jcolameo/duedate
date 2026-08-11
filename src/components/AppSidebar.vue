<script setup>
import { useRoute } from 'vue-router'

const route = useRoute()

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/deadlines', label: 'Deadlines', icon: '📅' },
]

const COMING_SOON_ITEMS = [
  { label: 'Stundenplan', icon: '📊' },
  { label: 'My Week', icon: '🗓️' },
  { label: 'Projects', icon: '📁' },
  { label: 'Life Planner', icon: '❤️' },
  { label: 'Capture', icon: '📥' },
  { label: 'Freelance', icon: '💼' },
  { label: 'Jobs', icon: '🔍' },
]

function isActive(path) {
  return route.path === path
}
</script>

<template>
  <aside class="w-56 shrink-0 border-r border-slate-800 bg-slate-900 p-4 flex flex-col">
    <div class="mb-6 px-2">
      <p class="text-sm font-bold text-emerald-400">📅 DueDate</p>
      <p class="text-xs text-slate-500">Deadlines & planning</p>
    </div>

    <nav class="space-y-1">
      <RouterLink v-for="item in NAV_ITEMS" :key="item.path" :to="item.path" :class="[
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition',
        isActive(item.path)
          ? 'bg-emerald-500/10 text-emerald-400 font-semibold'
          : 'text-slate-300 hover:bg-slate-800',
      ]">
        <span>{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>

      <div v-for="item in COMING_SOON_ITEMS" :key="item.label"
        class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-600" title="Coming soon">
        <span class="opacity-50">{{ item.icon }}</span>
        <span class="opacity-50">{{ item.label }}</span>
        <span class="ml-auto text-[10px] uppercase tracking-wide text-slate-700">Soon</span>
      </div>
    </nav>
  </aside>
</template>
