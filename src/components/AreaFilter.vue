<script setup>
import { computed } from 'vue'
import { useLocale } from '../composables/useLocale.js'
import { useAreaFilter } from '../composables/useAreaFilter.js'
import { AREA_FILTERS, countByArea } from '../utils/areas.js'
import { AREA_META } from './ui/areaMeta.js'
import SegmentedControl from './ui/SegmentedControl.vue'

/** "Alle · Studium · Freelance · Privat" with open-task counts. */
const props = defineProps({
  /** Tasks the counts are based on (usually the open ones) */
  tasks: { type: Array, required: true },
})
const { t } = useLocale()
const { areaFilter } = useAreaFilter()

const options = computed(() => {
  const counts = countByArea(props.tasks)
  return AREA_FILTERS.map(value => ({
    value,
    icon: AREA_META[value]?.icon,
    label: `${t('areas.' + value)} ${counts[value]}`,
  }))
})
</script>

<template>
  <SegmentedControl v-model="areaFilter" size="sm" :label="t('areas.filterLabel')" :options="options" />
</template>
