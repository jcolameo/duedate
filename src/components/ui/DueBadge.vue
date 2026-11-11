<script setup>
import { computed } from 'vue'
import { PhWarning } from '@phosphor-icons/vue'
import BaseTag from './BaseTag.vue'
import { useLocale } from '../../composables/useLocale.js'
import { dueLabel } from '../../utils/dueLabel.js'

/**
 * One consistent way to show "when is this due" (DESIGN.md §4):
 * overdue = red tag with icon · urgent (< 3 days) = red text · later = muted text.
 * Only what needs attention gets color; the wording carries the meaning too.
 */
const props = defineProps({
  /** _status.code from useTaskEnrichment: overdue | urgent | soon | ok | unknown */
  code: { type: String, required: true },
  /** _days from useTaskEnrichment */
  days: { type: Number, default: null },
})

const { t } = useLocale()
const text = computed(() => {
  const { key, params } = dueLabel(props.days)
  return t(key, params)
})
</script>

<template>
  <BaseTag v-if="code === 'overdue'" tone="red" :icon="PhWarning">{{ text }}</BaseTag>
  <span
    v-else
    :class="['whitespace-nowrap font-mono text-[13px]', code === 'urgent' ? 'text-red-ink' : 'text-ink-muted']"
  >{{ text }}</span>
</template>
