/**
 * The "Heute" screen (B6): rank open tasks, suggest up to three for today, offer
 * a replacement when the user does not want the current one, and add up the
 * effort.
 *
 * Works on enriched tasks (`_id`, `_title`, `_days`) and on plain ones
 * (`id`, `title`), because the store hands out both depending on the caller.
 *
 * Pure functions: the current time is a parameter, never read here.
 */
import { remainingMinutes, formatMinutes } from './estimate.js'

export { formatMinutes }

/** How many tasks "Heute" suggests at once. */
export const TODAY_LIMIT = 3

const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

/** A task never adds more than this to a single day (planner rule, B8). */
export const DAILY_TASK_CAP_MIN = 180

const idOf = (task) => task._id ?? task.id
const titleOf = (task) => task._title ?? task.title ?? ''

/**
 * The priority that counts, with the planner's rule for graded tasks.
 *
 * A graded task without an explicit priority counts as high, because it is the
 * one that costs marks when it slips.
 *
 * @param {object} task
 * @returns {'high'|'medium'|'low'}
 */
export function effectivePriority(task) {
  return task.priority || (task.graded ? 'high' : 'medium')
}

/**
 * Urgency bucket, using the same thresholds as the status codes:
 * 0 overdue, 1 urgent (under 3 days), 2 soon (under 7 days), 3 later, 4 no date.
 *
 * Sorting by bucket first means a nearer deadline always wins over a higher
 * priority; priority only decides between tasks in the same bucket.
 */
function bucket(task) {
  const days = task._days
  if (days === null || days === undefined) return 4
  if (days < 0) return 0
  if (days < 3) return 1
  if (days < 7) return 2
  return 3
}

/**
 * Sort order for suggestions: urgency, then priority, then the nearer date,
 * then the title so the order stays stable between renders.
 */
export function compareSuggestion(a, b) {
  return (
    bucket(a) - bucket(b) ||
    PRIORITY_RANK[effectivePriority(a)] - PRIORITY_RANK[effectivePriority(b)] ||
    (a._days ?? 0) - (b._days ?? 0) ||
    titleOf(a).localeCompare(titleOf(b), 'de-CH')
  )
}

/**
 * Open tasks, best candidate first. The input array is not modified.
 *
 * @param {object[]} openTasks
 * @returns {object[]}
 */
export function rankCandidates(openTasks) {
  return [...openTasks].sort(compareSuggestion)
}

/**
 * The best tasks for today.
 *
 * @param {object[]} openTasks
 * @param {object} [options]
 * @param {number} [options.limit]
 * @param {string[]} [options.exclude] - IDs already on today's list
 * @returns {object[]}
 */
export function suggestToday(openTasks, { limit = TODAY_LIMIT, exclude = [] } = {}) {
  const skip = new Set(exclude)
  return rankCandidates(openTasks.filter(t => !skip.has(idOf(t)))).slice(0, limit)
}

/**
 * The next task to bring in ("Andere vorschlagen", "Noch eine Aufgabe").
 *
 * Takes the best task that is neither on today's list nor already skipped. When
 * only skipped ones are left, the best of those comes back, so the button never
 * does nothing.
 *
 * @param {object[]} openTasks
 * @param {object} [options]
 * @param {string[]} [options.exclude] - IDs already on today's list
 * @param {string[]} [options.skipped] - IDs the user passed over
 * @returns {object|null}
 */
export function pickReplacement(openTasks, { exclude = [], skipped = [] } = {}) {
  const taken = new Set(exclude)
  const ranked = rankCandidates(openTasks.filter(t => !taken.has(idOf(t))))
  const passed = new Set(skipped)
  return ranked.find(t => !passed.has(idOf(t))) || ranked[0] || null
}

/**
 * Time still to do on a task: the estimate minus the finished checklist steps.
 *
 * @param {object} task
 * @returns {number|null} null without an estimate
 */
export function effortMinutes(task) {
  return remainingMinutes(task)
}

/**
 * What today's tasks still need.
 *
 * Returns null when the answer would be a lie: no tasks at all, or one without
 * an estimate. A big task counts with at most DAILY_TASK_CAP_MIN, because that
 * is all that fits into one day anyway.
 *
 * @param {object[]} tasks
 * @returns {{ minutes: number }|null}
 */
export function totalEffort(tasks) {
  if (!tasks.length) return null
  let minutes = 0
  for (const task of tasks) {
    const remaining = effortMinutes(task)
    if (remaining === null) return null
    minutes += Math.min(remaining, DAILY_TASK_CAP_MIN)
  }
  return { minutes }
}

/**
 * Validates the stored "today" state.
 *
 * Anything unreadable becomes an empty state instead of throwing, because the
 * value comes from localStorage and may be from an older version.
 *
 * @param {object} stored
 * @returns {{ date: string, ids: string[], skipped: string[] }}
 */
export function normalizeToday(stored) {
  const strings = (list) => (Array.isArray(list) ? [...new Set(list.filter(x => typeof x === 'string'))] : [])
  if (!stored || typeof stored !== 'object' || !/^\d{4}-\d{2}-\d{2}$/.test(stored.date || '')) {
    return { date: '', ids: [], skipped: [] }
  }
  return { date: stored.date, ids: strings(stored.ids), skipped: strings(stored.skipped) }
}

/**
 * Progress of the whole day, counted in steps rather than tasks.
 *
 * Every checklist step counts, and finishing the task is one more step. A task
 * without a checklist is a single step. A task marked done counts completely,
 * whatever its boxes say, because the user's decision wins.
 *
 * @param {object[]} tasks - enriched tasks with `_checklist` and `_isDone`
 * @returns {{ done: number, total: number, percent: number }} percent is rounded,
 *   0 for an empty day
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
