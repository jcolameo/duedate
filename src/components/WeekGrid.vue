<script setup>
import { computed } from 'vue'
import { PhFlag } from '@phosphor-icons/vue'
import { useLocale } from '../composables/useLocale.js'
import { DAY_START_MIN, DAY_END_MIN } from '../utils/scheduler.js'
import { expandBlocksByDay } from '../utils/availability.js'

/**
 * Time grid shared by Stundenplan and the calendar: one column per entry in
 * `days` (7 for a week, 1 for the day view). Rows are 30-minute slots
 * between DAY_START_MIN and DAY_END_MIN.
 */
const props = defineProps({
  /** [{ label: 'Mon'..'Sun', date: Date }]: getWeekDays(), or one entry for a single day */
  days: { type: Array, required: true },
  /** Planned sessions from generatePlan() */
  sessions: { type: Array, default: () => [] },
  /** Busy blocks: [{ label, days: [], startTime, endTime }] — one per day is drawn */
  blocks: { type: Array, default: () => [] },
  /** Optional { [dayLabel]: enrichedTask[] } — shows an all-day deadline row */
  deadlinesByDay: { type: Object, default: null },
  label: { type: String, required: true },
})

const { t } = useLocale()

const TOTAL_SLOTS = (DAY_END_MIN - DAY_START_MIN) / 30
const COLUMNS = computed(() => `3.25rem repeat(${props.days.length}, minmax(0, 1fr))`)
const minWidth = computed(() => (props.days.length > 1 ? 'min-w-[46rem]' : 'min-w-[22rem]'))

const hourMarks = computed(() => {
  const marks = []
  for (let m = DAY_START_MIN; m < DAY_END_MIN; m += 60) marks.push(`${String(m / 60).padStart(2, '0')}:00`)
  return marks
})

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

function place(dayLabel, startMin, endMin) {
  const col = props.days.findIndex(d => d.label === dayLabel) + 2
  const rowStart = Math.max(1, Math.round((startMin - DAY_START_MIN) / 30) + 1)
  const rowSpan = Math.max(1, Math.round((endMin - startMin) / 30))
  return { gridColumn: String(col), gridRow: `${rowStart} / span ${rowSpan}` }
}

const visibleBlocks = computed(() =>
  expandBlocksByDay(props.blocks)
    .map(b => ({ ...b, start: Math.max(DAY_START_MIN, toMinutes(b.startTime)), end: Math.min(DAY_END_MIN, toMinutes(b.endTime)) }))
    .filter(b => b.end > b.start && props.days.some(d => d.label === b.day)),
)
const visibleSessions = computed(() => props.sessions.filter(s => props.days.some(d => d.label === s.day)))

const todayKey = new Date().toDateString()
const isToday = (d) => d.date.toDateString() === todayKey
</script>

<template>
  <div class="overflow-x-auto" role="region" :aria-label="label" tabindex="0">
    <div :class="minWidth">
      <!-- Day headers -->
      <div class="grid" :style="{ gridTemplateColumns: COLUMNS }">
        <div></div>
        <div v-for="day in days" :key="day.label" class="pb-2 text-center">
          <p :class="['text-[12px]', isToday(day) ? 'font-semibold text-ink' : 'text-ink-muted']">{{ t('common.days.' + day.label) }}</p>
          <p
            :class="[
              'mx-auto mt-0.5 flex size-7 items-center justify-center rounded-md font-mono text-[13px]',
              isToday(day) ? 'bg-accent text-on-accent' : 'text-ink-muted',
            ]"
            :aria-current="isToday(day) ? 'date' : undefined"
          >{{ day.date.getDate() }}</p>
        </div>
      </div>

      <!-- All-day deadlines -->
      <div v-if="deadlinesByDay" class="grid border-t border-line py-1.5" :style="{ gridTemplateColumns: COLUMNS }">
        <div class="pr-2 pt-1 text-right font-mono text-[10px] uppercase text-ink-muted"></div>
        <div v-for="day in days" :key="'dl-' + day.label" class="space-y-1 px-0.5">
          <p
            v-for="task in deadlinesByDay[day.label]"
            :key="task._id"
            class="flex items-center gap-1 truncate rounded bg-red-soft px-1.5 py-0.5 text-[11px] font-medium text-red-ink"
            :title="task._title"
          >
            <PhFlag class="size-3 shrink-0" aria-hidden="true" /><span class="truncate">{{ task._title || t('common.untitled') }}</span>
          </p>
        </div>
      </div>

      <!-- Hourly grid -->
      <div
        class="relative grid overflow-hidden rounded-xl border border-line bg-surface"
        :style="{ gridTemplateColumns: COLUMNS, gridTemplateRows: `repeat(${TOTAL_SLOTS}, 1.4rem)` }"
      >
        <div
          v-for="(h, i) in hourMarks"
          :key="h"
          class="border-t border-line pr-2 pt-0.5 text-right font-mono text-[10px] text-ink-muted first:border-t-0"
          :style="{ gridColumn: '1', gridRow: `${i * 2 + 1} / span 2` }"
        >{{ h }}</div>

        <div
          v-for="(day, dIdx) in days"
          :key="'col-' + day.label"
          :class="['border-l border-line', isToday(day) && 'bg-surface-muted/60']"
          :style="{ gridColumn: String(dIdx + 2), gridRow: `1 / span ${TOTAL_SLOTS}` }"
        ></div>

        <div
          v-for="(b, i) in visibleBlocks"
          :key="'blk-' + i"
          class="mx-0.5 my-px overflow-hidden rounded border border-dashed border-line-strong bg-surface-muted px-1 text-[10.5px] leading-tight text-ink-muted"
          :style="place(b.day, b.start, b.end)"
          :title="`${b.label} (${b.startTime}–${b.endTime})`"
        >{{ b.label }}</div>

        <div
          v-for="(s, i) in visibleSessions"
          :key="'ses-' + i"
          class="mx-0.5 my-px overflow-hidden rounded border-l-2 border-blue-ink bg-blue-soft px-1 text-[10.5px] font-medium leading-tight text-blue-ink"
          :style="place(s.day, s.startMin, s.endMin)"
          :title="`${s.title} (${s.startTime}–${s.endTime})`"
        >
          <span class="font-mono text-[10px]">{{ s.startTime }}</span> {{ s.title }}
        </div>
      </div>
    </div>
  </div>
</template>
