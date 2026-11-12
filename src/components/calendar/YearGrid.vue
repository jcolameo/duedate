<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { toISODate } from '../../utils/taskModel.js'
import { compactMonthGrid, moveByKey, isSameDay, loadLevel, startOfWeek, addDays } from '../../utils/calendar.js'
import { formatMinutes } from '../../utils/estimate.js'

/**
 * Year view: 12 small months. Days with a deadline get a red dot, planned
 * work colors the day (light / medium / heavy). Click a day to open it, a
 * month name to open the month; arrow keys move between days.
 */
const props = defineProps({
  anchor: { type: Date, required: true },
  dayMap: { type: Map, required: true },
  today: { type: Date, required: true },
})
const emit = defineEmits(['select', 'select-month', 'move'])
const { t, locale } = useLocale()

const loc = computed(() => (locale.value === 'de' ? 'de-CH' : 'en-GB'))
const decimal = computed(() => (locale.value === 'de' ? ',' : '.'))
const year = computed(() => props.anchor.getFullYear())
const months = computed(() => Array.from({ length: 12 }, (_, m) => ({
  month: m,
  first: new Date(year.value, m, 1),
  name: new Date(year.value, m, 1).toLocaleDateString(loc.value, { month: 'long' }),
  weeks: compactMonthGrid(year.value, m),
})))
const weekdays = computed(() => {
  const monday = startOfWeek(props.anchor)
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i).toLocaleDateString(loc.value, { weekday: 'short' }))
})

const info = (date) => props.dayMap.get(toISODate(date)) || { deadlines: [], sessions: [], minutes: 0 }

const LEVEL_CLASS = [
  'text-ink',
  'bg-blue-soft text-blue-ink',
  'bg-blue-soft text-blue-ink ring-1 ring-inset ring-blue-ink/60',
  'bg-blue-ink text-surface font-semibold',
]

function ariaLabel(date) {
  const parts = [date.toLocaleDateString(loc.value, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })]
  const day = info(date)
  if (day.deadlines.length) parts.push(t('calendar.ariaDeadlines', { count: day.deadlines.length }))
  if (day.minutes) parts.push(t('calendar.ariaPlanned', { time: formatMinutes(day.minutes, decimal.value) }))
  return parts.join(', ')
}

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
  <div ref="root" role="region" :aria-label="t('calendar.yearGrid')" @keydown="onKeydown">
    <div class="grid gap-x-8 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
      <section v-for="m in months" :key="m.month" :aria-label="m.name">
        <h3 class="mb-2">
          <button
            type="button"
            class="rounded px-1 font-display text-[15px] font-bold capitalize tracking-[-0.01em] hover:underline hover:underline-offset-4"
            @click="emit('select-month', m.first)"
          >{{ m.name }}</button>
        </h3>
        <div class="grid grid-cols-7 text-center text-[11px] text-ink-muted" aria-hidden="true">
          <span v-for="(name, i) in weekdays" :key="i" class="pb-1">{{ name.replace(".", "") }}</span>
        </div>
        <div v-for="(week, w) in m.weeks" :key="w" class="grid grid-cols-7">
          <template v-for="cell in week" :key="toISODate(cell.date)">
            <span v-if="!cell.inMonth" class="h-8"></span>
            <button
              v-else
              type="button"
              :data-date="toISODate(cell.date)"
              :tabindex="isSameDay(cell.date, anchor) ? 0 : -1"
              :aria-label="ariaLabel(cell.date)"
              :aria-current="isSameDay(cell.date, today) ? 'date' : undefined"
              :class="[
                'relative m-px flex h-7 items-center justify-center rounded-md font-mono text-[12px] transition-colors duration-150 hover:bg-surface-muted',
                LEVEL_CLASS[loadLevel(info(cell.date).minutes)],
                isSameDay(cell.date, today) && 'outline outline-2 -outline-offset-2 outline-ink',
              ]"
              @click="emit('select', cell.date)"
            >
              <span aria-hidden="true">{{ cell.date.getDate() }}</span>
              <span v-if="info(cell.date).deadlines.length" class="absolute bottom-[3px] size-1 rounded-full bg-red-ink" aria-hidden="true"></span>
            </button>
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
