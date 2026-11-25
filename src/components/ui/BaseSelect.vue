<script setup>
/**
 * BaseSelect: a dropdown list with its label and an optional hint, styled to
 * match BaseInput.
 *
 * Used by: src/components/ColumnMappingConfirm.vue:53 (CSV import: which
 * column means what), src/views/DesignView.vue:164 (style guide).
 *
 * Props: see the block above `defineProps`, plus `v-model` for the selected
 * value. Events: `update:modelValue` (through `v-model`). Other attributes
 * from the parent land on the <select>, not on the wrapper.
 *
 * In the background: nothing. Two `computed` values build the ids that tie
 * label and hint to the select.
 *
 * Why it is built this way: a native <select> gives keyboard and screen
 * reader support for free; only the look is custom (no native arrow, own caret).
 *
 * How to read this file: props and `model`, the two ids, then the template:
 * label, select with its options, caret icon, hint.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed, useId } from 'vue'
import { PhCaretDown } from '@phosphor-icons/vue'

// Attributes (autocomplete, maxlength …) go to the control, not the wrapper.
// `inheritAttrs: false` turns off Vue's default of putting unknown attributes
// on the root <div>; the template forwards them with `v-bind="$attrs"`.
defineOptions({ inheritAttrs: false })

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - label: always required for accessibility; use hideLabel to hide it visually
 * - hideLabel: keep the label for screen readers only
 * - options: the entries, as `[{ value, label }]`
 * - placeholder: optional first entry with an empty value, e.g. "Nicht zuweisen"
 * - hint: help text under the field
 * - id: own id for the select; without it a unique one is generated
 */
const props = defineProps({
  label: { type: String, required: true },
  hideLabel: { type: Boolean, default: false },
  options: { type: Array, required: true },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  id: { type: String, default: '' },
})

// `v-model`: two-way binding. The parent passes a value and a listener, the
// child emits the new value. `defineModel` declares both: reading
// `model.value` gives the parent's value, writing it emits `update:modelValue`.
// The value may be a string, a number or null (nothing chosen).
const model = defineModel({ type: [String, Number, null], default: '' })

// `useId()`: like React's `useId`, a unique id per component instance.
const autoId = useId()
// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes.
const selectId = computed(() => props.id || `sel-${autoId}`)
const hintId = computed(() => `${selectId.value}-hint`)

// Template notes for this file:
// - `v-model="model"` on <select> keeps the chosen option and the parent's
//   value in step in both directions.
// - `v-bind="$attrs"` spreads the parent's extra attributes onto the select,
//   like `{...rest}` in React.
// - `v-for="opt in options" :key="opt.value"` is a loop like `options.map(...)`
//   in React; option values must be unique, because they are the keys.
// - The placeholder option has `value=""`, so choosing it sets the model to ''.
// - The caret has `pointer-events-none`, so clicks on it reach the select.
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="selectId" :class="['text-sm font-medium text-ink', hideLabel && 'sr-only']">{{ label }}</label>
    <div class="relative">
      <select
        :id="selectId"
        v-model="model"
        :aria-describedby="hint ? hintId : undefined"
        v-bind="$attrs"
        class="h-9 w-full appearance-none rounded-md border border-line-strong bg-surface pl-3 pr-9 text-sm text-ink transition-colors duration-150 hover:border-ink-muted"
      >
        <option v-if="placeholder" value="">{{ placeholder }}</option>
        <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <PhCaretDown class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    </div>
    <p v-if="hint" :id="hintId" class="text-[13px] text-ink-muted">{{ hint }}</p>
  </div>
</template>

