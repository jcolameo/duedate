<script setup>
/**
 * AreaSelect: the colored area pill on a task (Studium, Freelance, Privat)
 * that you can click to move the task to another area.
 *
 * Used by: src/views/DeadlinesView.vue:28 (import) and :216 (one per task row).
 *
 * Props: `area` (current area key, may be unknown or null) and `title` (task
 * title, only for the screen reader label). Event: `change` with the new
 * area key. The component does not save anything; the parent does.
 *
 * In the background: nothing. No state of its own, no timers, no watch.
 *
 * Why it is built this way: a native <select> brings keyboard support and
 * screen reader support for free. It is made transparent and laid over a
 * pill, with the area icon on the left and a caret on the right.
 *
 * How to read this file: props and the two `computed` values first, then the
 * template: outer <span> (the pill and its colors), icon, <select>, caret.
 * Colors and icons come from areaMeta.js in this folder.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed } from 'vue'
import { PhCaretDown } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { AREAS, normalizeArea } from '../../utils/areas.js'
import { AREA_META, AREA_TONE_CLASSES } from './areaMeta.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters. Vue checks the types in development.
 * - area: area key ('study' | 'freelance' | 'personal'); null or unknown
 *   values are shown as the default area (see `current`)
 * - title: task title, used inside the accessible name of the select
 */
const props = defineProps({
  area: { type: String, default: null },
  title: { type: String, required: true },
})
/**
 * Events, like a callback prop in React, but declared up front so the parent
 * can listen with `@change="..."`.
 * - change(newArea: string): the user picked another area in the list
 */
const emit = defineEmits(['change'])
const { t } = useLocale()

// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes. Read it with `.value` in the script; the
// template unwraps it for you.
const current = computed(() => normalizeArea(props.area))
const meta = computed(() => AREA_META[current.value])

// Template notes for this file:
// - `:value="current"` sets the select's value one way; there is no
//   `v-model` here, so the parent stays in charge of the area.
//   HINWEIS: If the parent ignores the `change` event, the select still shows
//   the newly picked area, because Vue only writes `value` when `current`
//   itself changes. Screen and data can then disagree until the next render.
// - `$event.target.value` is the native DOM event's selected option value.
// - `has-[select:focus-visible]:...` draws the focus ring on the pill when the
//   invisible select inside it has keyboard focus.
// - `light:hover:...` is a project-specific Tailwind variant for the light theme.
// - The icon and caret have `pointer-events-none`, so a click on them still
//   reaches the select underneath and opens the list.
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
