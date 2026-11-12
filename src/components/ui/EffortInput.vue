<script setup>
import { ref, computed, watch, useId } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { ESTIMATE_PRESETS_H, parseEstimate, estimateToInput } from '../../utils/estimate.js'
import SegmentedControl from './SegmentedControl.vue'

/**
 * Total effort of a task (B8): quick presets (2 / 4 / 8 / 16 h) plus a free
 * field in hours ("6", "2,5", "90 min"). The value is minutes in 30-minute
 * steps, or null for "no estimate". The field always shows the current value.
 */
const props = defineProps({
  label: { type: String, required: true },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
})
const model = defineModel({ type: [Number, null], default: null })
const { t, locale } = useLocale()

const id = useId()
const decimal = computed(() => (locale.value === 'de' ? ',' : '.'))
const text = ref(estimateToInput(model.value, decimal.value))
const error = ref(false)

// Keep the field in sync when the value changes from outside (preset, undo, another view)
watch(model, (value) => { text.value = estimateToInput(value, decimal.value); error.value = false })

const presets = computed(() => [
  { value: null, label: t('common.dash') },
  ...ESTIMATE_PRESETS_H.map(h => ({ value: h * 60, label: `${h} h` })),
])
// A custom value (e.g. 6 h) lights no preset, and not the "none" option either
const selected = computed(() => (model.value === null || presets.value.some(p => p.value === model.value) ? model.value : -1))

function commit() {
  const result = parseEstimate(text.value)
  if (result.error) { error.value = true; return }
  error.value = false
  if (result.value !== model.value) model.value = result.value
  text.value = estimateToInput(result.value, decimal.value) // shows the rounded value
}
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
