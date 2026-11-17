/**
 * useTaskPlanning: effort estimate and priority per task, in the shape the
 * planner expects. Since B1 both values live on the task itself; this file is
 * a thin adapter that keeps the older API working.
 *
 * Called by: src/views/StundenplanView.vue:31 (edit estimate and priority;
 * it also imports PRIORITY_OPTIONS), and inside this folder by
 * usePlanState.js (`getPlanningFor` is handed to the planner).
 *
 * In: nothing. Out: `{ getPlanningFor, setEstimate, setPriority }`.
 *
 * In the background: no storage of its own; the setters write through
 * `updateTask` in useTasks.js. The old key `duedate.taskPlanning.v1` is only
 * read once by the migration in useTasks.js.
 *
 * Module level: only the `updateTask` function is taken once at import; there
 * is no state here.
 *
 * How to read this file: `getPlanningFor` is the important one, the
 * scheduler calls it for every task. The two setters are one-liners.
 */
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

/**
 * Priority for a task the user has not prioritised: graded work is high.
 *
 * @param {object} task raw (`graded`) or enriched (`_isGraded`) task
 * @returns {'high'|'medium'} the default priority
 */
function defaultPriority(task) {
  return (task.graded ?? task._isGraded) ? 'high' : 'medium'
}

/**
 * Planning data of one task, as the scheduler reads it.
 *
 * @param {object} task a task
 * @returns {{ estimateMin: number|null, remainingMin: number|null, priority: string }}
 *   `remainingMin` is the estimate minus the share of checklist steps already done
 */
function getPlanningFor(task) {
  return {
    // `|| null` also turns an estimate of 0 into null ("not estimated").
    estimateMin: task.estimateMin || null,
    remainingMin: remainingMinutes(task),
    priority: task.priority || defaultPriority(task),
  }
}

/**
 * @param {string} taskId task id
 * @param {number|null} estimateMin total effort in minutes
 * @sideeffect updates the task in the store
 */
function setEstimate(taskId, estimateMin) {
  updateTask(taskId, { estimateMin })
}

/**
 * @param {string} taskId task id
 * @param {'high'|'medium'|'low'} priority new priority
 * @sideeffect updates the task in the store
 */
function setPriority(taskId, priority) {
  updateTask(taskId, { priority })
}

/**
 * Composable: a plain function that returns reactive state (here only
 * functions). Vue has no special syntax for it, the `use` prefix is a
 * convention.
 *
 * @returns {{ getPlanningFor: Function, setEstimate: Function, setPriority: Function }}
 */
export function useTaskPlanning() {
  return { getPlanningFor, setEstimate, setPriority }
}
