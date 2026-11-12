<script setup>
import { computed } from 'vue'
import { PhCaretDown, PhTag } from '@phosphor-icons/vue'
import { useTags } from '../composables/useTags.js'
import { useTagFilter } from '../composables/useTagFilter.js'
import { useLocale } from '../composables/useLocale.js'

/** Compact select "Alle Tags / #name (n)"; hidden while no tags exist. */
const props = defineProps({
  /** Tasks the counts are based on (usually the open ones) */
  tasks: { type: Array, required: true },
})
const { tags } = useTags()
const { tagFilter } = useTagFilter()
const { t } = useLocale()

const options = computed(() => {
  const counts = new Map()
  for (const task of props.tasks) for (const id of task.tags || []) counts.set(id, (counts.get(id) || 0) + 1)
  return [...tags.value]
    .sort((a, b) => a.name.localeCompare(b.name, 'de-CH'))
    .map(tag => ({ value: tag.id, label: `#${tag.name} (${counts.get(tag.id) || 0})` }))
})
</script>

<template>
  <span v-if="tags.length" class="relative inline-flex">
    <PhTag class="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
    <select
      v-model="tagFilter"
      :aria-label="t('tags.filterLabel')"
      :class="[
        'h-7 cursor-pointer appearance-none rounded-lg border bg-surface-muted pl-7 pr-7 text-[12px] transition-colors duration-150 hover:text-ink',
        tagFilter === 'all' ? 'border-line text-ink-muted' : 'border-line-strong font-medium text-ink',
      ]"
    >
      <option value="all">{{ t('tags.all') }}</option>
      <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
    </select>
    <PhCaretDown class="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
  </span>
</template>
