<script setup>
import { computed, ref, onBeforeUnmount } from 'vue'
import { PhFlag, PhLockSimple } from '@phosphor-icons/vue'
import { useLocale } from '../composables/useLocale.js'
import { DAY_START_MIN, DAY_END_MIN } from '../utils/scheduler.js'
import { expandBlocksByDay } from '../utils/availability.js'
import { deadlineClass, sessionClass } from './ui/areaMeta.js'
import { normalizeArea } from '../utils/areas.js'

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
  /** Sessions can be dragged to another day or time (emits move-session) */
  editable: { type: Boolean, default: true },
})

const emit = defineEmits(['open-task', 'open-session', 'move-session'])
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

// --- Drag a session to another day or time (15-minute steps) ---
const gridEl = ref(null)
const drag = ref(null) // { session, grab, x0, y0, active, target: { index, startMin } | null }
let suppressClick = false
const DRAG_THRESHOLD = 5
const LABEL_COL_REM = 3.25

function targetAt(e) {
  const rect = gridEl.value.getBoundingClientRect()
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const labelW = LABEL_COL_REM * rem
  const colW = (rect.width - labelW) / props.days.length
  const index = Math.min(props.days.length - 1, Math.max(0, Math.floor((e.clientX - rect.left - labelW) / colW)))
  const pointerMin = DAY_START_MIN + ((e.clientY - rect.top) / rect.height) * (DAY_END_MIN - DAY_START_MIN)
  const length = drag.value.session.endMin - drag.value.session.startMin
  const raw = Math.round((pointerMin - drag.value.grab) / 15) * 15
  return { index, startMin: Math.min(DAY_END_MIN - length, Math.max(DAY_START_MIN, raw)) }
}

function onPointerDown(e, s) {
  if (!props.editable || e.button !== 0) return
  const rect = gridEl.value.getBoundingClientRect()
  const pointerMin = DAY_START_MIN + ((e.clientY - rect.top) / rect.height) * (DAY_END_MIN - DAY_START_MIN)
  drag.value = { session: s, grab: pointerMin - s.startMin, x0: e.clientX, y0: e.clientY, active: false, target: null }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e) {
  const d = drag.value
  if (!d) return
  if (!d.active && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < DRAG_THRESHOLD) return
  d.active = true
  d.target = targetAt(e)
}

function endDrag(commit) {
  const d = drag.value
  drag.value = null
  if (!d?.active) return
  suppressClick = true
  setTimeout(() => { suppressClick = false }, 0)
  if (commit && d.target) emit('move-session', { session: d.session, date: props.days[d.target.index].date, startMin: d.target.startMin })
}

function onPointerUp() { endDrag(true) }
function onKeydown(e) { if (e.key === 'Escape' && drag.value) endDrag(false) }
if (typeof window !== 'undefined') window.addEventListener('keydown', onKeydown)
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))

function onSessionClick(s) {
  if (suppressClick) return
  emit('open-session', s)
}

const ghostStyle = computed(() => {
  const d = drag.value
  if (!d?.active || !d.target) return null
  const length = d.session.endMin - d.session.startMin
  const span = DAY_END_MIN - DAY_START_MIN
  const n = props.days.length
  return {
    top: `${((d.target.startMin - DAY_START_MIN) / span) * 100}%`,
    height: `${(length / span) * 100}%`,
    left: `calc(${LABEL_COL_REM}rem + (100% - ${LABEL_COL_REM}rem) * ${d.target.index} / ${n} + 2px)`,
    width: `calc((100% - ${LABEL_COL_REM}rem) / ${n} - 4px)`,
  }
})
const ghostTime = computed(() => {
  const d = drag.value
  if (!d?.active || !d.target) return ''
  const fmt = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`
  return `${fmt(d.target.startMin)}–${fmt(d.target.startMin + d.session.endMin - d.session.startMin)}`
})
const isDragging = (s) => drag.value?.active && drag.value.session === s

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
          <button
            v-for="task in deadlinesByDay[day.label]"
            :key="task._id"
            type="button"
            :class="['flex w-full items-center gap-1 truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition-[filter] duration-150 hover:brightness-95', deadlineClass(task)]"
            :title="task._title"
            :aria-label="`${t('calendar.legendDeadline')}: ${task._title || t('common.untitled')}, ${t('areas.' + normalizeArea(task._area))}`"
            aria-haspopup="dialog"
            @click="emit('open-task', task)"
          >
            <PhFlag class="size-3 shrink-0" aria-hidden="true" /><span class="truncate">{{ task._title || t('common.untitled') }}</span>
          </button>
        </div>
      </div>

      <!-- Hourly grid -->
      <div
        ref="gridEl"
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

        <button
          v-for="(s, i) in visibleSessions"
          :key="'ses-' + i"
          type="button"
          :class="[
            'mx-0.5 my-px overflow-hidden rounded border-l-2 px-1 text-left text-[10.5px] font-medium leading-tight transition-[filter] duration-150 hover:brightness-110 focus-visible:outline-offset-[-2px] light:hover:brightness-95',
            editable ? 'cursor-grab select-none' : 'cursor-pointer',
            isDragging(s) && 'opacity-40',
            sessionClass(s),
          ]"
          :style="place(s.day, s.startMin, s.endMin)"
          :title="`${s.title} (${s.startTime}–${s.endTime})${editable ? ' · ' + t('planEdit.dragHint') : ''}`"
          :aria-label="`${t('calendar.legendSession')}: ${s.title}${s.of > 1 ? ` (${s.n}/${s.of})` : ''}, ${s.startTime}–${s.endTime}, ${t('areas.' + normalizeArea(s.area))}${s.pinned ? ', ' + t('planEdit.pinned') : ''}`"
          aria-haspopup="dialog"
          @click="onSessionClick(s)"
          @pointerdown="onPointerDown($event, s)"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="endDrag(false)"
        >
          <PhLockSimple v-if="s.pinned" class="mr-0.5 inline size-2.5 align-[-1px]" aria-hidden="true" /><span class="font-mono text-[10px]">{{ s.startTime }}</span> {{ s.title }}
        </button>

        <!-- Drop target while dragging -->
        <div
          v-if="ghostStyle"
          class="pointer-events-none absolute z-10 rounded border-2 border-dashed border-accent bg-accent/15 px-1 text-[10.5px] font-medium text-ink"
          :style="ghostStyle"
          aria-hidden="true"
        ><span class="font-mono">{{ ghostTime }}</span></div>
      </div>
    </div>
  </div>
</template>
