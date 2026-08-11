<script setup>
import { ref } from 'vue'
import { useCSVImport } from '../composables/useCSVImport.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useTaskPlanning, EFFORT_OPTIONS, PRIORITY_OPTIONS } from '../composables/useTaskPlanning.js'
import { useAvailability, WEEKDAYS } from '../composables/useAvailability.js'

const { tasks } = useCSVImport()
const { userMapping } = useColumnMapping()
const { enrichedTasks } = useTaskEnrichment(tasks, userMapping)
const { getPlanningFor, setEffort, setPriority } = useTaskPlanning()
const { blocks, addBlock, removeBlock } = useAvailability()

const priorityLabel = { high: 'High', medium: 'Medium', low: 'Low' }

const newBlock = ref({ label: '', day: 'Mon', startTime: '09:00', endTime: '10:00' })

function handleAddBlock() {
  if (!newBlock.value.label.trim()) return
  addBlock({ ...newBlock.value })
  newBlock.value = { label: '', day: 'Mon', startTime: '09:00', endTime: '10:00' }
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 light:bg-slate-50 text-slate-100 light:text-slate-900 p-10">
    <div class="max-w-4xl mx-auto">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-emerald-400 light:text-emerald-600">📊 Stundenplan</h1>
        <p class="mt-2 text-slate-400 light:text-slate-500">
          Set effort estimates and availability. Plan generation comes next.
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
    </div>
  </div>
</template>
