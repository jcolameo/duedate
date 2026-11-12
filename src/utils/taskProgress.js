/**
 * "How far are we?" for one task (calendar and task panel): progress from the
 * checklist steps, the time that belongs to finished steps, the sessions the
 * plan has for it, and when it was created, changed and finished.
 */
import { checklistProgress, checklistTextOf } from './checklist.js'
import { remainingMinutes } from './estimate.js'

/**
 * { percent, steps: {done,total}|null, estimateMin, remainingMin, doneMin, isDone }
 * - done task: 100 %
 * - with steps: share of checked steps
 * - without steps: 0 % (nothing measurable yet)
 * doneMin = estimate minus remaining (time covered by finished steps), null without an estimate.
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
 * Sessions of one task from the plan, in order, split into what is still
 * ahead (today or later) and the summary: { sessions, upcoming, minutes, first, last }.
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

/** createdAt / updatedAt / completedAt as Dates; anything unusable is null. */
export function taskTimeline(task) {
  const read = (value) => {
    const d = value ? new Date(value) : null
    return d && !Number.isNaN(d.getTime()) ? d : null
  }
  return {
    created: read(task.createdAt),
    updated: read(task.updatedAt),
    completed: task.status === 'done' ? read(task.completedAt) : null,
  }
}
