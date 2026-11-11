<script setup>
import { ref, computed, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { PhTray, PhUploadSimple, PhPlus, PhTrash, PhCalendarPlus, PhDownloadSimple, PhWarning } from '@phosphor-icons/vue'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useTaskPlanning, EFFORT_OPTIONS, PRIORITY_OPTIONS } from '../composables/useTaskPlanning.js'
import { useAvailability } from '../composables/useAvailability.js'
import { formatDays, isValidTimeRange } from '../utils/availability.js'
import { usePlanExport } from '../composables/usePlanExport.js'
import { usePlanState } from '../composables/usePlanState.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
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

const { enrichedTasks } = useTaskEnrichment()
const { getPlanningFor, setEffort, setPriority } = useTaskPlanning()
const { blocks, addBlock, removeBlock, restoreBlock } = useAvailability()
const { exportMessage, exportError, exportPlanToICS } = usePlanExport()
const { plan, generate: handleGeneratePlan } = usePlanState()
const { t } = useLocale()
const toast = useToast()

watch(exportMessage, (msg) => { if (msg) toast.show(msg, { tone: 'success' }) })

const priorityOptions = computed(() =>
  PRIORITY_OPTIONS.map(p => ({ value: p, label: t('stundenplan.priority' + p[0].toUpperCase() + p.slice(1)) })),
)
const effortOptions = EFFORT_OPTIONS.map(e => ({ value: e, label: e }))

const reasonLabel = { noFreeSlot: 'stundenplan.reasonNoFreeSlot', noFreeSlotDefaultEffort: 'stundenplan.reasonNoFreeSlotDefaultEffort' }

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
            </div>
            <SegmentedControl
              size="sm"
              :label="`${t('stundenplan.priority')}: ${task._title}`"
              :options="priorityOptions"
              :model-value="getPlanningFor(task).priority"
              @update:model-value="setPriority(task._id, $event)"
            />
            <SegmentedControl
              size="sm"
              mono
              :label="`${t('stundenplan.effort')}: ${task._title}`"
              :options="effortOptions"
              :model-value="getPlanningFor(task).effort"
              @update:model-value="setEffort(task._id, $event)"
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

    <!-- Weekly plan -->
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
          {{ t('stundenplan.scheduledSummary', { scheduled: plan.sessions.length, total: plan.sessions.length + plan.unscheduled.length }) }}
          <span v-if="plan.unscheduled.length > 0" class="text-ink-muted">{{ t('stundenplan.unscheduledSummary', { count: plan.unscheduled.length }) }}</span>
        </p>
        <InlineNotice v-if="exportError" tone="error" class="mb-4">{{ exportError }}</InlineNotice>

        <WeekGrid :days="plan.days" :sessions="plan.sessions" :blocks="blocks" :label="t('stundenplan.weeklyPlan')" />

        <ul v-if="plan.unscheduled.length > 0" class="mt-4 space-y-1">
          <li v-for="u in plan.unscheduled" :key="u.taskId" class="flex items-center gap-2 text-[13px] text-ink-muted">
            <PhWarning class="size-3.5 shrink-0 text-yellow-ink" aria-hidden="true" />
            <span class="text-ink">{{ u.title }}</span> · {{ t(reasonLabel[u.reason]) }}
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>
