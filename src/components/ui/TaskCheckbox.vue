<script setup>
/**
 * TaskCheckbox: the round-cornered box in front of a task that marks it done
 * (or open again); the check mark pops in briefly when completed.
 *
 * Used by: src/views/HomeView.vue:340 and :397,
 * src/views/DeadlinesView.vue:202.
 *
 * Props: `done` and `title` (for the screen reader label). Event: `toggle`
 * when the user clicks or presses Space. The parent changes the task.
 *
 * In the background: nothing. The pop animation is CSS only and is turned
 * off under prefers-reduced-motion by the global rule in src/style.css:150.
 *
 * Why it is built this way: a real <input type="checkbox"> gives keyboard
 * and screen reader support for free. It is made invisible (appearance-none)
 * and laid over a custom-drawn box.
 *
 * How to read this file: props, the event and `label`, then the template:
 * the invisible input on top, the visible box below it. `peer-*` classes
 * let the box react to hover and focus of the input.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed } from 'vue'
import { PhCheck } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - done: whether the task is completed (checked)
 * - title: task title, used inside the accessible name ('Mark “title” as done')
 */
const props = defineProps({
  done: { type: Boolean, required: true },
  title: { type: String, required: true },
})
/**
 * Events, like a callback prop in React, but declared up front so the parent
 * can listen with `@toggle="..."`.
 * - toggle(): the user wants to flip the done state
 */
const emit = defineEmits(['toggle'])
const { t } = useLocale()

// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes. The label says what a click will do, not what
// the state is: "reopen" when done, "complete" when open.
const label = computed(() =>
  props.done ? t('tasks.reopenLabel', { title: props.title }) : t('tasks.completeLabel', { title: props.title }),
)

// Template notes: `:checked="done"` sets the box one way; there is no
// `v-model`, the parent decides.
// HINWEIS: If the parent ignores `toggle`, the browser has already flipped
// the native checkbox and Vue does not set it back, because `done` did not
// change. The box can then show the wrong state until the next real change.
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
/* `scoped`: these rules only reach elements of this component. */
/* The check mark is created when `done` turns true, so the animation runs then. */
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
