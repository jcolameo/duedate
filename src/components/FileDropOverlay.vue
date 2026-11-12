<script setup>
import { PhFileArrowUp } from '@phosphor-icons/vue'
import { useLocale } from '../composables/useLocale.js'

/** Shown while a file is dragged over the window: "drop it here to import". Purely visual. */
defineProps({ show: { type: Boolean, default: false } })
const { t } = useLocale()
</script>

<template>
  <Transition name="dd-drop">
    <div v-if="show" class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-canvas/80 p-8" aria-hidden="true">
      <div class="flex max-w-md flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-ink-muted bg-surface px-10 py-12 text-center">
        <span class="flex size-12 items-center justify-center rounded-xl bg-surface-muted text-ink">
          <PhFileArrowUp class="size-6" />
        </span>
        <p class="font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('import.dropHere') }}</p>
        <p class="text-sm text-ink-muted">{{ t('import.dropHint') }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dd-drop-enter-active,
.dd-drop-leave-active {
  transition: opacity 150ms var(--ease-out-soft);
}
.dd-drop-enter-from,
.dd-drop-leave-to {
  opacity: 0;
}
</style>
