/**
 * "Heute" logic (B6): rank open tasks, suggest up to three for today, pick a
 * replacement when the user does not want the current one, estimate effort.
 * Works on enriched tasks (_id, _title, _days) and plain ones (id, title).
 */
import { remainingMinutes, formatMinutes } from './estimate.js'

export { formatMinutes }

export const TODAY_LIMIT = 3

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }
/** A task never adds more than this to a single day (planner rule, B8) */
export const DAILY_TASK_CAP_MIN = 180

const idOf = (task) => task._id ?? task.id
const titleOf = (task) => task._title ?? task.title ?? ''

/** Explicit priority, else graded tasks count as high (same rule as the planner). */
export function effectivePriority(task) {
  return task.priority || (task.graded ? 'high' : 'medium')
}

/**
 * Urgency bucket, same thresholds as the status codes:
 * 0 overdue, 1 urgent (< 3 days), 2 soon (< 7 days), 3 later, 4 no date.
 * Nearer deadlines always win over priority; priority decides inside a bucket.
 */
function bucket(task) {
  const days = task._days
  if (days === null || days === undefined) return 4
  if (days < 0) return 0
  if (days < 3) return 1
  if (days < 7) return 2
  return 3
}

export function compareSuggestion(a, b) {
  return (
    bucket(a) - bucket(b) ||
    PRIORITY_RANK[effectivePriority(a)] - PRIORITY_RANK[effectivePriority(b)] ||
    (a._days ?? 0) - (b._days ?? 0) ||
    titleOf(a).localeCompare(titleOf(b), 'de-CH')
  )
}

/** Open tasks, best candidate first (does not mutate the input). */
export function rankCandidates(openTasks) {
  return [...openTasks].sort(compareSuggestion)
}

/** The best `limit` tasks for today, skipping excluded IDs. */
export function suggestToday(openTasks, { limit = TODAY_LIMIT, exclude = [] } = {}) {
  const skip = new Set(exclude)
  return rankCandidates(openTasks.filter(t => !skip.has(idOf(t)))).slice(0, limit)
}

/**
 * Next task to bring in ("Andere vorschlagen", "Noch eine Aufgabe"):
 * the best one that is not in today's list and was not skipped before.
 * When only skipped ones are left, the best of those comes back.
 */
export function pickReplacement(openTasks, { exclude = [], skipped = [] } = {}) {
  const taken = new Set(exclude)
  const ranked = rankCandidates(openTasks.filter(t => !taken.has(idOf(t))))
  const passed = new Set(skipped)
  return ranked.find(t => !passed.has(idOf(t))) || ranked[0] || null
}

/** Time still to do on a task (estimate minus finished checklist steps), or null. */
export function effortMinutes(task) {
  return remainingMinutes(task)
}

/**
 * What today's tasks still need, or null when it cannot be told honestly
 * (no tasks, or one without an estimate). A big task counts with at most
 * DAILY_TASK_CAP_MIN, because that is all that fits into a single day.
 */
export function totalEffort(tasks) {
  if (!tasks.length) return null
  let minutes = 0
  for (const task of tasks) {
    const m = effortMinutes(task)
    if (m === null) return null
    minutes += Math.min(m, DAILY_TASK_CAP_MIN)
  }
  return { minutes }
}

/** Validates stored state: { date: 'YYYY-MM-DD', ids: string[], skipped: string[] }. */
export function normalizeToday(stored) {
  const strings = (list) => (Array.isArray(list) ? [...new Set(list.filter(x => typeof x === 'string'))] : [])
  if (!stored || typeof stored !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(stored.date || '')) {
    return { date: '', ids: [], skipped: [] }
  }
  return { date: stored.date, ids: strings(stored.ids), skipped: strings(stored.skipped) }
}

/**
 * Progress of the whole day in steps (not tasks): every checklist step counts,
 * and finishing the task is one more step. A task without a checklist is a
 * single step. A task marked done counts completely, whatever its boxes say.
 * { done, total, percent } with percent rounded, 0 for an empty day.
 */
export function dayProgress(tasks) {
  let done = 0
  let total = 0
  for (const task of tasks) {
    const list = task._checklist
    const steps = list ? list.total + 1 : 1
    total += steps
    done += task._isDone ? steps : list ? list.done : 0
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 }
}
