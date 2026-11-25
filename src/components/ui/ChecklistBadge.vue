<script setup>
/**
 * ChecklistBadge: the small "2/4" with a list icon next to a task title,
 * showing how many checklist steps are done; green once every step is checked.
 *
 * Used by: src/views/HomeView.vue:244, :290 and :348,
 * src/views/DeadlinesView.vue:211.
 *
 * Props: `progress`, the object `{ done, total, complete }` from
 * `checklistProgress` in src/utils/checklist.js, or null. Events: none.
 *
 * In the background: nothing. Pure display.
 *
 * Why it is built this way: the visible "2/4" means little to a screen
 * reader, so it is hidden from them and a full sentence is read instead.
 *
 * How to read this file: the prop, then the template. The views pass
 * `task._checklist`, which src/utils/taskModel.js:391 derives from the task text.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { PhListChecks } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - progress: `{ done, total, complete }` from checklistProgress, or null
 *   (the task has no checklist; then nothing is rendered)
 */
defineProps({
  progress: { type: Object, default: null },
})
const { t } = useLocale()

// Template notes: `v-if="progress"` on the root renders nothing at all when
// there is no checklist. The `sr-only` span is read by screen readers only;
// the `aria-hidden` span is seen on screen only.
</script>

<template>
  <span
    v-if="progress"
    :class="['inline-flex items-center gap-1 font-mono text-[12px] leading-5', progress.complete ? 'text-green-ink' : 'text-ink-muted']"
  >
    <PhListChecks class="size-3.5" aria-hidden="true" />
    <span class="sr-only">{{ t('checklist.progressLabel', { done: progress.done, total: progress.total }) }}</span>
    <span aria-hidden="true">{{ progress.done }}/{{ progress.total }}</span>
  </span>
</template>
