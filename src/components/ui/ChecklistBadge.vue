<script setup>
import { PhListChecks } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'

/** "2/4" next to a task title; green once every step is checked. */
defineProps({
  /** { done, total, complete } from checklistProgress, or null (renders nothing) */
  progress: { type: Object, default: null },
})
const { t } = useLocale()
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
