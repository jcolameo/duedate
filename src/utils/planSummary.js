/**
 * Numbers for the plan UI: totals, per-task summary, sessions of one week.
 * Pure functions over the result of generatePlan().
 */

const DAY = 86400000

export function weekRange(days) {
  const start = new Date(days[0].date)
  const end = new Date(days[days.length - 1].date)
  end.setDate(end.getDate() + 1) // exclusive
  return { start, end }
}

/** Sessions whose date lies in the given week (days from getWeekDays). */
export function sessionsInWeek(sessions, days) {
  const { start, end } = weekRange(days)
  return sessions.filter(s => s.date >= start && s.date < end)
}

/** Whole-plan totals: { sessions, minutes, tasks, first, last } (dates or null). */
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

/** Per task: { count, minutes, first, last }, in a Map keyed by task ID. */
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

/** 5 Dec 2026 -> "5.12." */
export function shortDate(date) {
  return `${date.getDate()}.${date.getMonth() + 1}.`
}

/** Whole days between two dates at midnight (positive when `b` is later). */
export function daysBetween(a, b) {
  return Math.round((b - a) / DAY)
}
