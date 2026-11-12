<script setup>
import { computed, ref, watch } from 'vue'
import { PhCalendarPlus, PhDownloadSimple, PhCaretLeft, PhCaretRight, PhFlag } from '@phosphor-icons/vue'
import { useAvailability } from '../composables/useAvailability.js'
import { usePlanState } from '../composables/usePlanState.js'
import { useCombinedExport } from '../composables/useCombinedExport.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { useTaskDetail } from '../composables/useTaskDetail.js'
import { expandBlocksByDay } from '../utils/availability.js'
import { getWeekDays, WORK_DAYS } from '../utils/scheduler.js'
import { isoWeek } from '../utils/dueLabel.js'
import { formatMinutes } from '../utils/estimate.js'
import { toISODate } from '../utils/taskModel.js'
import { CALENDAR_VIEWS, buildDayMap, rangeLabel, shiftAnchor, startOfDay, isSameDay } from '../utils/calendar.js'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import InlineNotice from '../components/ui/InlineNotice.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import DueBadge from '../components/ui/DueBadge.vue'
import WeekGrid from '../components/WeekGrid.vue'
import MonthGrid from '../components/calendar/MonthGrid.vue'
import YearGrid from '../components/calendar/YearGrid.vue'

/**
 * Calendar (B9/B10, formerly "Meine Woche"): the same data as Day, Week,
 * Month or Year. The chosen view is remembered; the shown date (anchor) always
 * starts at today. Planned sessions appear once a plan exists.
 */
const { blocks } = useAvailability()
const { plan, generate: handleGeneratePlan, enrichedTasks } = usePlanState()
const { exportMessage, exportError, exportWeekToICS } = useCombinedExport()
const { openTask } = useTaskDetail()
const { t, locale } = useLocale()
const toast = useToast()

watch(exportMessage, (msg) => { if (msg) toast.show(msg, { tone: 'success' }) })

const VIEW_KEY = 'duedate.calendarView.v1'
function loadView() {
  try {
    const saved = localStorage.getItem(VIEW_KEY)
    return CALENDAR_VIEWS.includes(saved) ? saved : 'week'
  } catch {
    return 'week'
  }
}
const view = ref(loadView())
watch(view, (value) => {
  try {
    localStorage.setItem(VIEW_KEY, value)
  } catch (e) {
    console.warn('[Calendar] LocalStorage write failed:', e)
  }
})

const today = startOfDay(new Date())
const anchor = ref(today)
const loc = computed(() => (locale.value === 'de' ? 'de-CH' : 'en-GB'))
const decimal = computed(() => (locale.value === 'de' ? ',' : '.'))

const viewOptions = computed(() => CALENDAR_VIEWS.map(v => ({ value: v, label: t('calendar.view_' + v) })))
const label = computed(() => rangeLabel(view.value, anchor.value, loc.value))
const eyebrow = computed(() =>
  view.value === 'day' || view.value === 'week'
    ? `${t('common.week', { week: isoWeek(anchor.value) })} · ${anchor.value.getFullYear()}`
    : String(anchor.value.getFullYear()),
)

const prev = () => { anchor.value = shiftAnchor(view.value, anchor.value, -1) }
const next = () => { anchor.value = shiftAnchor(view.value, anchor.value, 1) }
const goToday = () => { anchor.value = today }
function openDay(date) { anchor.value = startOfDay(date); view.value = 'day' }
function openMonth(date) { anchor.value = startOfDay(date); view.value = 'month' }

// --- Data for all views ------------------------------------------------------
const dayMap = computed(() => buildDayMap(enrichedTasks.value, plan.value?.sessions || []))
const dayInfo = (date) => dayMap.value.get(toISODate(date)) || { deadlines: [], sessions: [], minutes: 0 }

const weekDays = computed(() => getWeekDays(anchor.value))
const weekSessions = computed(() => weekDays.value.flatMap(d => dayInfo(d.date).sessions))
const weekDeadlines = computed(() => Object.fromEntries(weekDays.value.map(d => [d.label, dayInfo(d.date).deadlines])))

const dayLabel = computed(() => WORK_DAYS[(anchor.value.getDay() + 6) % 7])
const oneDay = computed(() => [{ label: dayLabel.value, date: anchor.value }])
const dayDetail = computed(() => dayInfo(anchor.value))
const dayBusy = computed(() => expandBlocksByDay(blocks.value).filter(b => b.day === dayLabel.value))

const nothingShown = computed(() => {
  if (!plan.value) return false
  if (view.value === 'week') return weekSessions.value.length === 0
  if (view.value === 'day') return dayDetail.value.sessions.length === 0
  return false
})

