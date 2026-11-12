import { useTasks } from './useTasks.js'
import { remainingMinutes } from '../utils/estimate.js'

export const PRIORITY_OPTIONS = ['high', 'medium', 'low']

/**
 * Estimate (total effort in minutes) and priority per task. Since B1 they are stored on the task itself
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
    estimateMin: task.estimateMin || null,
    remainingMin: remainingMinutes(task),
    priority: task.priority || defaultPriority(task),
  }
}

function setEstimate(taskId, estimateMin) {
  updateTask(taskId, { estimateMin })
}

function setPriority(taskId, priority) {
  updateTask(taskId, { priority })
}

export function useTaskPlanning() {
  return { getPlanningFor, setEstimate, setPriority }
}
