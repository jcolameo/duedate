/**
 * "How far are we?" for a single task, used by the calendar and the task panel.
 *
 * Three sources feed the answer: the checklist steps, the estimate (how much
 * time the finished steps already cover) and the sessions the plan has for the
 * task. Plus the three timestamps of the task.
 *
 * Pure functions: the current time is a parameter, never read here.
 */
import { checklistProgress, checklistTextOf } from './checklist.js'
import { remainingMinutes } from './estimate.js'

/**
 * Progress of one task.
 *
 * - done task: 100 %
 * - with steps: share of checked steps
 * - without steps: 0 %, because there is nothing measurable yet
 *
 * `doneMin` is the estimate minus what is left, so it is the time the finished
 * steps already cover. It stays null without an estimate.
 *
 * @param {object} task
 * @returns {{ percent: number, steps: {done: number, total: number}|null,
 *   estimateMin: number|null, remainingMin: number|null, doneMin: number|null,
 *   isDone: boolean }}
 */
export function taskProgress(task) {
  const isDone = task.status === 'done'
  const list = checklistProgress(checklistTextOf(task))
  const estimateMin = task.estimateMin || null
  const remainingMin = estimateMin ? remainingMinutes(task) : null
  const steps = list ? { done: list.done, total: list.total } : null
  const percent = isDone ? 100 : list ? Math.round((list.done / list.total) * 100) : 0
  return {
    percent,
    steps,
    estimateMin,
    remainingMin: isDone ? 0 : remainingMin,
    doneMin: estimateMin ? estimateMin - (isDone ? 0 : remainingMin) : null,
    isDone,
  }
}

/**
 * The sessions the plan has for one task.
 *
 * `upcoming` holds the sessions from today on, which is what the panel shows as
 * "next up". The rest is the summary over all sessions.
 *
 * @param {object} plan - result of generatePlan()
 * @param {string} taskId
 * @param {Date} today - passed in so the split is testable
 * @returns {{ sessions: object[], upcoming: object[], minutes: number,
 *   first: Date|null, last: Date|null }}
 */
export function plannedSessions(plan, taskId, today = new Date()) {
  const start = new Date(today)
  start.setHours(0, 0, 0, 0)
  const sessions = (plan?.sessions || []).filter(s => s.taskId === taskId)
  return {
    sessions,
    upcoming: sessions.filter(s => s.date >= start),
    minutes: sessions.reduce((sum, s) => sum + (s.endMin - s.startMin), 0),
    first: sessions.length ? sessions[0].date : null,
    last: sessions.length ? sessions[sessions.length - 1].date : null,
  }
}

/**
 * The three timestamps of a task as Dates.
 *
 * Anything unreadable becomes null instead of an Invalid Date, so the UI can
 * simply check for null. `completed` is only filled for a done task.
 *
 * @param {object} task
 * @returns {{ created: Date|null, updated: Date|null, completed: Date|null }}
 */
export function taskTimeline(task) {
  const read = (value) => {
    const date = value ? new Date(value) : null
    return date && !Number.isNaN(date.getTime()) ? date : null
  }
  return {
    created: read(task.createdAt),
    updated: read(task.updatedAt),
    completed: task.status === 'done' ? read(task.completedAt) : null,
  }
}
