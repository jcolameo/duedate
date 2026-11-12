/**
 * Cleanup of old finished tasks (B10). Only tasks that are done and were
 * completed more than N months ago are candidates.
 *
 * Tasks imported from the BBNet CSV are never removed: they are still in the
 * CSV, so the next import would bring them back as open tasks. They are
 * reported separately so the UI can say why they stay.
 */
import { addMonths } from './calendar.js'

export const CLEANUP_MONTHS = [3, 6, 12]

/** The moment a finished task counts from: completedAt, else the last change. */
function finishedAt(task) {
  const stamp = Date.parse(task.completedAt || task.updatedAt || '')
  return Number.isNaN(stamp) ? null : stamp
}

/**
 * Splits the finished tasks older than `months` into what can be deleted
 * (own tasks) and what stays (CSV tasks). Open tasks are never touched.
 * @returns {{ remove: object[], keepCsv: object[] }}
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
