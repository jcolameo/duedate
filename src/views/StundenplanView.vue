<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhTray, PhUploadSimple, PhPlus, PhTrash, PhCalendarPlus, PhDownloadSimple } from '@phosphor-icons/vue'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useTaskPlanning, PRIORITY_OPTIONS } from '../composables/useTaskPlanning.js'
import EffortInput from '../components/ui/EffortInput.vue'
import { useAvailability } from '../composables/useAvailability.js'
import { formatDays, isValidTimeRange } from '../utils/availability.js'
import { usePlanExport } from '../composables/usePlanExport.js'
import { usePlanState } from '../composables/usePlanState.js'
import { usePlannerSettings, BUFFER_OPTIONS, MAX_HOURS_OPTIONS } from '../composables/usePlannerSettings.js'
import { summarizePlan, summarizeByTask, sessionsInWeek, shortDate } from '../utils/planSummary.js'
import { formatMinutes } from '../utils/estimate.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { useTaskDetail } from '../composables/useTaskDetail.js'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseInput from '../components/ui/BaseInput.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import DueBadge from '../components/ui/DueBadge.vue'
import InlineNotice from '../components/ui/InlineNotice.vue'
import WeekGrid from '../components/WeekGrid.vue'
import DayPicker from '../components/ui/DayPicker.vue'

const { openTasks: enrichedTasks } = useTaskEnrichment()
const { getPlanningFor, setEstimate, setPriority } = useTaskPlanning()
const { blocks, addBlock, removeBlock, restoreBlock } = useAvailability()
const { exportMessage, exportError, exportPlanToICS } = usePlanExport()
const { plan, generate: handleGeneratePlan } = usePlanState()
const { t, locale } = useLocale()
const toast = useToast()
const { settings } = usePlannerSettings()
// At least one working day stays selected (an empty choice is ignored)
const workDays = computed({
  get: () => settings.value.workDays,
  set: (days) => { if (days.length) settings.value.workDays = days },
})
const { openTask } = useTaskDetail()

watch(exportMessage, (msg) => { if (msg) toast.show(msg, { tone: 'success' }) })

const priorityOptions = computed(() =>
  PRIORITY_OPTIONS.map(p => ({ value: p, label: t('stundenplan.priority' + p[0].toUpperCase() + p.slice(1)) })),
)

const bufferOptions = BUFFER_OPTIONS.map(v => ({ value: v, label: String(v) }))
const maxHoursOptions = MAX_HOURS_OPTIONS.map(v => ({ value: v, label: `${v} h` }))

const decimal = computed(() => (locale.value === 'de' ? ',' : '.'))
const time = (min) => formatMinutes(min, decimal.value)
const summary = computed(() => summarizePlan(plan.value))
const byTask = computed(() => summarizeByTask(plan.value))
const weekSessions = computed(() => (plan.value ? sessionsInWeek(plan.value.sessions, plan.value.days) : []))

/** "Für „Portfolio“ fehlen 4 h vor dem 10.12." */
function shortfallText(s) {
  const key = s.overdue ? 'stundenplan.shortfallOverdue' : 'stundenplan.shortfall'
  const base = t(key, { title: s.title, time: time(s.missingMin), date: shortDate(s.deadline) })
  return s.defaultEstimate ? `${base} ${t('stundenplan.shortfallDefault', { time: time(s.neededMin) })}` : base
}

function planned(task) {
  const entry = byTask.value.get(task._id)
  return entry ? t('stundenplan.plannedFor', { count: entry.count, time: time(entry.minutes), date: shortDate(entry.last) }) : ''
}

const emptyBlock = () => ({ label: '', days: [], startTime: '09:00', endTime: '10:00' })
const newBlock = ref(emptyBlock())
const triedSubmit = ref(false)

// Validation: days are checked after the first submit attempt, the time range live
const daysError = computed(() => (triedSubmit.value && newBlock.value.days.length === 0 ? t('stundenplan.errorNoDays') : ''))
const timeError = computed(() =>
  isValidTimeRange(newBlock.value.startTime, newBlock.value.endTime) ? '' : t('stundenplan.errorTimeRange'),
)

function handleAddBlock() {
  triedSubmit.value = true
  const label = newBlock.value.label.trim()
  if (!label || daysError.value || timeError.value) return
  addBlock({ ...newBlock.value, label })
  newBlock.value = emptyBlock()
  triedSubmit.value = false
}

