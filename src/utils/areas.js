/**
 * The three areas a task can belong to: Studium, Freelance, Privat.
 *
 * Only the codes live here. Labels, colors and icons are UI concerns and sit in
 * `components/ui/areaMeta.js`, so this file stays free of Vue and translations.
 *
 * Pure functions: no storage, no clock, no Vue.
 */

export const AREAS = ['study', 'freelance', 'personal']
export const DEFAULT_AREA = 'study'
export const AREA_FILTERS = ['all', ...AREAS]

/**
 * Falls back to the default area for anything unknown.
 *
 * CSV imports carry no area, and old backups may hold a code that no longer
 * exists, so an unknown value must not leak into the UI.
 *
 * @param {string} area
 * @returns {string} one of AREAS
 */
export function normalizeArea(area) {
  return AREAS.includes(area) ? area : DEFAULT_AREA
}

/**
 * Falls back to "all" for an unknown filter value.
 *
 * @param {string} filter
 * @returns {string} one of AREA_FILTERS
 */
export function normalizeAreaFilter(filter) {
  return AREA_FILTERS.includes(filter) ? filter : 'all'
}

/**
 * Keeps the tasks of one area. Works on plain and on enriched tasks.
 *
 * @param {object[]} tasks
 * @param {string} filter - area code or 'all'
 * @returns {object[]} the same array when the filter is 'all'
 */
export function filterByArea(tasks, filter) {
  const normalized = normalizeAreaFilter(filter)
  if (normalized === 'all') return tasks
  return tasks.filter(task => normalizeArea(task.area) === normalized)
}

/**
 * Counts tasks per area, for the filter labels.
 *
 * @param {object[]} tasks
 * @returns {{ all: number, study: number, freelance: number, personal: number }}
 */
export function countByArea(tasks) {
  const counts = { all: tasks.length, study: 0, freelance: 0, personal: 0 }
  for (const task of tasks) counts[normalizeArea(task.area)]++
  return counts
}
