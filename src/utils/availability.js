/**
 * Recurring busy blocks, the times the planner must not use.
 *
 * A block looks like `{ id, label, days: ['Mon', ...], startTime: 'HH:MM',
 * endTime: 'HH:MM' }`, for example "Arbeit, Mo–Do, 08:00–17:00". The planner
 * reads them, the settings screen edits them.
 *
 * Pure functions: no storage, no clock, no Vue.
 */

/** Day codes in the order the app shows them. Monday first, as in Switzerland. */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Sorts days Monday to Sunday and drops unknown values and duplicates.
 *
 * @param {string[]} days
 * @returns {string[]}
 */
export function sortDays(days) {
  return WEEKDAYS.filter((d) => (days || []).includes(d))
}

/**
 * Brings one stored block into the current shape.
 *
 * Blocks saved before A6 had a single `day` instead of `days`. They are
 * converted here, and the old key is removed so it cannot come back on the next
 * save. Blocks without a usable day are dropped: they could never be shown or
 * planned around.
 *
 * @param {object} block
 * @returns {object|null} null when the block is unusable
 */
export function normalizeBlock(block) {
  if (!block || typeof block !== 'object') return null
  const raw = Array.isArray(block.days) ? block.days : block.day ? [block.day] : []
  const days = sortDays(raw)
  if (days.length === 0) return null
  // Drop the legacy key by destructuring it away instead of deleting it.
  const { day: _legacy, ...rest } = block
  return { ...rest, days }
}

/**
 * Normalizes a whole list, dropping what cannot be used.
 *
 * @param {object[]} blocks
 * @returns {object[]}
 */
export function normalizeBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map(normalizeBlock).filter(Boolean)
}

/**
 * One entry per weekday, which is the shape the scheduler and the week grid want.
 *
 * A block for Monday to Thursday becomes four entries, each with its own `day`.
 *
 * @param {object[]} blocks
 * @returns {object[]} copies of the blocks, one per day
 */
export function expandBlocksByDay(blocks) {
  return normalizeBlocks(blocks).flatMap((b) => b.days.map((day) => ({ ...b, day })))
}

/**
 * Compact label for a set of days.
 *
 * Runs of three or more days become a range, shorter runs stay a list:
 * ['Mon','Tue','Wed','Thu'] -> 'Mo–Do', ['Mon','Wed'] -> 'Mo, Mi',
 * ['Mon','Tue','Wed','Fri'] -> 'Mo–Mi, Fr'. Two consecutive days stay a list
 * because "Mo–Di" reads worse than "Mo, Di".
 *
 * @param {string[]} days
 * @param {(code: string) => string} label - translated short day name
 * @returns {string}
 */
export function formatDays(days, label) {
  const sorted = sortDays(days)

  // Group consecutive days into runs first, then decide per run how to print it.
  const runs = []
  for (const d of sorted) {
    const idx = WEEKDAYS.indexOf(d)
    const last = runs[runs.length - 1]
    if (last && WEEKDAYS.indexOf(last[last.length - 1]) === idx - 1) last.push(d)
    else runs.push([d])
  }

  return runs
    .flatMap((run) => (run.length >= 3 ? [`${label(run[0])}–${label(run[run.length - 1])}`] : run.map(label)))
    .join(', ')
}

/**
 * True when the end time is after the start time.
 *
 * Both must look like 'HH:MM'; anything else counts as invalid, which is what
 * the settings form needs to reject a half-typed time.
 *
 * @param {string} startTime
 * @param {string} endTime
 * @returns {boolean}
 */
export function isValidTimeRange(startTime, endTime) {
  const toMin = (t) => {
    const match = String(t || '').match(/^(\d{1,2}):(\d{2})$/)
    return match ? Number(match[1]) * 60 + Number(match[2]) : NaN
  }
  // NaN comparisons are false, so a broken time never passes.
  return toMin(endTime) > toMin(startTime)
}
