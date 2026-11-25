<script setup>
/**
 * EffortInput: asks "how long will this task take in total?" with quick
 * buttons (– / 2 / 4 / 8 / 16 h) plus a small free field for other values.
 *
 * Used by: src/components/TaskDetail.vue:286 (task panel),
 * src/views/StundenplanView.vue:139 (tasks without an estimate).
 *
 * Props: `label` and `size`, plus `v-model` with the effort in minutes
 * (30-minute steps) or null for "no estimate". Events: `update:modelValue`.
 *
 * In the background: a `watch` copies outside changes of the value into the
 * free field. The field keeps its own text in `text`, so the user can type
 * "2,5" without the value jumping around on every keystroke.
 *
 * Why it is built this way: presets cover the usual cases in one click
 * (roadmap step B8), the field covers the rest ("6", "2,5", "90 min").
 *
 * How to read this file: `model`, `text` and the `watch` first, then
 * `presets` and `selected` (the buttons), then `commit` (the free field).
 * Parsing and rounding live in src/utils/estimate.js.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { ref, computed, watch, useId } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { ESTIMATE_PRESETS_H, parseEstimate, estimateToInput } from '../../utils/estimate.js'
import SegmentedControl from './SegmentedControl.vue'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - label: accessible name of the preset button group
 * - size: 'md' (default) or 'sm', for both the buttons and the field
 */
const props = defineProps({
  label: { type: String, required: true },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
})
// `v-model`: two-way binding. The parent passes a value and a listener, the
// child emits the new value. Here the value is minutes or null.
const model = defineModel({ type: [Number, null], default: null })
const { t, locale } = useLocale()

// `useId()`: like React's `useId`, a unique id per instance for label and error.
const id = useId()
// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes. German writes "2,5", English "2.5".
const decimal = computed(() => (locale.value === 'de' ? ',' : '.'))
// `ref`: a reactive variable, like one field in a React class component's
// `state`; read and write it through `.value`.
// HINWEIS: `text` is formatted with the decimal sign of the moment. Switching
// the language later does not reformat it until the value itself changes, so
// an English screen can still show "2,5".
const text = ref(estimateToInput(model.value, decimal.value))
const error = ref(false)

// Keep the field in sync when the value changes from outside (preset, undo, another view)
// `watch`: like `useEffect` with a dependency list, but it names the value it
// listens to. It also clears a leftover error, because the new value is valid.
watch(model, (value) => { text.value = estimateToInput(value, decimal.value); error.value = false })

// The buttons: "–" (null = no estimate) and then 2 / 4 / 8 / 16 hours,
// stored as minutes.
const presets = computed(() => [
  { value: null, label: t('common.dash') },
  ...ESTIMATE_PRESETS_H.map(h => ({ value: h * 60, label: `${h} h` })),
])
// A custom value (e.g. 6 h) lights no preset, and not the "none" option either
// -1 is a value no button has, so SegmentedControl highlights nothing.
const selected = computed(() => (model.value === null || presets.value.some(p => p.value === model.value) ? model.value : -1))

/**
 * Reads the free field and stores its value, or marks the field as wrong.
 * Runs when the field loses focus after a change, and on Enter.
 *
 * @returns {void}
 * @sideeffect may emit `update:modelValue`, sets `error`, rewrites `text`
 */
function commit() {
  const result = parseEstimate(text.value)
  // Text that is not a duration ("abc", "2 Tage"): keep what the user typed,
  // so they can fix it, and only show the error.
  if (result.error) { error.value = true; return }
  error.value = false
  // Only emit when the value really changed, so the parent does not record an
  // edit (and an undo step) for the same value.
  if (result.value !== model.value) model.value = result.value
  text.value = estimateToInput(result.value, decimal.value) // shows the rounded value
}

// Template notes for this file:
// - SegmentedControl is wired by hand instead of with `v-model`:
//   `:model-value="selected"` passes the highlighted button down and
//   `@update:model-value="model = $event"` stores a clicked preset.
//   `$event` is the value the child emitted.
// - `v-model="text"` on the <input> binds only the local text, not the minutes.
// - `@keydown.enter.prevent`: `.enter` filters for the Enter key and
//   `.prevent` calls `preventDefault()`, so Enter does not submit a form.
// - `inputmode="decimal"` asks phones for a number keypad with a decimal sign.
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center gap-2">
      <SegmentedControl :model-value="selected" mono :size="size" :label="label" :options="presets" @update:model-value="model = $event" />
      <span class="flex items-center gap-1.5">
        <label :for="`est-${id}`" class="sr-only">{{ t('estimate.hours') }}</label>
        <input
          :id="`est-${id}`"
          v-model="text"
          type="text"
          inputmode="decimal"
          autocomplete="off"
          :placeholder="t('estimate.free')"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? `est-err-${id}` : undefined"
          :class="[
            'w-16 rounded-md border bg-surface px-2 text-right font-mono text-sm text-ink placeholder:text-ink-muted transition-colors duration-150',
            size === 'sm' ? 'h-7 text-[13px]' : 'h-8',
            error ? 'border-red-ink' : 'border-line-strong hover:border-ink-muted',
          ]"
          @change="commit"
          @keydown.enter.prevent="commit"
        />
        <span class="font-mono text-[13px] text-ink-muted" aria-hidden="true">h</span>
      </span>
    </div>
    <p v-if="error" :id="`est-err-${id}`" class="mt-1 text-[13px] text-red-ink">{{ t('estimate.error') }}</p>
  </div>
</template>
