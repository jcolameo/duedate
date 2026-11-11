<script setup>
import { computed, useId } from 'vue'

// Attributes (autocomplete, maxlength …) go to the control, not the wrapper
defineOptions({ inheritAttrs: false })

const props = defineProps({
  /** Always required for accessibility; use hideLabel to hide it visually */
  label: { type: String, required: true },
  hideLabel: { type: Boolean, default: false },
  type: { type: String, default: 'text' },
  placeholder: { type: String, default: '' },
  hint: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  id: { type: String, default: '' },
})

const model = defineModel({ type: [String, Number], default: '' })

const autoId = useId()
const inputId = computed(() => props.id || `in-${autoId}`)
const hintId = computed(() => `${inputId.value}-hint`)
const errorId = computed(() => `${inputId.value}-error`)
const describedBy = computed(() =>
  [props.error && errorId.value, props.hint && hintId.value].filter(Boolean).join(' ') || undefined,
)
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

