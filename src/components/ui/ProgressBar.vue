<script setup>
import { ref, watch, onBeforeUnmount } from 'vue'

/**
 * Progress bar with a percentage (DESIGN.md §9): the bar grows by CSS
 * transition, the number counts up to the new value. Under
 * prefers-reduced-motion both jump straight to the value. Turns green at 100.
 */
const props = defineProps({
  /** 0–100 */
  value: { type: Number, required: true },
  /** Accessible description, e.g. "Tagesfortschritt: 42 %, 3 von 7 Schritten" */
  label: { type: String, required: true },
})

const shown = ref(props.value)
let frame = 0

function reduced() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

watch(() => props.value, (to) => {
  cancelAnimationFrame(frame)
  const from = shown.value
  if (reduced() || from === to) { shown.value = to; return }
  const start = performance.now()
  const duration = 600
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    shown.value = from + (to - from) * (1 - (1 - t) ** 3) // ease-out cubic
    if (t < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
})

onBeforeUnmount(() => cancelAnimationFrame(frame))
</script>

<template>
  <div class="flex items-center gap-3">
    <div
      role="progressbar"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="value"
      class="h-1.5 w-36 overflow-hidden rounded-full bg-line-strong/40 sm:w-48"
    >
      <div
        :class="['h-full rounded-full bg-green-ink transition-[width] duration-[600ms] ease-out-soft', value >= 100 && 'dd-bar-full']"
        :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
      ></div>
    </div>
    <span class="min-w-[3.5ch] font-mono text-[13px] tabular-nums text-ink" aria-hidden="true">{{ Math.round(shown) }} %</span>
  </div>
</template>

<style scoped>
.dd-bar-full {
  animation: dd-bar-pulse 700ms var(--ease-out-soft);
}
@keyframes dd-bar-pulse {
  from {
    opacity: 0.55;
  }
}
</style>