function handleExport() {
  exportWeekToICS(enrichedTasks.value, plan.value?.sessions || [])
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-10 sm:px-10">
    <PageHeader :eyebrow="eyebrow" :title="t('calendar.title')" accent="." :description="t('calendar.subtitle')">
      <template #actions>
        <BaseButton :icon="PhDownloadSimple" @click="handleExport">{{ t('calendar.exportPlan') }}</BaseButton>
        <BaseButton variant="primary" :icon="PhCalendarPlus" @click="handleGeneratePlan">{{ t('calendar.generatePlan') }}</BaseButton>
      </template>
    </PageHeader>

    <!-- Navigation and view -->
    <div class="mt-10 mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
        <div class="flex items-center gap-1" role="group" :aria-label="t('calendar.browse')">
          <BaseButton variant="ghost" size="sm" icon-only :icon="PhCaretLeft" :label="t('calendar.prev_' + view)" @click="prev" />
          <BaseButton variant="ghost" size="sm" :disabled="isSameDay(anchor, today)" @click="goToday">{{ t('calendar.today') }}</BaseButton>
          <BaseButton variant="ghost" size="sm" icon-only :icon="PhCaretRight" :label="t('calendar.next_' + view)" @click="next" />
        </div>
        <h2 class="font-display text-[22px] font-bold tracking-[-0.01em]" aria-live="polite">{{ label }}</h2>
      </div>
      <SegmentedControl v-model="view" :label="t('calendar.view')" :options="viewOptions" />
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-ink-muted">
      <span class="flex items-center gap-2"><span class="size-3 rounded-sm bg-red-soft ring-1 ring-red-ink/40"></span>{{ t('calendar.legendDeadline') }}</span>
      <span class="flex items-center gap-2"><span class="size-3 rounded-sm border-l-2 border-blue-ink bg-blue-soft"></span>{{ t('calendar.legendSession') }}</span>
      <span v-if="view === 'week' || view === 'day'" class="flex items-center gap-2"><span class="size-3 rounded-sm border border-dashed border-line-strong bg-surface-muted"></span>{{ t('calendar.legendAvailability') }}</span>
      <span v-if="!plan" class="basis-full text-ink-muted sm:basis-auto sm:before:mr-5 sm:before:content-['·']">{{ t('calendar.noPlanYet') }}</span>
      <span v-else-if="nothingShown" class="basis-full text-ink-muted sm:basis-auto sm:before:mr-5 sm:before:content-['·']">{{ t('calendar.nothingPlanned') }}</span>
    </div>

    <InlineNotice v-if="exportError" tone="error" class="mb-4">{{ exportError }}</InlineNotice>

    <WeekGrid
      v-if="view === 'week'"
      :days="weekDays"
      :sessions="weekSessions"
      :blocks="blocks"
      :deadlines-by-day="weekDeadlines"
      :label="t('calendar.weekGrid')"
    />

    <!-- Day: time grid + list of the day -->
    <div v-else-if="view === 'day'" class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <WeekGrid
        :days="oneDay"
        :sessions="dayDetail.sessions"
        :blocks="blocks"
        :deadlines-by-day="{ [dayLabel]: dayDetail.deadlines }"
        :label="t('calendar.dayGrid')"
      />
      <aside class="space-y-6" :aria-label="t('calendar.dayList')">
        <section>
          <h3 class="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('calendar.legendDeadline') }}</h3>
          <ul v-if="dayDetail.deadlines.length" class="divide-y divide-line rounded-lg border border-line">
            <li v-for="task in dayDetail.deadlines" :key="task._id" class="flex items-center gap-2 px-3 py-2">
              <PhFlag class="size-4 shrink-0 text-red-ink" aria-hidden="true" />
              <button type="button" class="min-w-0 flex-1 truncate rounded-sm text-left text-sm font-medium hover:underline hover:underline-offset-4" aria-haspopup="dialog" @click="openTask(task)">{{ task._title || t('common.untitled') }}</button>
              <DueBadge :code="task._status.code" :days="task._days" />
            </li>
          </ul>
          <p v-else class="text-sm text-ink-muted">{{ t('calendar.nothingEntered') }}</p>
        </section>
        <section>
          <h3 class="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('calendar.legendSession') }}</h3>
          <ul v-if="dayDetail.sessions.length" class="divide-y divide-line rounded-lg border border-line">
            <li v-for="s in dayDetail.sessions" :key="s.taskId + s.startMin" class="flex items-baseline gap-3 px-3 py-2 text-sm">
              <span class="font-mono text-[13px] text-ink-muted">{{ s.startTime }}–{{ s.endTime }}</span>
              <span class="min-w-0 flex-1 truncate">{{ s.title }}<span v-if="s.of > 1" class="font-mono text-[12px] text-ink-muted"> ({{ s.n }}/{{ s.of }})</span></span>
            </li>
          </ul>
          <p v-else class="text-sm text-ink-muted">{{ plan ? t('calendar.nothingEntered') : t('calendar.noPlanYet') }}</p>
          <p v-if="dayDetail.minutes" class="mt-2 font-mono text-[12px] text-ink-muted">{{ formatMinutes(dayDetail.minutes, decimal) }}</p>
        </section>
        <section v-if="dayBusy.length">
          <h3 class="mb-2 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('calendar.legendAvailability') }}</h3>
          <ul class="divide-y divide-line rounded-lg border border-line">
            <li v-for="(b, i) in dayBusy" :key="i" class="flex items-baseline gap-3 px-3 py-2 text-sm">
              <span class="font-mono text-[13px] text-ink-muted">{{ b.startTime }}–{{ b.endTime }}</span>
              <span class="min-w-0 flex-1 truncate">{{ b.label }}</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>

    <MonthGrid v-else-if="view === 'month'" :anchor="anchor" :day-map="dayMap" :today="today" @select="openDay" @move="anchor = $event" />

    <YearGrid v-else :anchor="anchor" :day-map="dayMap" :today="today" @select="openDay" @select-month="openMonth" @move="anchor = $event" />
  </div>
</template>
