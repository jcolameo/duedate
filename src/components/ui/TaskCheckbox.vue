<script setup>
import { computed } from 'vue'
import { PhCheck } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'

/**
 * Checkbox to complete a task. A native checkbox (keyboard + screen reader
 * for free) with a custom look; the check pops in briefly when completed
 * (disabled under prefers-reduced-motion via the global rule).
 */
const props = defineProps({
  done: { type: Boolean, required: true },
  title: { type: String, required: true },
})
const emit = defineEmits(['toggle'])
const { t } = useLocale()

const label = computed(() =>
  props.done ? t('tasks.reopenLabel', { title: props.title }) : t('tasks.completeLabel', { title: props.title }),
)
</script>

<template>
  <label class="relative inline-flex size-6 shrink-0 cursor-pointer items-center justify-center">
    <input
      type="checkbox"
      class="peer absolute inset-0 cursor-pointer appearance-none rounded-md"
      :checked="done"
      :aria-label="label"
      @change="emit('toggle')"
    />
    <span
      :class="[
        'pointer-events-none flex size-[18px] items-center justify-center rounded-[5px] border transition-colors duration-150',
        done ? 'border-green-ink bg-green-ink text-surface' : 'border-line-strong bg-surface peer-hover:border-ink-muted',
        'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
      ]"
      aria-hidden="true"
    >
      <PhCheck v-if="done" weight="bold" class="dd-check size-3" />
    </span>
  </label>
</template>

<style scoped>
.dd-check {
  animation: dd-check-pop 220ms var(--ease-out-soft);
}
@keyframes dd-check-pop {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}
</style>
