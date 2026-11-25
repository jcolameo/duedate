<script setup>
/**
 * AppToaster: the strip at the bottom of the screen that shows the short
 * messages ("Task completed · Undo") from useToast.
 *
 * Used by: src/App.vue:3 (imported) and src/App.vue:96 (placed once, for the
 * whole app). Views never place it themselves; they call `useToast().show()`.
 *
 * Props/events: none. All data comes from the shared `toasts` list in
 * src/composables/useToast.js.
 *
 * In the background: nothing of its own. Timers and removal live in
 * useToast; this file only draws the list and forwards the two button clicks.
 *
 * Why it is built this way: one global queue plus one component that draws it,
 * so any view can show a toast without passing callbacks around.
 *
 * How to read this file: the template first, from the outer live region down
 * to one toast. Then the two lookup tables below, which pick icon and color
 * from `toast.tone`. `dismiss` and `runAction` are in useToast.js.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component. Anything named
// here (imports, constants) can be used directly in the template.
import { PhCheckCircle, PhWarningCircle, PhInfo, PhX } from '@phosphor-icons/vue'
import { useToast } from '../../composables/useToast.js'
import { useLocale } from '../../composables/useLocale.js'

const { toasts, dismiss, runAction } = useToast()
const { t } = useLocale()

// tone -> icon component and tone -> text color. Both tables must list the
// same three tones that useToast accepts (neutral, success, error).
const ICONS = { success: PhCheckCircle, error: PhWarningCircle, neutral: PhInfo }
const ICON_COLOR = { success: 'text-green-ink', error: 'text-red-ink', neutral: 'text-ink-muted' }

// Template notes for this file:
// - `<TransitionGroup name="dd-toast">` animates items that enter or leave a
//   list; Vue adds the CSS classes `dd-toast-enter-from` etc. (see <style>).
// - `v-for="toast in toasts" :key="toast.id"` is a loop like `toasts.map(...)`
//   in React, with `key` for the same reason React needs it.
// - `<component :is="ICONS[toast.tone]">` renders whatever component is in
//   the variable, like `<Icon />` with `const Icon = ICONS[tone]` in React.
// - `:attr="expr"` binds a JavaScript expression, `@click="..."` adds a click
//   listener, `{{ expr }}` prints text.
// - `role="alert"` for errors makes screen readers interrupt and read at once;
//   everything else is `status` and waits for a pause (see the live region).
// - The outer box has `pointer-events-none` so it never blocks clicks on the
//   page behind it; each toast turns pointer events back on for itself.
</script>

<template>
  <!-- Polite live region: screen readers announce new toasts without interrupting -->
  <div
    aria-live="polite"
    aria-relevant="additions"
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
  >
    <TransitionGroup name="dd-toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      >
        <component :is="ICONS[toast.tone]" :class="['size-4 shrink-0', ICON_COLOR[toast.tone]]" aria-hidden="true" />
        <p class="flex-1">{{ toast.message }}</p>
        <button
          v-if="toast.action"
          type="button"
          class="rounded-md px-2 py-1 font-medium text-ink underline-offset-4 hover:underline"
          @click="runAction(toast)"
        >
          {{ toast.action.label }}
        </button>
        <button
          type="button"
          class="-mr-1 flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
          :aria-label="t('ui.dismissToast')"
          @click="dismiss(toast.id)"
        >
          <PhX class="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
/* `scoped`: these rules only reach elements of this component. */
/* Vue adds the -enter-/-leave- classes while a toast fades and slides in or out. */
.dd-toast-enter-active,
.dd-toast-leave-active {
  transition: opacity 180ms var(--ease-out-soft), transform 180ms var(--ease-out-soft);
}
.dd-toast-enter-from,
.dd-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
