<script setup>
/**
 * ProgressBar: a thin green bar with a percentage next to it, e.g. how much
 * of today's plan is done.
 *
 * Used by: src/views/HomeView.vue:278 and :319 (day progress),
 * src/components/TaskDetail.vue:233 (progress of one task).
 *
 * Props: `value` (0 to 100) and `label` (sentence for screen readers).
 * Events: none.
 *
 * In the background: a `watch` on `value` starts a count-up animation of the
 * number with requestAnimationFrame. The bar itself grows by CSS transition.
 * The running frame is cancelled when the value changes again or the
 * component disappears. Under prefers-reduced-motion the number jumps.
 *
 * Why it is built this way (DESIGN.md §9): CSS can animate the bar's width,
 * but not a number in text, so the number is counted up in JavaScript.
 *
 * How to read this file: `shown` and `frame`, then the `watch` (the
 * animation), then the template. `value` drives the bar, `shown` the number.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { ref, watch, onBeforeUnmount } from 'vue'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - value: progress in percent, 0–100; at 100 the bar pulses once
 * - label: accessible description, e.g. "Tagesfortschritt: 42 %, 3 von 7 Schritten"
 */
const props = defineProps({
  value: { type: Number, required: true },
  label: { type: String, required: true },
})

// `ref`: a reactive variable, like one field in a React class component's
// `state`; read and write it through `.value`. `shown` is the number on
// screen while it counts towards `props.value`.
const shown = ref(props.value)
// Plain variable, not a ref: nothing on screen depends on the frame handle.
let frame = 0

/**
 * Does the user ask the system for less motion?
 *
 * @returns {boolean} true when prefers-reduced-motion is set
 */
function reduced() {
  // `window` is missing outside a browser (e.g. in a Node test), and some
  // test DOMs such as jsdom have no matchMedia; both count as "no".
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

// `watch` with a getter: like `useEffect` with a dependency list, but it
// names what it listens to, here `props.value`. `to` is the new value.
watch(() => props.value, (to) => {
  // A new value arrived while the last animation was still running: stop the
  // old one first, otherwise two loops would write `shown` at the same time.
  cancelAnimationFrame(frame)
  const from = shown.value
  // Reduced motion, or nothing to animate: show the target at once.
  if (reduced() || from === to) { shown.value = to; return }
  const start = performance.now()
  const duration = 600
  // One animation step per screen refresh. `t` (local, not the locale
  // function) is the elapsed share of the duration, from 0 to 1.
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration)
    shown.value = from + (to - from) * (1 - (1 - t) ** 3) // ease-out cubic
    if (t < 1) frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
})

// `onBeforeUnmount`: like `componentWillUnmount` in a React class component.
// Stops a running animation, so it does not write to a component that is gone.
onBeforeUnmount(() => cancelAnimationFrame(frame))

// Template notes for this file:
// - The bar width is clamped to 0–100 %, so it never overflows its track.
//   HINWEIS: `aria-valuenow` and the number get the unclamped `value`, so a
//   value of 120 is announced and shown as 120 % next to a full bar.
// - `value >= 100 && 'dd-bar-full'` adds the pulse class only when complete;
//   Vue skips `false` entries in class arrays.
// - The number has `aria-hidden`, because the progressbar role already tells
//   screen readers the value.
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
/* `scoped`: these rules only reach elements of this component. */
/* A short fade-in pulse when the bar reaches 100 %. */
.dd-bar-full {
  animation: dd-bar-pulse 700ms var(--ease-out-soft);
}
@keyframes dd-bar-pulse {
  from {
    opacity: 0.55;
  }
}
</style>
