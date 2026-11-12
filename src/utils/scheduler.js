import { expandBlocksByDay } from './availability.js'

export const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_START_MIN = 8 * 60   // 08:00
export const DAY_END_MIN = 21 * 60    // 21:00

/** How far ahead the planner looks at most (26 weeks). */
export const PLANNING_HORIZON_DAYS = 182

/**
 * Planner rules (B8). All of them can be overridden through `options`, the
 * UI exposes the two that matter most (buffer, daily maximum).
 */
export const PLANNER_DEFAULTS = {
  /** A task should be finished this many days before its deadline */
  bufferDays: 1,
  /** One work session is at most this long */
  sessionMin: 90,
  /** At most this much of one task per day */
  maxPerTaskPerDayMin: 180,
  /** At most this much planned work per day, over all tasks */
  maxPerDayMin: 360,
  /** Used when a task has no estimate yet */
  defaultEstimateMin: 60,
  /** Weekdays the planner may use (B11); the others stay free */
  workDays: WORK_DAYS,
}

const SLOT_MINUTES = 30
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
const weekdayLabel = (d) => WORK_DAYS[(d.getDay() + 6) % 7]
const roundUp = (min) => Math.ceil(min / SLOT_MINUTES) * SLOT_MINUTES

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

function toTimeLabel(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * The Mon–Sun week around `today` as [{label, date}], independent of plan
 * generation — used to render a week's grid and deadline markers.
 */
export function getWeekDays(today = new Date()) {
  const todayStart = startOfDay(today)
  const jsDay = todayStart.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  const monday = addDays(todayStart, mondayOffset)
  return WORK_DAYS.map((label, i) => ({ label, date: addDays(monday, i) }))
}

/**
 * First free slot of `durationMin` in the working day, around the busy
 * intervals [start, end] (minutes from midnight). `earliestMin` lets today
 * start at the current time instead of the start of the day.
 */
function findFreeSlot(durationMin, busyIntervals, earliestMin, dayStart, dayEnd) {
  const sorted = [...busyIntervals].sort((a, b) => a[0] - b[0])
  let cursor = Math.max(dayStart, earliestMin)
  for (const [busyStart, busyEnd] of sorted) {
    if (busyStart - cursor >= durationMin) return [cursor, cursor + durationMin]
    cursor = Math.max(cursor, busyEnd)
  }
  return dayEnd - cursor >= durationMin ? [cursor, cursor + durationMin] : null
}

/**
 * Splits `minutes` into sessions of at most `sessionMin`, as even as the
 * 30-minute grid allows: 120 -> 60 + 60, 150 -> 90 + 60, 720 -> 8 × 90.
 */
export function splitIntoSessions(minutes, sessionMin = PLANNER_DEFAULTS.sessionMin) {
  const total = roundUp(minutes)
  if (total <= 0) return []
  const count = Math.ceil(total / sessionMin)
  const size = Math.min(sessionMin, roundUp(total / count))
  const sizes = Array(count - 1).fill(size)
  sizes.push(total - size * (count - 1))
  return sizes.filter(s => s > 0)
}

/** Day offsets to try around a target, nearest first, earlier before later: 0, -1, 1, -2, 2 … */
function* nearestOffsets(max) {
  yield 0
  for (let i = 1; i <= max; i++) {
    yield -i
    yield i
  }
}

/**
 * Deterministic, local-only planner (no AI, no network): same input, same
 * plan. Rolling horizon instead of a single week.
 *
 * For every open task with a deadline (most urgent first, then priority):
 * - the time still to do (`remainingMin`, or the default estimate) is split
 *   into sessions of at most 90 min
 * - the task should be done `bufferDays` before its deadline
 * - sessions are spread evenly over the days from today to that date, each
 *   one on the free day nearest to its target; at most 3 h of a task and
 *   6 h in total per day; busy blocks (availability) are respected; today
 *   only uses the time from now on
 * - only `workDays` are used; free weekdays stay empty (deadlines on them
 *   are still shown, the work moves to the days before)
 * - overdue tasks are placed as early as possible
 * - what does not fit is reported as a shortfall, never squeezed in silently
 *
 * @param {Array} enrichedTasks - from useTaskEnrichment
 * @param {(task) => {estimateMin: number|null, remainingMin: number|null, priority: string}} getPlanningFor
 * @param {Array<{days: string[], startTime: string, endTime: string}>} availabilityBlocks
 * @param {Date} today
 * @param {Partial<typeof PLANNER_DEFAULTS>} options
 * @returns {{ days, sessions, shortfalls, horizonEnd }}
 */
export function generatePlan(enrichedTasks, getPlanningFor, availabilityBlocks, today = new Date(), options = {}) {
  const rules = { ...PLANNER_DEFAULTS, ...options }
  const todayStart = startOfDay(today)
  const nowMin = today.getHours() * 60 + today.getMinutes()
  const todayEarliest = roundUp(nowMin)

  // Weekly busy blocks by weekday; copied per date the first time it is used
  const weekly = Object.fromEntries(WORK_DAYS.map(d => [d, []]))
  for (const block of expandBlocksByDay(availabilityBlocks)) {
    if (weekly[block.day]) weekly[block.day].push([toMinutes(block.startTime), toMinutes(block.endTime)])
  }
  const busy = new Map()
  const busyOf = (date) => {
    const key = dayKey(date)
    if (!busy.has(key)) busy.set(key, weekly[weekdayLabel(date)].map(i => [...i]))
    return busy.get(key)
  }
  const plannedPerDay = new Map()
  const taskPerDay = new Map()

  const eligible = enrichedTasks
    .filter(t => t._deadlineDate && t.status !== 'done')
    .map((task) => {
      const planning = getPlanningFor(task)
      const remaining = planning.remainingMin ?? planning.estimateMin ?? null
      return { task, planning, remaining, defaultEstimate: remaining === null }
    })
    .filter(e => e.remaining === null || e.remaining > 0)
    .map((e) => {
      const needed = e.remaining ?? rules.defaultEstimateMin
      const deadline = startOfDay(e.task._deadlineDate)
      const overdue = deadline < todayStart
      let last = overdue ? addDays(todayStart, 6) : addDays(deadline, -rules.bufferDays)
      if (last < todayStart) last = deadline >= todayStart ? deadline : todayStart // no room for a buffer
      const horizon = addDays(todayStart, PLANNING_HORIZON_DAYS)
      if (last > horizon) last = horizon
      return { ...e, needed: roundUp(needed), deadline, overdue, last }
    })
    .sort((a, b) =>
      a.last - b.last ||
      PRIORITY_RANK[a.planning.priority] - PRIORITY_RANK[b.planning.priority] ||
      String(a.task._title).localeCompare(String(b.task._title), 'de-CH'))

  const sessions = []
  const shortfalls = []
  let horizonEnd = todayStart

  for (const entry of eligible) {
    const { task, needed, last, overdue } = entry
    const span = Math.round((last - todayStart) / 86400000) + 1
    const days = Array.from({ length: span }, (_, i) => addDays(todayStart, i))
      .filter(d => rules.workDays.includes(weekdayLabel(d)))
    const dayCount = days.length
    if (last > horizonEnd) horizonEnd = last

    const sizes = splitIntoSessions(needed, rules.sessionMin)
    // Even spread over the available days; overdue tasks go as early as possible
    const pieces = sizes.map((minutes, i) => ({ minutes, target: overdue ? 0 : Math.floor((i * dayCount) / sizes.length) }))

    let placedMin = 0
    for (let p = 0; p < pieces.length; p++) {
      const piece = pieces[p]
      let placed = false
      // Try the full length first; if nothing fits anywhere, a shorter piece (60, then 30)
      for (const length of [piece.minutes, 60, 30].filter((l, i, all) => l <= piece.minutes && all.indexOf(l) === i)) {
        for (const offset of nearestOffsets(dayCount)) {
          const index = piece.target + offset
          if (index < 0 || index >= dayCount) continue
          const date = days[index]
          const key = dayKey(date)
          if ((plannedPerDay.get(key) || 0) + length > rules.maxPerDayMin) continue
          if ((taskPerDay.get(`${task._id}|${key}`) || 0) + length > rules.maxPerTaskPerDayMin) continue
          const earliest = key === dayKey(todayStart) ? todayEarliest : 0
          const slot = findFreeSlot(length, busyOf(date), earliest, DAY_START_MIN, DAY_END_MIN)
          if (!slot) continue
          busyOf(date).push(slot)
          plannedPerDay.set(key, (plannedPerDay.get(key) || 0) + length)
          taskPerDay.set(`${task._id}|${key}`, (taskPerDay.get(`${task._id}|${key}`) || 0) + length)
          sessions.push({
            taskId: task._id,
            title: task._title || 'Aufgabe',
            area: task._area || task.area || 'study',
            day: weekdayLabel(date),
            date,
            startMin: slot[0],
            endMin: slot[1],
            startTime: toTimeLabel(slot[0]),
            endTime: toTimeLabel(slot[1]),
          })
          placedMin += length
          placed = true
          // The rest of a shortened piece is tried again at the same target
          if (length < piece.minutes) pieces.splice(p + 1, 0, { minutes: piece.minutes - length, target: piece.target })
          break
        }
        if (placed) break
      }
    }

    if (placedMin < needed) {
      shortfalls.push({
        taskId: task._id,
        title: task._title || 'Aufgabe',
        missingMin: needed - placedMin,
        plannedMin: placedMin,
        neededMin: needed,
        deadline: entry.deadline,
        overdue,
        defaultEstimate: entry.defaultEstimate,
      })
    }
  }

  // Chronological order; "n of m" per task for calendar entries and labels
  sessions.sort((a, b) => a.date - b.date || a.startMin - b.startMin)
  const totals = new Map()
  for (const s of sessions) totals.set(s.taskId, (totals.get(s.taskId) || 0) + 1)
  const counter = new Map()
  for (const s of sessions) {
    s.n = (counter.get(s.taskId) || 0) + 1
    counter.set(s.taskId, s.n)
    s.of = totals.get(s.taskId)
  }

  return { days: getWeekDays(today), sessions, shortfalls, horizonEnd }
}
