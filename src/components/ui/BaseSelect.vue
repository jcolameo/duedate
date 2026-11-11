<script setup>
import { computed, useId } from 'vue'
import { PhCaretDown } from '@phosphor-icons/vue'

// Attributes (autocomplete, maxlength …) go to the control, not the wrapper
defineOptions({ inheritAttrs: false })

const props = defineProps({
  label: { type: String, required: true },
  hideLabel: { type: Boolean, default: false },
  /** [{ value, label }] */
  options: { type: Array, required: true },
  /** Optional first entry with an empty value, e.g. "Nicht zuweisen" */
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  id: { type: String, default: '' },
})

const model = defineModel({ type: [String, Number, null], default: '' })

const autoId = useId()
const selectId = computed(() => props.id || `sel-${autoId}`)
const hintId = computed(() => `${selectId.value}-hint`)
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

