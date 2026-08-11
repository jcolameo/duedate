<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'

const route = useRoute()
const { theme, toggleTheme } = useTheme()
const { t } = useLocale()

const NAV_ITEMS = computed(() => [
  { path: '/', label: t('nav.home'), icon: '🏠' },
  { path: '/deadlines', label: t('nav.deadlines'), icon: '📅' },
  { path: '/stundenplan', label: t('nav.stundenplan'), icon: '📊' },
  { path: '/my-week', label: t('nav.myWeek'), icon: '🗓️' },
])

const COMING_SOON_ITEMS = computed(() => [
  { label: t('nav.projects'), icon: '📁' },
  { label: t('nav.lifePlanner'), icon: '❤️' },
  { label: t('nav.capture'), icon: '📥' },
  { label: t('nav.freelance'), icon: '💼' },
  { label: t('nav.jobs'), icon: '🔍' },
])

function isActive(path) {
  return route.path === path
}

const themeToggleLabel = computed(() => (theme.value === 'dark' ? t('nav.lightMode') : t('nav.darkMode')))
</script>

<template>
  <aside
    class="w-60 shrink-0 border-r border-slate-800/60 light:border-slate-200 bg-slate-950 light:bg-slate-50 p-5 flex flex-col">
    <div class="mb-8 px-2">
      <p class="text-base font-bold text-emerald-400 light:text-emerald-600">📅 DueDate</p>
      <p class="text-xs text-slate-500 mt-0.5">{{ t('nav.subtitle') }}</p>
    </div>

    <nav class="space-y-1">
      <RouterLink v-for="item in NAV_ITEMS" :key="item.path" :to="item.path" :class="[
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition',
        isActive(item.path)
          ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
          : 'text-slate-300 light:text-slate-600 hover:bg-slate-900 light:hover:bg-slate-100',
      ]">
        <span>{{ item.icon }}</span>
        <span>{{ item.label }}</span>
      </RouterLink>

      <div v-for="item in COMING_SOON_ITEMS" :key="item.label"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-600 light:text-slate-400"
        :title="t('nav.soon')">
        <span class="opacity-50">{{ item.icon }}</span>
        <span class="opacity-50">{{ item.label }}</span>
        <span class="ml-auto text-[10px] uppercase tracking-wide text-slate-700 light:text-slate-400">{{ t('nav.soon') }}</span>
      </div>
    </nav>

    <div class="mt-auto pt-4 space-y-1 border-t border-slate-800/60 light:border-slate-200">
      <button type="button" @click="toggleTheme"
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-slate-300 light:text-slate-600 hover:bg-slate-900 light:hover:bg-slate-100 transition text-left">
        <span>{{ themeToggleLabel }}</span>
      </button>

      <RouterLink to="/settings" :class="[
        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition',
        isActive('/settings')
          ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
          : 'text-slate-300 light:text-slate-600 hover:bg-slate-900 light:hover:bg-slate-100',
      ]">
        <span>⚙️</span>
        <span>{{ t('nav.settings') }}</span>
      </RouterLink>
    </div>
  </aside>
</template>
