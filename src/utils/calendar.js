/**
 * Calendar arithmetic for the Day, Week, Month and Year views (B9/B10).
 *
 * Navigation, the month grid, the per-day lookup and the keyboard movement all
 * live here, so the views stay free of date maths.
 *
 * Every function works on local dates and returns a new Date; nothing is
 * mutated. Weeks start on Monday, as in Switzerland.
 *
 * Pure functions: no storage, no clock, no Vue.
 */
import { toISODate } from './taskModel.js'

export const CALENDAR_VIEWS = ['day', 'week', 'month', 'year']

/** Copy of the date at 00:00 local time. */
export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/** `n` days later (negative goes back), at midnight. */
export function addDays(date, n) {
  const d = startOfDay(date)
  d.setDate(d.getDate() + n)
  return d
}

/**
 * `n` months later, keeping the day of month when the target month is long enough.
 *
 * 31 January plus one month becomes 28 or 29 February, not 3 March. The day is
 * clamped to the last day of the target month, which is what a user expects
 * when paging through months.
 */
export function addMonths(date, n) {
  const d = startOfDay(date)
  const day = d.getDate()
  // Move to the 1st first: setting the month on the 31st would already overflow.
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
  // getDay() is 0 for Sunday, so Sunday belongs to the week that started six days earlier.
  return addDays(d, d.getDay() === 0 ? -6 : 1 - d.getDay())
}

/**
 * Moves the anchor one step in the given view.
 *
 * @param {'day'|'week'|'month'|'year'} view
 * @param {Date} anchor
 * @param {-1|1} step
 * @returns {Date}
 */
export function shiftAnchor(view, anchor, step) {
  if (view === 'day') return addDays(anchor, step)
  if (view === 'week') return addDays(anchor, 7 * step)
  if (view === 'month') return addMonths(anchor, step)
  return addMonths(anchor, 12 * step)
}

/**
 * The grid shown for a month: always 6 rows of 7 days.
 *
 * The fixed height keeps the layout from jumping when the user pages between a
 * short and a long month. Days outside the month are included so every row is
 * full; `inMonth` tells the view whether to dim them.
 *
 * @param {Date} anchor - any date inside the month
 * @returns {{ date: Date, inMonth: boolean }[][]} six rows of seven cells
 */
export function monthGrid(anchor) {
  const year = anchor.getFullYear()
  const month = anchor.getMonth()
  const first = startOfWeek(new Date(year, month, 1))
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(first, week * 7 + day)
      return { date, inMonth: date.getMonth() === month }
    }),
  )
}

/**
 * The same grid without the empty rows, for the small months of the year view.
 *
 * @param {number} year
 * @param {number} month - 0-based
 * @returns {{ date: Date, inMonth: boolean }[][]} four to six rows
 */
export function compactMonthGrid(year, month) {
  const weeks = monthGrid(new Date(year, month, 1))
  return weeks.filter(week => week.some(cell => cell.inMonth))
}

/**
 * Everything that happens on each day, looked up by ISO date.
 *
 * Open tasks with a deadline land in `deadlines`, planned sessions in
 * `sessions`. The minutes are summed per day and per area, which is what the
 * heat marks and the area dots read.
 *
 * @param {object[]} tasks - enriched tasks
 * @param {object[]} sessions - sessions of the plan
 * @returns {Map<string, { deadlines: object[], sessions: object[], minutes: number,
 *   areaMinutes: Record<string, number> }>}
 */
export function buildDayMap(tasks, sessions) {
  const map = new Map()
  const entry = (key) => {
    if (!map.has(key)) map.set(key, { deadlines: [], sessions: [], minutes: 0, areaMinutes: {} })
    return map.get(key)
  }

  for (const task of tasks) {
    if (task._deadlineDate && !task._isDone) entry(toISODate(task._deadlineDate)).deadlines.push(task)
  }

  for (const session of sessions) {
    const day = entry(toISODate(session.date))
    const length = session.endMin - session.startMin
    const area = session.area || 'study'
    day.sessions.push(session)
    day.minutes += length
    day.areaMinutes[area] = (day.areaMinutes[area] || 0) + length
  }

  return map
}

/**
 * The area with the most planned minutes on a day, or null for an empty day.
 *
 * Ties go to the earlier area in the fixed order study, freelance, personal, so
 * the dot does not flicker between two equal areas.
 *
 * @param {Record<string, number>} areaMinutes
 * @returns {string|null}
 */
export function dominantArea(areaMinutes) {
  let best = null
  for (const area of ['study', 'freelance', 'personal']) {
    if (areaMinutes?.[area] > (best ? areaMinutes[best] : 0)) best = area
  }
  return best
}

/**
 * The distinct areas of a set of deadline tasks, in the fixed order.
 *
 * Used for the dots and chips of a day cell.
 *
 * @param {object[]} tasks
 * @returns {string[]}
 */
export function deadlineAreas(tasks) {
  const present = new Set(tasks.map(t => t._area || 'study'))
  return ['study', 'freelance', 'personal'].filter(a => present.has(a))
}

/**
 * How busy a day is, for the heat marks of the year view.
 *
 * @param {number} minutes
 * @returns {0|1|2|3} 0 none, 1 light, 2 medium, 3 heavy
 */
export function loadLevel(minutes) {
  if (!minutes) return 0
  if (minutes <= 90) return 1
  if (minutes <= 240) return 2
  return 3
}

/**
 * Title of the shown period.
 *
 * Examples: "Donnerstag, 12. November 2026", "9.–15. November 2026",
 * "November 2026", "2026". The week uses `formatRange`, which collapses the
 * parts both ends share.
 *
 * @param {'day'|'week'|'month'|'year'} view
 * @param {Date} anchor
 * @param {string} locale
 * @returns {string}
 */
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
 * Moves the focused day with the keyboard in a month or year grid.
 *
 * Arrows move by day or week, Home and End jump to the start and end of the
 * week, PageUp and PageDown change the month.
 *
 * @param {Date} date
 * @param {string} key - the `event.key` value
 * @returns {Date|null} null when the key does nothing, so the caller can let it through
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
