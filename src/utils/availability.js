/**
 * Pure helpers for recurring busy blocks ("Arbeit, Mo–Do, 08:00–17:00").
 * A block: { id, label, days: ['Mon', …], startTime: 'HH:MM', endTime: 'HH:MM' }
 */

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Sorts days Mon→Sun and drops unknown values and duplicates. */
export function sortDays(days) {
  return WEEKDAYS.filter((d) => (days || []).includes(d))
}

/**
 * Migration: blocks saved before A6 had a single `day`. Converts them to
 * `days: [day]` and cleans up the list; already migrated blocks pass through.
 * Blocks without any valid day are dropped (they could never be shown).
 */
export function normalizeBlock(block) {
  if (!block || typeof block !== 'object') return null
  const raw = Array.isArray(block.days) ? block.days : block.day ? [block.day] : []
  const days = sortDays(raw)
  if (days.length === 0) return null
  const { day: _legacy, ...rest } = block
  return { ...rest, days }
}

export function normalizeBlocks(blocks) {
  return (Array.isArray(blocks) ? blocks : []).map(normalizeBlock).filter(Boolean)
}

/**
 * One entry per weekday, as the scheduler and the week grid need it:
 * { ...block, day } for every day of the block.
 */
export function expandBlocksByDay(blocks) {
  return normalizeBlocks(blocks).flatMap((b) => b.days.map((day) => ({ ...b, day })))
}

/**
 * Compact label: consecutive days become a range, others are listed.
 * ['Mon','Tue','Wed','Thu'] -> 'Mo–Do', ['Mon','Wed'] -> 'Mo, Mi',
 * ['Mon','Tue','Wed','Fri'] -> 'Mo–Mi, Fr'. Two consecutive days stay a list.
 * @param {string[]} days
 * @param {(code: string) => string} label - translated short day name
 */
export function formatDays(days, label) {
  const sorted = sortDays(days)
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

/** 'HH:MM' -> minutes; true if end is after start. */
export function isValidTimeRange(startTime, endTime) {
  const toMin = (t) => {
    const m = String(t || '').match(/^(\d{1,2}):(\d{2})$/)
    return m ? Number(m[1]) * 60 + Number(m[2]) : NaN
  }
  return toMin(endTime) > toMin(startTime)
}
