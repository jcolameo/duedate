/**
 * Calendar helpers (B9/B10): navigation, month grid, per-day lookup and
 * keyboard movement for the Day / Week / Month / Year views.
 * Pure functions on local dates (Monday is the first day of the week).
 */
import { toISODate } from './taskModel.js'

export const CALENDAR_VIEWS = ['day', 'week', 'month', 'year']

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, n) {
  const d = startOfDay(date)
  d.setDate(d.getDate() + n)
  return d
}

/** Adds months and keeps the day of month when possible (31 Jan + 1 month = 28/29 Feb). */
export function addMonths(date, n) {
  const d = startOfDay(date)
  const day = d.getDate()
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(day, lastDay))
  return d
}

export const isSameDay = (a, b) => toISODate(a) === toISODate(b)

/** Monday of the week that contains `date`. */
export function startOfWeek(date) {
  const d = startOfDay(date)
  return addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay())
}

/** Previous/next day, week, month or year; `step` is -1 or 1. */
export function shiftAnchor(view, anchor, step) {
  if (view === 'day') return addDays(anchor, step)
  if (view === 'week') return addDays(anchor, 7 * step)
  if (view === 'month') return addMonths(anchor, step)
  return addMonths(anchor, 12 * step)
}

/**
 * The weeks shown for a month: always 6 rows of 7 days, so the height does not
 * jump between months. Each cell: { date, inMonth }.
 */
export function monthGrid(anchor) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const first = startOfWeek(new Date(year, month, 1))
  return Array.from({ length: 6 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const date = addDays(first, w * 7 + d)
      return { date, inMonth: date.getMonth() === month }
    }),
  )
}

/** Same grid without the 6-row padding (4–6 rows), for the small months of the year view. */
export function compactMonthGrid(year, month) {
  const weeks = monthGrid(new Date(year, month, 1))
  return weeks.filter(week => week.some(cell => cell.inMonth))
}

/**
 * Open tasks with a deadline and planned sessions, looked up by day:
 * Map 'YYYY-MM-DD' -> { deadlines: task[], sessions: session[], minutes }
 */
export function buildDayMap(tasks, sessions) {
  const map = new Map()
  const entry = (key) => {
    if (!map.has(key)) map.set(key, { deadlines: [], sessions: [], minutes: 0 })
    return map.get(key)
  }
  for (const task of tasks) {
    if (task._deadlineDate && !task._isDone) entry(toISODate(task._deadlineDate)).deadlines.push(task)
  }
  for (const s of sessions) {
    const e = entry(toISODate(s.date))
    e.sessions.push(s)
    e.minutes += s.endMin - s.startMin
  }
  return map
}

/** How busy a day is, for the heat marks of the year view: 0 none, 1 light, 2 medium, 3 heavy. */
export function loadLevel(minutes) {
  if (!minutes) return 0
  if (minutes <= 90) return 1
  if (minutes <= 240) return 2
  return 3
}

/** Title of the shown period: "Donnerstag, 12. November 2026", "9.–15. November 2026", "November 2026", "2026". */
export function rangeLabel(view, anchor, locale = 'de-CH') {
  if (view === 'day') {
    return anchor.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }
  if (view === 'week') {
    const first = startOfWeek(anchor)
    const format = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
    return format.formatRange(first, addDays(first, 6))
  }
  if (view === 'month') return anchor.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
  return String(anchor.getFullYear())
}

/**
 * Keyboard movement in a month or year grid: arrows = day/week, Home/End =
 * start/end of the week, PageUp/PageDown = month. Returns the new date or null
 * when the key does nothing.
 */
export function moveByKey(date, key) {
  switch (key) {
    case 'ArrowLeft': return addDays(date, -1)
    case 'ArrowRight': return addDays(date, 1)
    case 'ArrowUp': return addDays(date, -7)
    case 'ArrowDown': return addDays(date, 7)
    case 'Home': return startOfWeek(date)
    case 'End': return addDays(startOfWeek(date), 6)
    case 'PageUp': return addMonths(date, -1)
    case 'PageDown': return addMonths(date, 1)
    default: return null
  }
}
