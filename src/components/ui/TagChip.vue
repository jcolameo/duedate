<script setup>
/**
 * TagChip: one user tag like "#fotografie", in its color, optionally with a
 * small × to remove it.
 *
 * Used by: src/views/HomeView.vue:245, :287, :349 and :405,
 * src/views/DeadlinesView.vue:212, src/components/QuickAdd.vue:228 and :231,
 * src/components/TagPicker.vue:24, src/components/TagMenu.vue:226.
 *
 * Props: `tag` (`{ name, color }`) and `removable`. Event: `remove` when the
 * × is clicked. The chip does not delete anything itself.
 *
 * In the background: nothing. Colors come from tagColors.js in this folder.
 *
 * Why it is built this way: "#name" in normal case with a square-ish shape,
 * so it reads differently from the uppercase, round area pills.
 *
 * How to read this file: props and the event, then the template: color
 * classes on the outer span, the "#", the name, the optional button.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { PhX } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { TAG_COLOR_CLASSES } from './tagColors.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - tag: the tag object from useTags, at least `{ name, color }`
 * - removable: show the × button
 */
defineProps({
  tag: { type: Object, required: true },
  removable: { type: Boolean, default: false },
})
/**
 * Events, like a callback prop in React, but declared up front so the parent
 * can listen with `@remove="..."`.
 * - remove(): the user clicked the × button
 */
const emit = defineEmits(['remove'])
const { t } = useLocale()

// Template notes: `TAG_COLOR_CLASSES[tag.color] || TAG_COLOR_CLASSES.gray`
// falls back to grey for a color the table does not know (e.g. from an old
// backup). The "#" is aria-hidden, so screen readers read just the name.
// `light:hover:...` is a project-specific Tailwind variant for the light theme.
</script>

<template>
  <span :class="['inline-flex max-w-full items-center gap-0.5 rounded-md px-1.5 text-[12px] font-medium leading-5 whitespace-nowrap', TAG_COLOR_CLASSES[tag.color] || TAG_COLOR_CLASSES.gray]">
    <span class="opacity-70" aria-hidden="true">#</span><span class="truncate">{{ tag.name }}</span>
    <button
      v-if="removable"
      type="button"
      class="-mr-1 ml-0.5 flex size-4 items-center justify-center rounded hover:bg-black/10 light:hover:bg-black/5"
      :aria-label="t('tags.remove', { name: tag.name })"
      @click="emit('remove')"
    >
      <PhX class="size-3" aria-hidden="true" />
    </button>
  </span>
</template>
