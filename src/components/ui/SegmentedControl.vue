<script setup>
/**
 * SegmentedControl: a row of joined buttons where exactly one is active,
 * e.g. theme (light/dark), language, priority, effort or calendar view.
 *
 * Used by: src/views/SettingsView.vue:8, src/views/CalendarView.vue:24,
 * src/views/StundenplanView.vue:24, src/components/TaskDetail.vue:17,
 * src/components/QuickAdd.vue:21, src/components/AreaFilter.vue:7,
 * src/components/DataSettings.vue:9, and EffortInput.vue in this folder.
 *
 * Props: `label`, `options`, `size`, `mono`, plus `v-model` with the value of
 * the active option. Events: `update:modelValue` (through `v-model`).
 *
 * In the background: nothing beyond `v-model`. No state of its own.
 *
 * Why it is built this way: a labelled group of toggle buttons with
 * aria-pressed works with Tab + Enter/Space and is announced correctly by
 * screen readers, without the arrow-key logic a radio group would need.
 *
 * How to read this file: props and `model`, then the template: one button per
 * option, active when `model === opt.value`.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - label: accessible name of the group (not shown on screen)
 * - options: the buttons, as `[{ value, label, icon? }]`; values must be
 *   unique because they are also the loop keys
 * - size: 'md' (default) or 'sm'
 * - mono: use the mono font for option labels (e.g. durations like "2h")
 */
defineProps({
  label: { type: String, required: true },
  options: { type: Array, required: true },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
  mono: { type: Boolean, default: false },
})

// `v-model`: two-way binding. The parent passes a value and a listener, the
// child emits the new value. A value that matches no option (EffortInput
// passes -1 for that) simply leaves every button inactive.
const model = defineModel({ type: [String, Number, null], default: null })

// Template notes: `v-for="opt in options" :key="opt.value"` is a loop like
// `options.map(...)` in React. `@click="model = opt.value"` assigns the
// model, which emits `update:modelValue`; in the template `model` needs no
// `.value`. Clicking the active button emits the same value again.
</script>

<template>
  <div role="group" :aria-label="label" class="inline-flex gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :aria-pressed="model === opt.value"
      :class="[
        'inline-flex items-center gap-1.5 rounded-md transition-colors duration-150',
        size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-3 text-[13px]',
        mono && 'font-mono',
        model === opt.value
          ? 'bg-surface text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
          : 'text-ink-muted hover:text-ink',
      ]"
      @click="model = opt.value"
    >
      <component :is="opt.icon" v-if="opt.icon" class="size-3.5" aria-hidden="true" />
      {{ opt.label }}
    </button>
  </div>
</template>
