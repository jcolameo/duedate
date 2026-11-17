<script setup>
/**
 * DayPicker: a row of seven weekday buttons (Mo … So) where you switch
 * several days on or off, e.g. "this block repeats on Mon and Wed".
 *
 * Used by: src/views/StundenplanView.vue:158 (days of a new timetable block)
 * and :203 (work days, label hidden).
 *
 * Props: `label`, `error`, `labelHidden`, plus `v-model` with the chosen
 * days as an array like `['Mon', 'Wed']`. Events: `update:modelValue`.
 *
 * In the background: nothing beyond `v-model`. No watch, no timers.
 *
 * Why it is built this way: a labelled group of toggle buttons with
 * aria-pressed is reachable with Tab and switched with Enter or Space, and
 * screen readers announce "pressed" / "not pressed" for each day.
 *
 * How to read this file: props and `model`, then `toggle`, then the template.
 * Day keys and their order come from WEEKDAYS in src/utils/availability.js.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { useId } from 'vue'
import { WEEKDAYS, sortDays } from '../../utils/availability.js'
import { useLocale } from '../../composables/useLocale.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - label: name of the group, read by screen readers and shown above it
 * - error: error text under the buttons (e.g. "pick at least one day")
 * - labelHidden: keep the label for screen readers only (when a heading
 *   already names the field)
 */
const props = defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
  labelHidden: { type: Boolean, default: false },
})

// `v-model`: two-way binding. The parent passes a value and a listener, the
// child emits the new value. Reading `model.value` gives the parent's array,
// assigning a new array emits `update:modelValue`.
// The default is a function so each instance gets its own empty array.
const model = defineModel({ type: Array, default: () => [] })
const { t } = useLocale()
// `useId()`: like React's `useId`, a unique id per component instance, used
// to link the group to its label and error text.
const labelId = `days-${useId()}`
const errorId = `${labelId}-error`

/**
 * Switches one weekday on or off.
 *
 * @param {string} day weekday key, e.g. 'Mon'
 * @returns {void}
 * @sideeffect emits `update:modelValue` with a new, sorted array
 */
function toggle(day) {
  // Work on a copy: the array belongs to the parent and must not be changed
  // in place, only replaced.
  const set = new Set(model.value)
  set.has(day) ? set.delete(day) : set.add(day)
  // Back to Monday-to-Sunday order, so ['Wed', 'Mon'] is stored as ['Mon', 'Wed'].
  model.value = sortDays([...set])
}

// Template notes: `v-for="day in WEEKDAYS"` draws one button per day, like
// `WEEKDAYS.map(...)` in React. Each button shows the short name and
// carries the long name as aria-label, so a screen reader says "Monday"
// instead of "Mo".
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span :id="labelId" :class="labelHidden ? 'sr-only' : 'text-sm font-medium text-ink'">{{ label }}</span>
    <div
      role="group"
      :aria-labelledby="labelId"
      :aria-describedby="props.error ? errorId : undefined"
      class="inline-flex h-9 w-fit gap-0.5 rounded-md border border-line-strong bg-surface p-0.5"
    >
      <button
        v-for="day in WEEKDAYS"
        :key="day"
        type="button"
        :aria-pressed="model.includes(day)"
        :aria-label="t('common.daysLong.' + day)"
        :class="[
          'w-8 rounded text-[13px] transition-colors duration-150',
          model.includes(day) ? 'bg-accent font-semibold text-on-accent' : 'text-ink-muted hover:bg-surface-muted hover:text-ink',
        ]"
        @click="toggle(day)"
      >{{ t('common.days.' + day) }}</button>
    </div>
    <p v-if="error" :id="errorId" class="text-[13px] text-red-ink">{{ error }}</p>
  </div>
</template>
