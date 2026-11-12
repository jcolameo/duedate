import { useTasks } from './useTasks.js'

export const EFFORT_OPTIONS = ['30m', '1h', '2h', '3h+']
export const PRIORITY_OPTIONS = ['high', 'medium', 'low']

/**
 * Effort and priority per task. Since B1 they are stored on the task itself
 * (useTasks); this composable keeps the previous API for the views and the
 * scheduler. The old key duedate.taskPlanning.v1 is only read once by the
 * migration and no longer written.
 */
const { updateTask } = useTasks()

function defaultPriority(task) {
  return (task.graded ?? task._isGraded) ? 'high' : 'medium'
}

function getPlanningFor(task) {
  return {
    effort: task.effort || null,
    priority: task.priority || defaultPriority(task),
  }
}

function setEffort(taskId, effort) {
  updateTask(taskId, { effort })
}

function setPriority(taskId, priority) {
  updateTask(taskId, { priority })
}

export function useTaskPlanning() {
  return { getPlanningFor, setEffort, setPriority }
}
