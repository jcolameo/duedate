/**
 * Areas (since B3): every task belongs to Studium, Freelance or Privat.
 * Pure helpers; colors and icons live in components/ui/areaMeta.js.
 */
export const AREAS = ['study', 'freelance', 'personal']
export const DEFAULT_AREA = 'study'
export const AREA_FILTERS = ['all', ...AREAS]

/** Unknown or missing values fall back to the default (CSV imports are study). */
export function normalizeArea(area) {
  return AREAS.includes(area) ? area : DEFAULT_AREA
}

/** Unknown filter values behave like "all". */
export function normalizeAreaFilter(filter) {
  return AREA_FILTERS.includes(filter) ? filter : 'all'
}

/** Filters tasks (plain or enriched) by area; 'all' returns the list as is. */
export function filterByArea(tasks, filter) {
  const f = normalizeAreaFilter(filter)
  if (f === 'all') return tasks
  return tasks.filter(task => normalizeArea(task.area) === f)
}

/** { all, study, freelance, personal } counts for filter labels. */
export function countByArea(tasks) {
  const counts = { all: tasks.length, study: 0, freelance: 0, personal: 0 }
  for (const task of tasks) counts[normalizeArea(task.area)]++
  return counts
}
