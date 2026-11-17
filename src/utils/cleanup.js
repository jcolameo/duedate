/**
 * Cleanup of old finished tasks (B10).
 *
 * Only tasks that are done and were completed more than a few months ago are
 * candidates. Open tasks are never touched.
 *
 * Tasks that came from the BBNet CSV are reported separately instead of being
 * deleted: they still exist in the CSV, so the next import would bring them back
 * as open tasks. The UI uses that split to explain why they stay.
 *
 * Pure functions: the current time is a parameter, never read here.
 */
import { addMonths } from './calendar.js'

/** Periods the settings screen offers, in months. */
export const CLEANUP_MONTHS = [3, 6, 12]

/**
 * When a finished task counts as finished.
 *
 * `completedAt` is the real answer. Older tasks only have `updatedAt`, so that
 * is the fallback. An unreadable date returns null and the task is kept.
 */
function finishedAt(task) {
  const stamp = Date.parse(task.completedAt || task.updatedAt || '')
  return Number.isNaN(stamp) ? null : stamp
}

/**
 * Splits the finished tasks older than `months` into what can go and what stays.
 *
 * @param {object[]} tasks
 * @param {number} months - age in months, see CLEANUP_MONTHS
 * @param {Date} now - passed in so the result is testable
 * @returns {{ remove: object[], keepCsv: object[] }} own tasks and CSV tasks
 */
export function selectCleanup(tasks, months, now = new Date()) {
  const cutoff = addMonths(now, -months).getTime()
  const old = tasks.filter((task) => {
    if (task.status !== 'done') return false
    const at = finishedAt(task)
    return at !== null && at < cutoff
  })
  return {
    remove: old.filter(task => task.source !== 'csv'),
    keepCsv: old.filter(task => task.source === 'csv'),
  }
}
