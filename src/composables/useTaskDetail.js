/**
 * useTaskDetail: which task the side panel with the task details shows. Any
 * view can open it; the panel component reads it.
 *
 * Called by: src/components/TaskDetail.vue:35 (the panel reads `taskId`,
 * `context` and closes it), src/views/HomeView.vue:44,
 * src/views/DeadlinesView.vue:49, src/views/CalendarView.vue:47,
 * src/views/StundenplanView.vue:45 (they open it).
 *
 * In: nothing. Out: `{ taskId, context, openTask, openFromClick, closeTask }`.
 * `taskId` is the open task's id or null; `context` is the calendar session
 * the panel was opened from, or null.
 *
 * In the background: nothing is stored; the panel is closed after a reload.
 *
 * Why module level: `taskId` exists once, so a click in any view opens the
 * one panel that App renders.
 *
 * How to read this file: two refs, `openTask` sets both, `closeTask` clears
 * both, and `openFromClick` decides whether a click on a card should open it.
 */
import { ref } from 'vue'

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one panel state for the
// whole app.
/** Which task the detail panel shows (null = closed). Shared by all views. */
const taskId = ref(null)
/** The work session the panel was opened from (calendar), or null */
const context = ref(null)

/**
 * Opens the panel for a task.
 *
 * @param {object} task raw task (`id`) or enriched task (`_id`)
 * @param {object|null} [session=null] calendar session, if opened from the calendar
 * @sideeffect sets `taskId` and `context`
 */
function openTask(task, session = null) {
  taskId.value = task.id ?? task._id
  context.value = session
}

/**
 * Click on a whole card or table row opens the task (mouse convenience; the
 * title button is the keyboard and screen reader path). Clicks on controls
 * inside the card, and selecting text, keep their normal behaviour.
 *
 * @param {MouseEvent} event the click
 * @param {object} task the task of the card
 * @sideeffect may open the panel
 */
function openFromClick(event, task) {
  // The click was on a button, link or form field inside the card; that
  // control does its own thing.
  if (event.target.closest('button, a, input, select, textarea, label')) return
  // The user dragged to select text; opening the panel would interrupt that.
  if (window.getSelection()?.toString()) return
  openTask(task)
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ taskId: import('vue').Ref<string|null>, context: import('vue').Ref<object|null>,
 *   openTask: Function, openFromClick: Function, closeTask: () => void }}
 */
export function useTaskDetail() {
  return {
    taskId,
    context,
    openTask,
    openFromClick,
    closeTask: () => { taskId.value = null; context.value = null },
  }
}
