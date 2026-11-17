/**
 * useToast: the small messages at the bottom of the screen ("Task
 * completed · Undo"). Any part of the app can show one.
 *
 * Called by: src/components/ui/AppToaster.vue:6 (draws the list, handles the
 * close and action buttons), src/App.vue:19, src/views/HomeView.vue:47,
 * src/views/DeadlinesView.vue:65, src/views/CalendarView.vue:51,
 * src/components/TaskDetail.vue:40 and more; inside this folder by
 * useTaskActions, usePlanEdit and useFileImport.
 *
 * In: nothing. Out: `{ toasts, show, dismiss, runAction }`. `toasts` is a ref
 * with the visible messages `{ id, message, tone, action }`.
 *
 * In the background: nothing is stored. Each toast that closes by itself has
 * a timer, kept in the `timers` Map.
 *
 * Why module level: one queue for the whole app, so a toast shown by a view
 * appears in the single AppToaster component.
 *
 * How to read this file: `show` first, then `dismiss`, which both the timer
 * and the close button call. `runAction` is the click on the action button.
 */
import { ref } from 'vue'

/**
 * Global toast queue (module-level singleton like the other stores).
 * A toast can carry one action, e.g. "Rückgängig" for undo (DESIGN.md §6).
 */
// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one queue for the whole app.
const toasts = ref([])
// Plain variables, not refs: no component shows them, so they need no
// reactivity.
let nextId = 1
// toast id -> timer handle from setTimeout
const timers = new Map()

/**
 * Removes a toast and stops its timer.
 *
 * @param {number} id toast id
 * @sideeffect replaces `toasts.value`, clears a timer
 */
function dismiss(id) {
  // Error toasts have no timer; clearTimeout(undefined) simply does nothing.
  clearTimeout(timers.get(id))
  timers.delete(id)
  toasts.value = toasts.value.filter(t => t.id !== id)
}

/**
 * Shows a toast.
 *
 * @param {string} message
 * @param {{ tone?: 'neutral'|'success'|'error', action?: { label: string, onClick: () => void }, duration?: number }} [options]
 *   `duration` in ms; 0 or less keeps the toast until it is closed
 * @returns {number} toast id
 * @sideeffect appends to `toasts.value`, may start a timer
 */
function show(message, { tone = 'neutral', action = null, duration = 5000 } = {}) {
  const id = nextId++
  toasts.value = [...toasts.value, { id, message, tone, action }]
  // Errors stay until dismissed so they can be read at any pace
  if (tone !== 'error' && duration > 0) {
    timers.set(id, setTimeout(() => dismiss(id), duration))
  }
  return id
}

/**
 * The user clicked the toast's action button (e.g. "Undo").
 *
 * @param {{ id: number, action: { onClick: () => void }|null }} toast the toast
 * @sideeffect runs the action, then removes the toast
 */
function runAction(toast) {
  // Run the action first, then close. If onClick throws, the toast stays
  // visible, so the user sees that something went wrong.
  toast.action?.onClick()
  dismiss(toast.id)
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ toasts: import('vue').Ref<object[]>, show: Function, dismiss: Function, runAction: Function }}
 */
export function useToast() {
  return { toasts, show, dismiss, runAction }
}