function handleRemoveBlock(block) {
  const index = blocks.value.findIndex(b => b.id === block.id)
  removeBlock(block.id)
  toast.show(t('stundenplan.blockRemoved', { label: block.label }), {
    action: { label: t('ui.undo'), onClick: () => restoreBlock(block, index) },
  })
}

const dayLabel = (code) => t('common.days.' + code)

function handleExportPlan() {
  if (plan.value) exportPlanToICS(plan.value.sessions)
}
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10 sm:px-10">
    <PageHeader :title="t('stundenplan.title')" accent="." :description="t('stundenplan.subtitle')" />

    <!-- Tasks: effort + priority -->
    <section class="mt-12" aria-labelledby="h-tasks">
      <h2 id="h-tasks" class="mb-3 font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('stundenplan.tasksToSchedule') }}</h2>

      <EmptyState v-if="enrichedTasks.length === 0" :icon="PhTray" :title="t('stundenplan.emptyTitle')" :description="t('stundenplan.emptyState')">
        <BaseButton :as="RouterLink" to="/deadlines" :icon="PhUploadSimple">{{ t('stundenplan.importCta') }}</BaseButton>
      </EmptyState>

      <BaseCard v-else padding="none">
        <ul class="divide-y divide-line">
          <li v-for="task in enrichedTasks" :key="task._id" class="flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3">
            <div class="min-w-0 flex-1 basis-56">
              <p class="truncate text-sm font-medium">{{ task._title || t('common.untitled') }}</p>
              <p class="mt-0.5 flex items-center gap-3 text-[13px] text-ink-muted">
                <span v-if="task._category" class="truncate">{{ task._category }}</span>
                <DueBadge :code="task._status.code" :days="task._days" />
              </p>
              <p v-if="planned(task)" class="mt-0.5 font-mono text-[12px] text-ink-muted">{{ planned(task) }}</p>
            </div>
            <SegmentedControl
              size="sm"
              :label="`${t('stundenplan.priority')}: ${task._title}`"
              :options="priorityOptions"
              :model-value="getPlanningFor(task).priority"
              @update:model-value="setPriority(task._id, $event)"
            />
            <EffortInput
              size="sm"
              :label="`${t('estimate.label')}: ${task._title}`"
              :model-value="task.estimateMin"
              @update:model-value="setEstimate(task._id, $event)"
            />
          </li>
        </ul>
      </BaseCard>
    </section>

    <!-- Busy times -->
    <section class="mt-12" aria-labelledby="h-busy">
      <h2 id="h-busy" class="font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('stundenplan.availability') }}</h2>
      <p class="mb-3 mt-1 text-sm text-ink-muted">{{ t('stundenplan.availabilityHint') }}</p>

      <BaseCard>
        <form class="flex flex-wrap items-start gap-4" novalidate @submit.prevent="handleAddBlock">
          <div class="min-w-48 flex-1"><BaseInput v-model="newBlock.label" :label="t('stundenplan.labelField')" :placeholder="t('stundenplan.labelPlaceholder')" /></div>
          <DayPicker v-model="newBlock.days" :label="t('stundenplan.daysField')" :error="daysError" />
          <div class="w-32"><BaseInput v-model="newBlock.startTime" type="time" :label="t('stundenplan.startField')" class="font-mono" /></div>
          <div class="w-32"><BaseInput v-model="newBlock.endTime" type="time" :label="t('stundenplan.endField')" class="font-mono" :error="timeError" /></div>
          <div class="pt-[26px]"><BaseButton type="submit" :icon="PhPlus" :disabled="!newBlock.label.trim()">{{ t('stundenplan.addBlock') }}</BaseButton></div>
        </form>

        <p v-if="blocks.length === 0" class="mt-5 text-sm text-ink-muted">{{ t('stundenplan.noBlocksYet') }}</p>
        <ul v-else class="mt-5 divide-y divide-line border-t border-line">
          <li v-for="block in blocks" :key="block.id" class="flex items-center gap-4 py-2.5">
            <span class="w-28 shrink-0 font-mono text-[13px] text-ink">{{ formatDays(block.days, dayLabel) }}</span>
            <span class="font-mono text-[13px] text-ink-muted">{{ block.startTime }}–{{ block.endTime }}</span>
            <span class="min-w-0 flex-1 truncate text-sm">{{ block.label }}</span>
            <BaseButton variant="ghost" size="sm" icon-only :icon="PhTrash" :label="t('stundenplan.removeBlock', { label: block.label })" @click="handleRemoveBlock(block)" />
          </li>
        </ul>
      </BaseCard>
    </section>

    <!-- Planner rules -->
    <section class="mt-12" aria-labelledby="h-rules">
      <h2 id="h-rules" class="font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('stundenplan.rules') }}</h2>
      <p class="mb-3 mt-1 text-sm text-ink-muted">{{ t('stundenplan.rulesHint') }}</p>
      <BaseCard padding="none">
        <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div class="min-w-0 flex-1 basis-64">
            <p class="text-sm font-medium">{{ t('stundenplan.buffer') }}</p>
            <p class="text-[13px] text-ink-muted">{{ t('stundenplan.bufferHint') }}</p>
          </div>
          <span class="flex items-center gap-2">
            <SegmentedControl v-model="settings.bufferDays" mono :label="t('stundenplan.buffer')" :options="bufferOptions" />
            <span class="text-[13px] text-ink-muted" aria-hidden="true">{{ t('stundenplan.bufferUnit') }}</span>
          </span>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
          <div class="min-w-0 flex-1 basis-64">
            <p class="text-sm font-medium">{{ t('stundenplan.workDays') }}</p>
            <p class="text-[13px] text-ink-muted">{{ t('stundenplan.workDaysHint') }}</p>
          </div>
          <DayPicker v-model="workDays" label-hidden :label="t('stundenplan.workDays')" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
          <div class="min-w-0 flex-1 basis-64">
            <p class="text-sm font-medium">{{ t('stundenplan.maxPerDay') }}</p>
            <p class="text-[13px] text-ink-muted">{{ t('stundenplan.maxPerDayHint') }}</p>
          </div>
          <SegmentedControl v-model="settings.maxPerDayHours" mono :label="t('stundenplan.maxPerDay')" :options="maxHoursOptions" />
        </div>
      </BaseCard>
    </section>

    <!-- Plan -->
    <section class="mt-12" aria-labelledby="h-plan">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="h-plan" class="font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('stundenplan.weeklyPlan') }}</h2>
        <div class="flex flex-wrap gap-2">
          <BaseButton :icon="PhDownloadSimple" :disabled="!plan || plan.sessions.length === 0" @click="handleExportPlan">{{ t('stundenplan.exportIcs') }}</BaseButton>
          <BaseButton variant="primary" :icon="PhCalendarPlus" :disabled="enrichedTasks.length === 0" @click="handleGeneratePlan">{{ t('stundenplan.generatePlan') }}</BaseButton>
        </div>
      </div>

      <p v-if="!plan" class="text-sm text-ink-muted">{{ t('stundenplan.clickGenerate') }}</p>

      <template v-else>
        <p class="mb-4 text-sm" role="status">
          <template v-if="summary.sessions > 0">{{ t('stundenplan.planSummary', { sessions: summary.sessions, time: time(summary.minutes), tasks: summary.tasks, date: shortDate(summary.last) }) }}</template>
          <template v-else>{{ t('stundenplan.nothingToPlan') }}</template>
        </p>
        <InlineNotice v-if="exportError" tone="error" class="mb-4">{{ exportError }}</InlineNotice>

        <InlineNotice v-if="plan.shortfalls.length > 0" tone="warning" class="mb-4">
          <p class="font-medium">{{ t('stundenplan.shortfallTitle') }}</p>
          <ul class="mt-1 space-y-0.5">
            <li v-for="item in plan.shortfalls" :key="item.taskId">{{ shortfallText(item) }}</li>
          </ul>
          <p class="mt-2 text-[13px]">{{ t('stundenplan.shortfallHint') }}</p>
        </InlineNotice>

        <p class="mb-2 text-[13px] text-ink-muted">{{ t('stundenplan.thisWeek') }}</p>
        <WeekGrid :days="plan.days" :sessions="weekSessions" :blocks="blocks" :label="t('stundenplan.thisWeek')" @open-session="openTask({ id: $event.taskId }, $event)" />
      </template>
    </section>
  </div>
</template>
