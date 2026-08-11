<script setup>
import { ref, computed } from 'vue'
import { useCSVImport } from '../composables/useCSVImport.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useTaskPlanning, EFFORT_OPTIONS, PRIORITY_OPTIONS } from '../composables/useTaskPlanning.js'
import { useAvailability, WEEKDAYS } from '../composables/useAvailability.js'
import { usePlanExport } from '../composables/usePlanExport.js'
import { generatePlan, WORK_DAYS, DAY_START_MIN, DAY_END_MIN } from '../utils/scheduler.js'

const { tasks } = useCSVImport()
const { userMapping } = useColumnMapping()
const { enrichedTasks } = useTaskEnrichment(tasks, userMapping)
const { getPlanningFor, setEffort, setPriority } = useTaskPlanning()
const { blocks, addBlock, removeBlock } = useAvailability()
const { exportMessage: planExportMessage, exportError: planExportError, exportPlanToICS } = usePlanExport()

const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' }

const newBlock = ref({ label: '', day: 'Mon', startTime: '09:00', endTime: '10:00' })

function handleAddBlock() {
  if (!newBlock.value.label.trim()) return
  addBlock({ ...newBlock.value })
  newBlock.value = { label: '', day: 'Mon', startTime: '09:00', endTime: '10:00' }
}

// Weekly plan preview (deliberately not persisted — a regeneratable
// preview, not stored source of truth; generating is instant and free)
const plan = ref(null)

function handleGeneratePlan() {
  plan.value = generatePlan(enrichedTasks.value, getPlanningFor, blocks.value, new Date())
}

