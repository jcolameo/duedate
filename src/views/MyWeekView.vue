<script setup>
import { computed, watch } from 'vue'
import { PhCalendarPlus, PhDownloadSimple } from '@phosphor-icons/vue'
import { useAvailability } from '../composables/useAvailability.js'
import { usePlanState } from '../composables/usePlanState.js'
import { useCombinedExport } from '../composables/useCombinedExport.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { getWeekDays } from '../utils/scheduler.js'
import { isoWeek } from '../utils/dueLabel.js'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import InlineNotice from '../components/ui/InlineNotice.vue'
import WeekGrid from '../components/WeekGrid.vue'

const { blocks } = useAvailability()
const { plan, generate: handleGeneratePlan, enrichedTasks } = usePlanState()
const { exportMessage, exportError, exportWeekToICS } = useCombinedExport()
const { t } = useLocale()
const toast = useToast()

watch(exportMessage, (msg) => { if (msg) toast.show(msg, { tone: 'success' }) })

const weekDays = computed(() => plan.value?.days || getWeekDays(new Date()))

// "KW 46 · 9.11.–15.11."
const eyebrow = computed(() => {
  const first = weekDays.value[0].date
  const last = weekDays.value[6].date
  const fmt = (d) => `${d.getDate()}.${d.getMonth() + 1}.`
  return `${t('common.week', { week: isoWeek(first) })} · ${fmt(first)}–${fmt(last)}`
})

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

const deadlinesByDay = computed(() => {
  const map = {}
  for (const day of weekDays.value) map[day.label] = []
  for (const task of enrichedTasks.value) {
    if (!task._deadlineDate || task._isDone) continue
    const day = weekDays.value.find(d => sameDay(d.date, task._deadlineDate))
    if (day) map[day.label].push(task)
  }
  return map
})

function handleExportWeek() {
  exportWeekToICS(enrichedTasks.value, plan.value?.sessions || [])
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-10 sm:px-10">
    <PageHeader :eyebrow="eyebrow" :title="t('myWeek.title')" accent="." :description="t('myWeek.subtitle')">
      <template #actions>
        <BaseButton :icon="PhDownloadSimple" @click="handleExportWeek">{{ t('myWeek.exportWeek') }}</BaseButton>
        <BaseButton variant="primary" :icon="PhCalendarPlus" @click="handleGeneratePlan">{{ t('myWeek.generatePlan') }}</BaseButton>
      </template>
    </PageHeader>

    <div class="mt-10 mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-muted">
      <span class="flex items-center gap-2"><span class="size-3 rounded-sm bg-red-soft ring-1 ring-red-ink/40"></span>{{ t('myWeek.legendDeadline') }}</span>
      <span class="flex items-center gap-2"><span class="size-3 rounded-sm border-l-2 border-blue-ink bg-blue-soft"></span>{{ t('myWeek.legendSession') }}</span>
      <span class="flex items-center gap-2"><span class="size-3 rounded-sm border border-dashed border-line-strong bg-surface-muted"></span>{{ t('myWeek.legendAvailability') }}</span>
      <span v-if="!plan" class="basis-full text-ink-muted sm:basis-auto sm:before:mr-5 sm:before:content-['·']">{{ t('myWeek.noPlanYet') }}</span>
    </div>

    <InlineNotice v-if="exportError" tone="error" class="mb-4">{{ exportError }}</InlineNotice>

    <WeekGrid
      :days="weekDays"
      :sessions="plan?.sessions || []"
      :blocks="blocks"
      :deadlines-by-day="deadlinesByDay"
      :label="t('myWeek.weekGrid')"
    />
  </div>
</template>
