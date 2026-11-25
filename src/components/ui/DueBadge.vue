<script setup>
/**
 * DueBadge: shows "when is this due" in one consistent way, e.g. "in 3 days"
 * or a red "2 days overdue" tag (DESIGN.md §4).
 *
 * Used by: src/views/HomeView.vue:12, src/views/DeadlinesView.vue:14,
 * src/views/CalendarView.vue:26, src/views/StundenplanView.vue:25,
 * src/components/TaskDetail.vue:18.
 *
 * Props: `code` (status from useTaskEnrichment) and `days` (days until due).
 * Events: none.
 *
 * In the background: nothing. The wording comes from `dueLabel` in
 * src/utils/dueLabel.js, which returns a locale key plus parameters.
 *
 * Why it is built this way: only what needs attention gets color.
 * Overdue = red tag with icon, urgent (< 3 days) = red text, later = muted
 * text. The wording carries the meaning too, so color is never the only signal.
 *
 * How to read this file: props, then `text`, then the template with its two
 * branches (tag for overdue, plain text for everything else).
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed } from 'vue'
import { PhWarning } from '@phosphor-icons/vue'
import BaseTag from './BaseTag.vue'
import { useLocale } from '../../composables/useLocale.js'
import { dueLabel } from '../../utils/dueLabel.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - code: `_status.code` from useTaskEnrichment: overdue | urgent | soon | ok | unknown
 * - days: `_days` from useTaskEnrichment, days until due (negative = overdue,
 *   null = no due date)
 */
const props = defineProps({
  code: { type: String, required: true },
  days: { type: Number, default: null },
})

const { t } = useLocale()
// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes. Here it also updates when the language
// changes, because `t` reads the current locale.
const text = computed(() => {
  const { key, params } = dueLabel(props.days)
  return t(key, params)
})

// Template notes: `v-if` / `v-else` are `if` / `else` for elements. Only the
// code 'overdue' gets the red tag; 'urgent' gets red text; 'soon', 'ok' and
// 'unknown' all look the same (muted).
</script>

<template>
  <BaseTag v-if="code === 'overdue'" tone="red" :icon="PhWarning">{{ text }}</BaseTag>
  <span
    v-else
    :class="['whitespace-nowrap font-mono text-[13px]', code === 'urgent' ? 'text-red-ink' : 'text-ink-muted']"
  >{{ text }}</span>
</template>