function handleExportPlan() {
  if (plan.value) exportPlanToICS(plan.value.sessions)
}

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
    <div class="max-w-4xl mx-auto">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-emerald-400 light:text-emerald-600">📊 Stundenplan</h1>
        <p class="mt-2 text-slate-400 light:text-slate-500">
          Set effort estimates and availability, then generate a realistic plan for this week.
        </p>
      </header>

      <!-- Tasks to schedule -->
      <section class="mb-10">
        <h2 class="text-lg font-bold text-slate-100 light:text-slate-900 mb-4">Tasks to schedule</h2>

        <div v-if="enrichedTasks.length === 0"
          class="p-8 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl text-center">
          <p class="text-slate-300 light:text-slate-600 mb-4">No deadlines imported yet.</p>
          <RouterLink to="/deadlines"
            class="inline-block px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-xl transition">
            📅 Import your CSV
          </RouterLink>
        </div>

        <div v-else class="space-y-3">
          <div v-for="task in enrichedTasks" :key="task._id"
            class="p-4 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
            <div class="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p class="text-sm font-medium text-slate-200 light:text-slate-800">{{ task._title || '—' }}</p>
                <p class="text-xs text-slate-500">{{ task._category || '—' }} · {{ task._deadline || '—' }}</p>
              </div>

              <div class="flex items-center gap-4 flex-wrap">
                <!-- Priority -->
                <div class="flex items-center gap-1 p-1 bg-slate-950/60 light:bg-slate-100 rounded-lg border border-slate-800 light:border-slate-200">
                  <button v-for="p in PRIORITY_OPTIONS" :key="p" type="button" @click="setPriority(task._id, p)"
                    :class="[
                      'px-2.5 py-1 rounded-md text-xs transition',
                      getPlanningFor(task).priority === p
                        ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
                        : 'text-slate-400 hover:text-slate-200 light:hover:text-slate-700',
                    ]">
                    {{ priorityLabel[p] }}
                  </button>
                </div>

                <!-- Effort -->
                <div class="flex items-center gap-1 p-1 bg-slate-950/60 light:bg-slate-100 rounded-lg border border-slate-800 light:border-slate-200">
                  <button v-for="e in EFFORT_OPTIONS" :key="e" type="button" @click="setEffort(task._id, e)" :class="[
                    'px-2.5 py-1 rounded-md text-xs transition',
                    getPlanningFor(task).effort === e
                      ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 light:hover:text-slate-700',
                  ]">
                    {{ e }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Availability -->
      <section>
        <h2 class="text-lg font-bold text-slate-100 light:text-slate-900 mb-4">Availability</h2>

        <div class="p-5 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl mb-4">
          <div class="flex items-end gap-3 flex-wrap">
            <div class="flex-1 min-w-[10rem]">
              <label class="block text-xs text-slate-500 mb-1">Label</label>
              <input v-model="newBlock.label" type="text" placeholder="Gym, Class, ..."
                class="w-full px-3 py-2 bg-slate-950/60 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-lg text-sm text-slate-200 light:text-slate-800 focus:border-emerald-400 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Day</label>
              <select v-model="newBlock.day"
                class="px-3 py-2 bg-slate-950/60 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-lg text-sm text-slate-200 light:text-slate-800 focus:border-emerald-400 focus:outline-none">
                <option v-for="d in WEEKDAYS" :key="d" :value="d">{{ d }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">Start</label>
              <input v-model="newBlock.startTime" type="time"
                class="px-3 py-2 bg-slate-950/60 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-lg text-sm text-slate-200 light:text-slate-800 focus:border-emerald-400 focus:outline-none" />
            </div>
            <div>
              <label class="block text-xs text-slate-500 mb-1">End</label>
              <input v-model="newBlock.endTime" type="time"
                class="px-3 py-2 bg-slate-950/60 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-lg text-sm text-slate-200 light:text-slate-800 focus:border-emerald-400 focus:outline-none" />
            </div>
            <button type="button" @click="handleAddBlock"
              class="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold rounded-lg transition">
              + Add
            </button>
          </div>
        </div>

        <div v-if="blocks.length === 0" class="text-sm text-slate-500 px-1">
          No availability blocks yet.
        </div>
        <div v-else class="space-y-2">
          <div v-for="block in blocks" :key="block.id"
            class="flex items-center justify-between p-4 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-xl">
            <div>
              <p class="text-sm font-medium text-slate-200 light:text-slate-800">{{ block.label }}</p>
              <p class="text-xs text-slate-500">{{ block.day }} · {{ block.startTime }}–{{ block.endTime }}</p>
            </div>
            <button type="button" @click="removeBlock(block.id)"
              class="text-slate-500 hover:text-red-400 light:hover:text-red-600 text-sm transition">
              Remove
            </button>
          </div>
        </div>
      </section>

      <!-- Weekly Plan -->
      <section class="mt-10">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 class="text-lg font-bold text-slate-100 light:text-slate-900">Weekly plan</h2>
          <div class="flex items-center gap-3">
            <button type="button" @click="handleGeneratePlan" :disabled="enrichedTasks.length === 0"
              class="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 light:disabled:bg-slate-200 disabled:text-slate-500 light:disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition">
              ⚡ Generate plan
            </button>
            <button type="button" @click="handleExportPlan" :disabled="!plan || plan.sessions.length === 0"
              class="px-5 py-2 bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 light:text-slate-700 font-bold rounded-xl transition border border-slate-700 light:border-slate-300">
              📅 Export to .ics
            </button>
          </div>
        </div>

        <div v-if="!plan" class="text-sm text-slate-500 px-1">
          Click "Generate plan" to propose work sessions for this week's deadlines.
        </div>

        <template v-else>
          <p class="text-sm text-slate-300 light:text-slate-600 mb-2">
            Scheduled <strong>{{ plan.sessions.length }}</strong> of
            <strong>{{ plan.sessions.length + plan.unscheduled.length }}</strong> tasks this week.
            <span v-if="plan.unscheduled.length > 0">
              {{ plan.unscheduled.length }} couldn't fit before their deadline — consider reducing scope,
              shortening estimates, or extending availability.
            </span>
          </p>

          <div v-if="planExportMessage" class="text-sm text-emerald-400 light:text-emerald-600 mb-2">
            {{ planExportMessage }}
          </div>
          <div v-if="planExportError" class="text-sm text-red-400 light:text-red-600 mb-2">
            {{ planExportError }}
          </div>

          <div class="overflow-x-auto">
            <div class="min-w-[42rem]">
              <!-- Day headers -->
              <div class="grid mb-1" style="grid-template-columns: 3rem repeat(7, 1fr);">
                <div></div>
                <div v-for="day in plan.days" :key="day.label"
                  class="text-center text-xs font-semibold text-slate-400 light:text-slate-500 pb-1">
                  {{ day.label }}
                </div>
              </div>

              <!-- Grid body -->
              <div class="relative grid rounded-xl border border-slate-800 light:border-slate-200 overflow-hidden"
                :style="{ gridTemplateColumns: '3rem repeat(7, 1fr)', gridTemplateRows: `repeat(${TOTAL_SLOTS}, 1.35rem)` }">

                <!-- hour labels -->
                <div v-for="(h, i) in hourMarks" :key="h" class="text-[10px] text-slate-600 text-right pr-1.5 -mt-1.5"
                  :style="{ gridColumn: '1', gridRow: `${i * 2 + 1}` }">
                  {{ h }}
                </div>

                <!-- day column backgrounds -->
                <div v-for="(day, dIdx) in plan.days" :key="'bg-' + day.label"
                  class="border-l border-slate-800 light:border-slate-200 bg-slate-900/40 light:bg-white"
                  :style="{ gridColumn: String(dIdx + 2), gridRow: `1 / span ${TOTAL_SLOTS}` }">
                </div>

                <!-- availability (busy) blocks -->
                <div v-for="(b, i) in availabilityForGrid" :key="'avail-' + i"
                  class="bg-slate-700/40 light:bg-slate-300/60 rounded mx-0.5 my-px"
                  :style="gridStyle(b.day, b.start, b.end)" :title="b.label">
                </div>

                <!-- scheduled sessions -->
                <div v-for="(s, i) in plan.sessions" :key="'sess-' + i"
                  class="bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 light:text-emerald-700 rounded mx-0.5 my-px px-1 text-[10px] leading-tight overflow-hidden"
                  :style="gridStyle(s.day, s.startMin, s.endMin)" :title="`${s.title} (${s.startTime}–${s.endTime})`">
                  {{ s.title }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="plan.unscheduled.length > 0" class="mt-4 space-y-1">
            <p v-for="u in plan.unscheduled" :key="u.taskId" class="text-xs text-slate-500">
              ⚠️ {{ u.title }} — {{ u.reason }}
            </p>
          </div>
        </template>
      </section>
    </div>
  </div>
</template>
