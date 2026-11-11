<script setup>
import { useId } from 'vue'
import { WEEKDAYS, sortDays } from '../../utils/availability.js'
import { useLocale } from '../../composables/useLocale.js'

/**
 * Multi-select weekday toggles (Mo … So). A labelled group of toggle
 * buttons with aria-pressed: Tab to reach, Enter/Space to toggle.
 */
const props = defineProps({
  label: { type: String, required: true },
  error: { type: String, default: '' },
})

const model = defineModel({ type: Array, default: () => [] })
const { t } = useLocale()
const labelId = `days-${useId()}`
const errorId = `${labelId}-error`

function toggle(day) {
  const set = new Set(model.value)
  set.has(day) ? set.delete(day) : set.add(day)
  model.value = sortDays([...set])
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span :id="labelId" class="text-sm font-medium text-ink">{{ label }}</span>
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
