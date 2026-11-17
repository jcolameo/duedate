<script setup>
/**
 * DoneOverlay: a short green "done" picture with a check mark that is laid
 * over a task card for a moment after the task is completed.
 *
 * Used by: src/views/HomeView.vue:27 (import) and :322 (over the focus card).
 *
 * Props: `title` (shown while not null) and `subtitle`. Events: none.
 *
 * In the background: a fade in and out through <Transition>, plus a pop
 * animation on the check mark. No timers here: the parent decides when
 * `title` is set and when it goes back to null.
 *
 * Why it is built this way: purely visual. It cannot be focused and is
 * hidden from assistive tech, because the toast already announces the same
 * thing. The parent skips it under prefers-reduced-motion.
 *
 * How to read this file: the props, then the template, then the <style>
 * with the animation names. The parent must place it inside an element with
 * `relative`, because the overlay is `absolute inset-0`.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { PhCheck } from '@phosphor-icons/vue'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - title: big text, e.g. "Diese Aufgabe wurde erledigt"; null = hidden
 * - subtitle: optional second line, e.g. the task title (cut off when too long)
 */
defineProps({
  title: { type: String, default: null },
  subtitle: { type: String, default: '' },
})

// Template notes: `<Transition name="dd-done">` animates one element that
// appears or disappears through `v-if`. Vue adds the classes
// `dd-done-enter-from`, `dd-done-leave-to` and so on (see <style>).
// `weight="bold"` on the check icon is the Phosphor icon weight.
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
/* `scoped`: these rules only reach elements of this component. */
/* Fade in fast, fade out slower, so the result stays readable a little longer. */
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
