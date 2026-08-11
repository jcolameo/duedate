<script setup>
import { computed } from 'vue'
import { useAvailability } from '../composables/useAvailability.js'
import { usePlanState } from '../composables/usePlanState.js'
import { useCombinedExport } from '../composables/useCombinedExport.js'
import { useLocale } from '../composables/useLocale.js'
import { WORK_DAYS, DAY_START_MIN, DAY_END_MIN, getWeekDays } from '../utils/scheduler.js'

const { blocks } = useAvailability()
const { plan, generate: handleGeneratePlan, enrichedTasks } = usePlanState()
const { exportMessage, exportError, exportWeekToICS } = useCombinedExport()
const { t } = useLocale()

const weekDays = computed(() => plan.value?.days || getWeekDays(new Date()))

function handleExportWeek() {
  exportWeekToICS(enrichedTasks.value, plan.value?.sessions || [])
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const deadlinesByDay = computed(() => {
  const map = {}
  for (const day of weekDays.value) map[day.label] = []
  for (const task of enrichedTasks.value) {
    if (!task._deadlineDate) continue
    const day = weekDays.value.find(d => sameDay(d.date, task._deadlineDate))
    if (day) map[day.label].push(task)
  }
  return map
})

const TOTAL_SLOTS = (DAY_END_MIN - DAY_START_MIN) / 30

const hourMarks = computed(() => {
  const marks = []
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) {
    marks.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:00`)
  }
  return marks
})

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

function gridStyle(dayLabel, startMin, endMin) {
  const dayIdx = WORK_DAYS.indexOf(dayLabel)
  const rowStart = Math.max(1, Math.round((startMin - DAY_START_MIN) / 30) + 1)
  const rowSpan = Math.max(1, Math.round((endMin - startMin) / 30))
  return {
    gridColumn: String(dayIdx + 2),
    gridRow: `${rowStart} / span ${rowSpan}`,
  }
}

const availabilityForGrid = computed(() =>
  blocks.value
    .map(b => {
      const start = Math.max(DAY_START_MIN, toMinutes(b.startTime))
      const end = Math.min(DAY_END_MIN, toMinutes(b.endTime))
      return { ...b, start, end }
    })
    .filter(b => b.end > b.start)
)
</script>

<template>
  <div class="min-h-screen bg-slate-950 light:bg-slate-50 text-slate-100 light:text-slate-900 p-10">
    <div class="max-w-5xl mx-auto">
      <header class="mb-8 flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 class="text-3xl font-bold text-emerald-400 light:text-emerald-600">{{ t('myWeek.title') }}</h1>
          <p class="mt-2 text-slate-400 light:text-slate-500">
            {{ t('myWeek.subtitle') }}
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button type="button" @click="handleGeneratePlan"
            class="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition">
            {{ t('myWeek.generatePlan') }}
          </button>
          <button type="button" @click="handleExportWeek"
            class="px-5 py-2 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-slate-200 light:text-slate-700 font-bold rounded-xl transition border border-slate-700 light:border-slate-300">
            {{ t('myWeek.exportWeek') }}
          </button>
        </div>
      </header>

      <!-- Legend -->
      <div class="flex items-center gap-5 mb-4 text-xs text-slate-400 light:text-slate-500 flex-wrap">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-red-500/70"></span>
          {{ t('myWeek.legendDeadline') }}</span>
        <span class="flex items-center gap-1.5"><span
            class="w-2.5 h-2.5 rounded-sm bg-emerald-500/60 border border-emerald-500"></span> {{ t('myWeek.legendSession') }}</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-sm bg-slate-700"></span>
          {{ t('myWeek.legendAvailability') }}</span>
      </div>

      <div v-if="exportMessage" class="text-sm text-emerald-400 light:text-emerald-600 mb-2">{{ exportMessage }}</div>
      <div v-if="exportError" class="text-sm text-red-400 light:text-red-600 mb-2">{{ exportError }}</div>

      <div v-if="!plan" class="text-sm text-slate-500 mb-3">
        {{ t('myWeek.noPlanYet') }}
      </div>

      <div class="overflow-x-auto">
        <div class="min-w-[50rem]">
          <!-- Day headers -->
          <div class="grid mb-1" style="grid-template-columns: 3rem repeat(7, 1fr);">
            <div></div>
            <div v-for="day in weekDays" :key="day.label" class="text-center pb-1">
              <div class="text-xs font-semibold text-slate-400 light:text-slate-500">{{ t('common.days.' + day.label) }}</div>
            </div>
          </div>

          <!-- Deadline markers (all-day row) -->
          <div class="grid mb-1" style="grid-template-columns: 3rem repeat(7, 1fr);">
            <div></div>
            <div v-for="day in weekDays" :key="'dl-' + day.label" class="px-0.5">
              <div v-for="task in deadlinesByDay[day.label]" :key="task._id"
                class="bg-red-500/20 border border-red-500/50 text-red-300 light:text-red-700 rounded px-1 py-0.5 text-[10px] leading-tight mb-0.5 truncate"
                :title="task._title">
                🚩 {{ task._title || t('common.dash') }}
              </div>
            </div>
          </div>

          <!-- Hourly grid -->
          <div class="relative grid rounded-xl border border-slate-800 light:border-slate-200 overflow-hidden"
            :style="{ gridTemplateColumns: '3rem repeat(7, 1fr)', gridTemplateRows: `repeat(${TOTAL_SLOTS}, 1.35rem)` }">

            <div v-for="(h, i) in hourMarks" :key="h" class="text-[10px] text-slate-600 text-right pr-1.5 -mt-1.5"
              :style="{ gridColumn: '1', gridRow: `${i * 2 + 1}` }">
              {{ h }}
            </div>

            <div v-for="(day, dIdx) in weekDays" :key="'bg-' + day.label"
              class="border-l border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-white"
              :style="{ gridColumn: String(dIdx + 2), gridRow: `1 / span ${TOTAL_SLOTS}` }">
            </div>

            <div v-for="(b, i) in availabilityForGrid" :key="'avail-' + i"
              class="bg-slate-700/40 light:bg-slate-300/60 rounded mx-0.5 my-px" :style="gridStyle(b.day, b.start, b.end)"
              :title="b.label">
            </div>

            <template v-if="plan">
              <div v-for="(s, i) in plan.sessions" :key="'sess-' + i"
                class="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 light:text-emerald-700 rounded mx-0.5 my-px px-1 text-[10px] leading-tight overflow-hidden"
                :style="gridStyle(s.day, s.startMin, s.endMin)" :title="`${s.title} (${s.startTime}–${s.endTime})`">
                {{ s.title }}
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
