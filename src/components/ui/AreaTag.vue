<script setup>
/**
 * AreaTag: a small read-only pill that says which area a task belongs to,
 * with color, icon and text (color is never the only signal).
 *
 * Used by: src/views/HomeView.vue:24 (import), placed at :246, :286, :350
 * and :406 next to task titles.
 *
 * Props: `area` (area key, may be null or unknown). Events: none.
 *
 * In the background: nothing. It looks up color and icon in areaMeta.js and
 * hands them to BaseTag, which draws the pill.
 *
 * Why it is built this way: the editable version is AreaSelect.vue. Lists
 * that only display the area use this lighter one, which needs no handlers.
 *
 * How to read this file: `meta` below, then the one-line template. BaseTag.vue
 * in this folder does the actual drawing.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed } from 'vue'
import { useLocale } from '../../composables/useLocale.js'
import { normalizeArea } from '../../utils/areas.js'
import { AREA_META } from './areaMeta.js'
import BaseTag from './BaseTag.vue'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - area: area key; null or unknown values fall back to the default area
 */
const props = defineProps({ area: { type: String, default: null } })
const { t } = useLocale()
// `computed`: like a value React would recompute in `render`, but cached
// until a dependency (here `props.area`) changes.
const meta = computed(() => AREA_META[normalizeArea(props.area)])

// Template notes: `:tone` and `:icon` pass JavaScript values as props to
// BaseTag. The text between the tags becomes BaseTag's `<slot>`, like
// `props.children` in React. `area` without `props.` works there because the
// template sees props directly.
</script>

<template>
  <BaseTag :tone="meta.tone" :icon="meta.icon">{{ t('areas.' + normalizeArea(area)) }}</BaseTag>
</template>
