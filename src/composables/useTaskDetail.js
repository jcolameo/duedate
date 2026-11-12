import { ref } from 'vue'

/** Which task the detail panel shows (null = closed). Shared by all views. */
const taskId = ref(null)
/** The work session the panel was opened from (calendar), or null */
const context = ref(null)

function openTask(task, session = null) {
  taskId.value = task.id ?? task._id
  context.value = session
}

/**
 * Click on a whole card or table row opens the task (mouse convenience; the
 * title button is the keyboard and screen reader path). Clicks on controls
 * inside the card, and selecting text, keep their normal behaviour.
 */
function openFromClick(event, task) {
  if (event.target.closest('button, a, input, select, textarea, label')) return
  if (window.getSelection()?.toString()) return
  openTask(task)
}

export function useTaskDetail() {
  return {
    taskId,
    context,
    openTask,
    openFromClick,
    closeTask: () => { taskId.value = null; context.value = null },
  }
}
