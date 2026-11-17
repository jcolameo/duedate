<script setup>
/**
 * BaseInput: a single-line text field with its label, an optional hint and
 * an error message underneath.
 *
 * Used by: src/views/StundenplanView.vue:157, :159 and :160 (block form),
 * src/views/DesignView.vue:163 to :166 (style guide).
 *
 * Props: see the block above `defineProps`, plus `v-model` for the text.
 * Events: `update:modelValue` (through `v-model`). Any other attribute the
 * parent sets (autocomplete, maxlength, class ...) lands on the <input>.
 *
 * In the background: nothing. Four `computed` values build the ids that tie
 * label, hint and error to the input for screen readers.
 *
 * Why it is built this way: a label is always required, so no field in the
 * app can end up without an accessible name; `hideLabel` hides it visually.
 *
 * How to read this file: props and `model`, then the id `computed`s, then the
 * template from top to bottom: label, input, error or hint.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed, useId } from 'vue'

// Attributes (autocomplete, maxlength …) go to the control, not the wrapper.
// `inheritAttrs: false` turns off Vue's default of putting unknown attributes
// on the root <div>; the template forwards them with `v-bind="$attrs"`.
defineOptions({ inheritAttrs: false })

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - label: always required for accessibility; use hideLabel to hide it visually
 * - hideLabel: keep the label for screen readers only
 * - type: native input type ('text', 'time', 'date' ...)
 * - placeholder: grey example text inside the empty field
 * - hint: help text under the field (hidden while an error is shown)
 * - error: error text; also turns the border red and sets aria-invalid
 * - required: native required flag plus a "*" after the label
 * - id: own id for the input; without it a unique one is generated
 */
const props = defineProps({
  label: { type: String, required: true },
  hideLabel: { type: Boolean, default: false },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  id: { type: String, default: '' },
})

// `v-model`: two-way binding. The parent passes a value and a listener, the
// child emits the new value. `defineModel` declares both in one line: reading
// `model.value` gives the parent's value, writing it emits `update:modelValue`.
const model = defineModel({ type: [String, Number], default: '' })

// `useId()`: like React's `useId`, a unique id per component instance.
const autoId = useId()
// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes.
const inputId = computed(() => props.id || `in-${autoId}`)
const hintId = computed(() => `${inputId.value}-hint`)
const errorId = computed(() => `${inputId.value}-error`)
// Space-separated list of ids for aria-describedby, error first, so the
// screen reader reads the error before the hint. `|| undefined` drops the
// attribute when the list is empty.
// HINWEIS: When both `error` and `hint` are set, the hint id is still listed
// here, but the template shows only the error (v-else-if). aria-describedby
// then points to an element that does not exist.
const describedBy = computed(() =>
  [props.error && errorId.value, props.hint && hintId.value].filter(Boolean).join(' ') || undefined,
)

// Template notes for this file:
// - `v-model="model"` on the <input> passes the value down and writes every
//   keystroke back, so the parent's variable always holds the current text.
// - `v-bind="$attrs"` spreads all attributes the parent set that are not
//   props, like `{...rest}` in React. It comes after the aria bindings, so
//   a parent can override those.
// - `hideLabel && 'sr-only'`: Vue skips `false` entries in class arrays.
// - `v-if` / `v-else-if`: error wins over hint; only one line is shown.
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="inputId" :class="['text-sm font-medium text-ink', hideLabel && 'sr-only']">
      {{ label }}<span v-if="required" class="text-ink-muted" aria-hidden="true"> *</span>
    </label>
    <input
      :id="inputId"
      v-model="model"
      :type="type"
      :placeholder="placeholder"
      :required="required"
      :aria-invalid="error ? 'true' : undefined"
      :aria-describedby="describedBy"
      v-bind="$attrs"
      :class="[
        'h-9 w-full rounded-md bg-surface px-3 text-sm text-ink placeholder:text-ink-muted',
        'border transition-colors duration-150',
        error ? 'border-red-ink' : 'border-line-strong hover:border-ink-muted',
      ]"
    />
    <p v-if="error" :id="errorId" class="text-[13px] text-red-ink">{{ error }}</p>
    <p v-else-if="hint" :id="hintId" class="text-[13px] text-ink-muted">{{ hint }}</p>
  </div>
</template>

