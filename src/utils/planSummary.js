/**
 * Numbers for the plan screen: totals, a per-task summary, the sessions of one
 * week.
 *
 * Everything here works on the result of `generatePlan()`, which is recomputed
 * on every render and never stored. These helpers only count and group.
 *
 * Pure functions: the current time is a parameter, never read here.
 */

const DAY = 86400000

/**
 * First and last day of the week that `days` covers, as a half-open range.
 *
 * `end` is the day after the last one, so a session belongs to the week when
 * `start <= date < end`. That avoids an extra "is it the last day" check.
 *
 * @param {{ date: Date }[]} days - days from `getWeekDays()`
 * @returns {{ start: Date, end: Date }}
 */
export function weekRange(days) {
  const start = new Date(days[0].date)
  const end = new Date(days[days.length - 1].date)
  end.setDate(end.getDate() + 1) // exclusive
  return { start, end }
}

/**
 * The sessions that fall into the given week.
 *
 * @param {object[]} sessions - all sessions of the plan
 * @param {{ date: Date }[]} days - days of the week
 * @returns {object[]}
 */
export function sessionsInWeek(sessions, days) {
  const { start, end } = weekRange(days)
  return sessions.filter(s => s.date >= start && s.date < end)
}

/**
 * Totals for the whole plan.
 *
 * `tasks` counts distinct tasks, not sessions: one task may be split over
 * several sittings.
 *
 * @param {object} plan - result of generatePlan()
 * @returns {{ sessions: number, minutes: number, tasks: number, first: Date|null, last: Date|null }}
 */
export function summarizePlan(plan) {
  const sessions = plan?.sessions || []
  return {
    sessions: sessions.length,
    minutes: sessions.reduce((sum, s) => sum + (s.endMin - s.startMin), 0),
    tasks: new Set(sessions.map(s => s.taskId)).size,
    first: sessions.length ? sessions[0].date : null,
    last: sessions.length ? sessions[sessions.length - 1].date : null,
  }
}

/**
 * Per-task totals, keyed by task ID.
 *
 * A Map instead of a plain object because task IDs are arbitrary strings and a
 * Map cannot collide with keys like `constructor`.
 *
 * @param {object} plan
 * @returns {Map<string, { count: number, minutes: number, first: Date, last: Date }>}
 */
export function summarizeByTask(plan) {
  const map = new Map()
  for (const s of plan?.sessions || []) {
    const entry = map.get(s.taskId) || { count: 0, minutes: 0, first: s.date, last: s.date }
    entry.count++
    entry.minutes += s.endMin - s.startMin
    if (s.date < entry.first) entry.first = s.date
    if (s.date > entry.last) entry.last = s.date
    map.set(s.taskId, entry)
  }
  return map
}

/** 5 December 2026 -> "5.12." (Swiss and German short form). */
export function shortDate(date) {
  return `${date.getDate()}.${date.getMonth() + 1}.`
}

/**
 * Whole days between two dates, counted from midnight.
 *
 * Positive when `b` is later. `Math.round` absorbs the hour that a daylight
 * saving change adds or removes.
 */
export function daysBetween(a, b) {
  return Math.round((b - a) / DAY)
}
