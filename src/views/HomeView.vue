<script setup>
import { computed } from 'vue'
import { useCSVImport } from '../composables/useCSVImport.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useLocale } from '../composables/useLocale.js'

const { tasks } = useCSVImport()
const { userMapping } = useColumnMapping()
const { enrichedTasks, STATUS_STYLES } = useTaskEnrichment(tasks, userMapping)
const { t } = useLocale()

const overdueCount = computed(() => enrichedTasks.value.filter(t => t._status.code === 'overdue').length)
const urgentCount = computed(() => enrichedTasks.value.filter(t => t._status.code === 'urgent').length)
const focusTask = computed(() => enrichedTasks.value.find(t => t._days !== null) || null)
const upcoming = computed(() => enrichedTasks.value.slice(0, 5))
</script>

<template>
  <div class="min-h-screen bg-slate-950 light:bg-slate-50 text-slate-100 light:text-slate-900 p-10">
    <div class="max-w-4xl mx-auto">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-emerald-400 light:text-emerald-600">{{ t('home.title') }}</h1>
        <p class="mt-2 text-slate-400 light:text-slate-500">{{ t('home.subtitle') }}</p>
      </header>

      <!-- Empty State -->
      <div v-if="enrichedTasks.length === 0"
        class="p-8 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl text-center">
        <p class="text-slate-300 light:text-slate-600 mb-4">{{ t('home.emptyState') }}</p>
        <RouterLink to="/deadlines"
          class="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition">
          {{ t('home.importCta') }}
        </RouterLink>
      </div>

      <template v-else>
        <!-- Stat Tiles -->
        <div class="grid grid-cols-3 gap-4 mb-8">
          <div class="p-5 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
            <p class="text-2xl font-bold text-red-400 light:text-red-600">{{ overdueCount }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ t('home.overdue') }}</p>
          </div>
          <div class="p-5 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
            <p class="text-2xl font-bold text-orange-400 light:text-orange-600">{{ urgentCount }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ t('home.urgent') }}</p>
          </div>
          <div class="p-5 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
            <p class="text-2xl font-bold text-slate-100 light:text-slate-900">{{ enrichedTasks.length }}</p>
            <p class="text-xs text-slate-500 mt-1">{{ t('home.trackedTotal') }}</p>
          </div>
        </div>

        <!-- Focus Callout -->
        <div v-if="focusTask" class="mb-8 p-6 bg-slate-900 light:bg-white border border-emerald-500/30 rounded-2xl">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-400 light:text-emerald-600 mb-2">
            {{ t('home.focus') }}
          </p>
          <p class="text-slate-100 light:text-slate-900">
            {{ t('home.startWith') }} <strong>{{ focusTask._title || t('common.untitled') }}</strong>
            <span v-if="focusTask._days < 0"> — {{ t('home.daysOverdue', { days: Math.abs(focusTask._days) }) }}</span>
            <span v-else> — {{ t('home.dueInDays', { days: focusTask._days }) }}</span>
          </p>
          <RouterLink to="/deadlines"
            class="inline-block mt-4 text-sm text-emerald-400 light:text-emerald-600 underline hover:text-emerald-300 light:hover:text-emerald-500">
            {{ t('home.goToDeadlines') }}
          </RouterLink>
        </div>

        <!-- Upcoming List -->
        <div>
          <h2 class="text-lg font-bold text-slate-100 light:text-slate-900 mb-4">{{ t('home.upcoming') }}</h2>
          <div class="space-y-2">
            <div v-for="(task, index) in upcoming" :key="index"
              class="flex items-center justify-between p-4 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-xl">
              <div>
                <p class="text-sm font-medium text-slate-200 light:text-slate-800">{{ task._title || t('common.dash') }}</p>
                <p class="text-xs text-slate-500">{{ task._category || t('common.dash') }}</p>
              </div>
              <span
                :class="['inline-block px-2.5 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[task._status.color]]">
                {{ task._status.label }}
              </span>
            </div>
          </div>
          <RouterLink to="/deadlines"
            class="inline-block mt-4 text-sm text-emerald-400 light:text-emerald-600 underline hover:text-emerald-300 light:hover:text-emerald-500">
            {{ t('home.viewAllInDeadlines') }}
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>
