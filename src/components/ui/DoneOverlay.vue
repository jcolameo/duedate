<script setup>
import { PhCheck } from '@phosphor-icons/vue'

/**
 * Short, purely visual confirmation laid over a card ("Diese Aufgabe wurde
 * erledigt"). Not focusable and hidden from assistive tech (the toast
 * announces the same thing); the parent decides when it shows and skips it
 * under prefers-reduced-motion. Place inside a `relative` wrapper.
 */
defineProps({
  /** null = hidden */
  title: { type: String, default: null },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <Transition name="dd-done">
    <div v-if="title" class="pointer-events-none absolute inset-0 z-10 overflow-hidden rounded-xl bg-surface" aria-hidden="true">
      <div class="absolute inset-0 bg-green-soft"></div>
      <div class="relative flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
        <span class="dd-done-check flex size-11 items-center justify-center rounded-full bg-green-ink text-surface">
          <PhCheck weight="bold" class="size-6" />
        </span>
        <p class="font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-green-ink">{{ title }}</p>
        <p v-if="subtitle" class="max-w-md truncate text-sm text-green-ink">{{ subtitle }}</p>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.dd-done-enter-active {
  transition: opacity 160ms var(--ease-out-soft);
}
.dd-done-leave-active {
  transition: opacity 320ms var(--ease-out-soft);
}
.dd-done-enter-from,
.dd-done-leave-to {
  opacity: 0;
}
.dd-done-check {
  animation: dd-done-pop 380ms var(--ease-out-soft);
}
@keyframes dd-done-pop {
  from {
    transform: scale(0.5);
    opacity: 0;
  }
}
</style>
