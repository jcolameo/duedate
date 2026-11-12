<script setup>
import { computed } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { normalizeArea } from '../../utils/areas.js'
import { AREA_META } from './areaMeta.js'
import BaseTag from './BaseTag.vue'

/** Read-only area label: color + icon + text (color is never the only signal). */
const props = defineProps({ area: { type: String, default: null } })
const { t } = useLocale()
const meta = computed(() => AREA_META[normalizeArea(props.area)])
</script>

<template>
  <BaseTag :tone="meta.tone" :icon="meta.icon">{{ t('areas.' + normalizeArea(area)) }}</BaseTag>
</template>
