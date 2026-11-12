<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { PhFlag } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { toISODate } from '../../utils/taskModel.js'
import { monthGrid, moveByKey, isSameDay, startOfWeek, addDays } from '../../utils/calendar.js'
import { isoWeek } from '../../utils/dueLabel.js'
import { formatMinutes } from '../../utils/estimate.js'
import { deadlineClass, sessionClass } from '../ui/areaMeta.js'

/**
 * Month view: 6 weeks × 7 days with the week number. Each day shows its
 * deadlines (max 2, then "+n") and the planned work time. Clicking a day
 * opens it; arrow keys move between days (roving tabindex: one tab stop).
 */
const props = defineProps({
  /** Selected day; its month is shown */
  anchor: { type: Date, required: true },
  /** Map from buildDayMap() */
  dayMap: { type: Map, required: true },
  today: { type: Date, required: true },
})
const emit = defineEmits(['select', 'move'])
const { t, locale } = useLocale()

const loc = computed(() => (locale.value === 'de' ? 'de-CH' : 'en-GB'))
const weeks = computed(() => monthGrid(props.anchor))
const weekdays = computed(() => {
  const monday = startOfWeek(props.anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i).toLocaleDateString(loc.value, { weekday: 'short' }))
})
const decimal = computed(() => (locale.value === 'de' ? ',' : '.'))
const MAX_DEADLINES = 2

const info = (date) => props.dayMap.get(toISODate(date)) || { deadlines: [], sessions: [], minutes: 0 }

function ariaLabel(date) {
  const parts = [date.toLocaleDateString(loc.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })]
  const day = info(date)
  if (day.deadlines.length) parts.push(t('calendar.ariaDeadlines', { count: day.deadlines.length }))
  if (day.minutes) parts.push(t('calendar.ariaPlanned', { time: formatMinutes(day.minutes, decimal.value) }))
  return parts.join(', ')
}

// Keyboard: arrows etc. move the selected day; focus follows after the re-render
const root = ref(null)
let keyboardMoved = false
function onKeydown(e) {
  const next = moveByKey(props.anchor, e.key)
  if (!next) return
  e.preventDefault()
  keyboardMoved = true
  emit('move', next)
}
watch(() => props.anchor, async () => {
  if (!keyboardMoved) return
  keyboardMoved = false
  await nextTick()
  root.value?.querySelector(`[data-date="${toISODate(props.anchor)}"]`)?.focus()
})
</script>

<template>
  <div ref="root" class="overflow-x-auto" role="region" :aria-label="t('calendar.monthGrid')">
    <div class="min-w-[44rem]" @keydown="onKeydown">
      <div class="grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))] pb-2 text-center text-[12px] text-ink-muted" aria-hidden="true">
        <span class="font-mono text-[10px] uppercase">{{ t('calendar.weekShort') }}</span>
        <span v-for="name in weekdays" :key="name">{{ name }}</span>
      </div>

      <div class="overflow-hidden rounded-xl border border-line bg-surface">
        <div
          v-for="(week, w) in weeks"
          :key="toISODate(week[0].date)"
          :class="['grid grid-cols-[2.25rem_repeat(7,minmax(0,1fr))]', w > 0 && 'border-t border-line']"
        >
          <span class="flex items-start justify-center pt-2 font-mono text-[10px] text-ink-muted" aria-hidden="true">{{ isoWeek(week[0].date) }}</span>
          <button
            v-for="cell in week"
            :key="toISODate(cell.date)"
            type="button"
            :data-date="toISODate(cell.date)"
            :tabindex="isSameDay(cell.date, anchor) ? 0 : -1"
            :aria-label="ariaLabel(cell.date)"
            :aria-current="isSameDay(cell.date, today) ? 'date' : undefined"
            :class="[
              'flex min-h-[5.5rem] min-w-0 flex-col gap-1 border-l border-line p-1.5 text-left transition-colors duration-150 hover:bg-surface-muted/60',
              isSameDay(cell.date, anchor) && 'bg-surface-muted/60',
            ]"
            @click="emit('select', cell.date)"
          >
            <span
              :class="[
                'flex size-6 items-center justify-center rounded-md font-mono text-[12px]',
                isSameDay(cell.date, today) ? 'bg-accent text-on-accent' : cell.inMonth ? 'text-ink' : 'text-ink-muted',
              ]"
              aria-hidden="true"
            >{{ cell.date.getDate() }}</span>

            <span v-for="task in info(cell.date).deadlines.slice(0, MAX_DEADLINES)" :key="task._id" :class="['flex items-center gap-1 truncate rounded px-1 text-[11px] font-medium', deadlineClass(task)]" aria-hidden="true">
              <PhFlag class="size-3 shrink-0" /><span class="truncate">{{ task._title || t('common.untitled') }}</span>
            </span>
            <span v-if="info(cell.date).deadlines.length > MAX_DEADLINES" class="px-1 font-mono text-[11px] text-ink-muted" aria-hidden="true">+{{ info(cell.date).deadlines.length - MAX_DEADLINES }}</span>
            <span v-for="(minutes, area) in info(cell.date).areaMinutes" :key="area" :class="['truncate rounded border-l-2 px-1 font-mono text-[11px]', sessionClass({ area })]" aria-hidden="true">{{ formatMinutes(minutes, decimal) }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
