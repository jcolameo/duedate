<script setup>
import { PhX } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { TAG_COLOR_CLASSES } from './tagColors.js'

/**
 * User tag: "#name" in normal case with a square-ish shape, so it reads
 * differently from the uppercase area pills. Optionally removable.
 */
defineProps({
  tag: { type: Object, required: true },
  removable: { type: Boolean, default: false },
})
const emit = defineEmits(['remove'])
const { t } = useLocale()
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
