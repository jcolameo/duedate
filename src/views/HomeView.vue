<script setup>
import { computed } from 'vue'
import { useCSVImport } from '../composables/useCSVImport.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'

const { tasks } = useCSVImport()
const { userMapping } = useColumnMapping()
const { enrichedTasks, STATUS_STYLES } = useTaskEnrichment(tasks, userMapping)

const overdueCount = computed(() => enrichedTasks.value.filter(t => t._status.label === 'OVERDUE').length)
const urgentCount = computed(() => enrichedTasks.value.filter(t => t._status.label === 'URGENT').length)
const focusTask = computed(() => enrichedTasks.value.find(t => t._days !== null) || null)
const upcoming = computed(() => enrichedTasks.value.slice(0, 5))
</script>

<template>
  <div class="min-h-screen bg-slate-950 light:bg-slate-50 text-slate-100 light:text-slate-900 p-10">
    <div class="max-w-4xl mx-auto">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-emerald-400 light:text-emerald-600">🏠 Home</h1>
        <p class="mt-2 text-slate-400 light:text-slate-500">Your deadlines at a glance.</p>
      </header>

      <!-- Empty State -->
      <div v-if="enrichedTasks.length === 0"
        class="p-8 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl text-center">
        <p class="text-slate-300 light:text-slate-600 mb-4">No deadlines imported yet.</p>
        <RouterLink to="/deadlines"
          class="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition">
          📅 Import your CSV
        </RouterLink>
      </div>

      <template v-else>
        <!-- Stat Tiles -->
        <div class="grid grid-cols-3 gap-4 mb-8">
          <div class="p-5 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
            <p class="text-2xl font-bold text-red-400 light:text-red-600">{{ overdueCount }}</p>
            <p class="text-xs text-slate-500 mt-1">overdue</p>
          </div>
          <div class="p-5 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
            <p class="text-2xl font-bold text-orange-400 light:text-orange-600">{{ urgentCount }}</p>
            <p class="text-xs text-slate-500 mt-1">urgent (&lt;3d)</p>
          </div>
          <div class="p-5 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
            <p class="text-2xl font-bold text-slate-100 light:text-slate-900">{{ enrichedTasks.length }}</p>
            <p class="text-xs text-slate-500 mt-1">tracked total</p>
          </div>
        </div>

        <!-- Focus Callout -->
        <div v-if="focusTask" class="mb-8 p-6 bg-slate-900 light:bg-white border border-emerald-500/30 rounded-2xl">
          <p class="text-xs font-semibold uppercase tracking-wide text-emerald-400 light:text-emerald-600 mb-2">Focus
          </p>
          <p class="text-slate-100 light:text-slate-900">
            Start with <strong>{{ focusTask._title || 'this task' }}</strong>
            <span v-if="focusTask._days < 0"> — {{ Math.abs(focusTask._days) }}d overdue</span>
            <span v-else> — due in {{ focusTask._days }}d</span>
          </p>
          <RouterLink to="/deadlines"
            class="inline-block mt-4 text-sm text-emerald-400 light:text-emerald-600 underline hover:text-emerald-300 light:hover:text-emerald-500">
            Go to Deadlines →
          </RouterLink>
        </div>

        <!-- Upcoming List -->
        <div>
          <h2 class="text-lg font-bold text-slate-100 light:text-slate-900 mb-4">Upcoming</h2>
          <div class="space-y-2">
            <div v-for="(task, index) in upcoming" :key="index"
              class="flex items-center justify-between p-4 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-xl">
              <div>
                <p class="text-sm font-medium text-slate-200 light:text-slate-800">{{ task._title || '—' }}</p>
                <p class="text-xs text-slate-500">{{ task._category || '—' }}</p>
              </div>
              <span
                :class="['inline-block px-2.5 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[task._status.color]]">
                {{ task._status.label }}
              </span>
            </div>
          </div>
          <RouterLink to="/deadlines"
            class="inline-block mt-4 text-sm text-emerald-400 light:text-emerald-600 underline hover:text-emerald-300 light:hover:text-emerald-500">
            View all in Deadlines →
          </RouterLink>
        </div>
      </template>
    </div>
  </div>
</template>
