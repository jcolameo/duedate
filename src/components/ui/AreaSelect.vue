<script setup>
import { computed } from 'vue'
import { PhCaretDown } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { AREAS, normalizeArea } from '../../utils/areas.js'
import { AREA_META, AREA_TONE_CLASSES } from './areaMeta.js'

/**
 * Area tag that can be changed in place. A native <select> (keyboard and
 * screen reader for free) styled like the tag, with icon and caret on top.
 */
const props = defineProps({
  area: { type: String, default: null },
  /** Task title, for the accessible name */
  title: { type: String, required: true },
})
const emit = defineEmits(['change'])
const { t } = useLocale()

const current = computed(() => normalizeArea(props.area))
const meta = computed(() => AREA_META[current.value])
</script>

<template>
  <span
    :class="[
      'relative inline-flex rounded-full transition-[filter] duration-150 hover:brightness-95 light:hover:brightness-[0.97]',
      'has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-focus',
      AREA_TONE_CLASSES[meta.tone],
    ]"
  >
    <component :is="meta.icon" class="pointer-events-none absolute left-2 top-1/2 size-3 -translate-y-1/2" aria-hidden="true" />
    <select
      :value="current"
      :aria-label="t('areas.changeLabel', { title })"
      class="h-5 cursor-pointer appearance-none rounded-full bg-transparent py-0 pl-6 pr-6 text-[11px] font-semibold uppercase leading-4 tracking-[0.05em] text-current outline-none"
      @change="emit('change', $event.target.value)"
    >
      <option v-for="a in AREAS" :key="a" :value="a" class="bg-surface text-ink normal-case">{{ t('areas.' + a) }}</option>
    </select>
    <PhCaretDown class="pointer-events-none absolute right-2 top-1/2 size-2.5 -translate-y-1/2" aria-hidden="true" />
  </span>
</template>
