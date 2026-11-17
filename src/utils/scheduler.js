/**
 * The planner: turns open tasks into concrete work sessions.
 *
 * It is deterministic and local. No AI, no network, no randomness: the same
 * tasks, the same busy blocks and the same day always produce the same plan.
 * That is what makes the plan trustworthy, and it is why the plan is never
 * stored but recomputed on every render.
 *
 * The plan covers a rolling horizon of 26 weeks instead of a single week, so a
 * deadline far out still gets its sessions spread sensibly.
 *
 * Pure functions: the current time is a parameter, never read here.
 */
import { expandBlocksByDay } from './availability.js'
import { pinsOf } from './pins.js'

export const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** The planning window of a day: 08:00 to 21:00. */
export const DAY_START_MIN = 8 * 60
export const DAY_END_MIN = 21 * 60

/** How far ahead the planner looks at most (26 weeks). */
export const PLANNING_HORIZON_DAYS = 182

/**
 * The planner rules (B8).
 *
 * Every value can be overridden through `options`. The UI exposes the two that
 * matter most to a user: the buffer before a deadline and the daily maximum.
 */
export const PLANNER_DEFAULTS = {
  /** A task should be finished this many days before its deadline. */
  bufferDays: 1,
  /** One work session is at most this long. */
  sessionMin: 90,
  /** At most this much of one task per day. */
  maxPerTaskPerDayMin: 180,
  /** At most this much planned work per day, over all tasks. */
  maxPerDayMin: 360,
  /** Used when a task has no estimate yet. */
  defaultEstimateMin: 60,
  /** Weekdays the planner may use (B11); the others stay free. */
  workDays: WORK_DAYS,
  /** How sessions are spread (B13): 'even' | 'early' | 'bundled'. */
  mode: 'even',
}

/** Sessions and free slots snap to this grid, so times stay readable. */
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

/** Stable key for a day, used as a Map key. Not ISO, to avoid a UTC shift. */
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`

/** JS weeks start on Sunday, the planner on Monday. */
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
 * The Monday-to-Sunday week around `today`, as `[{ label, date }]`.
 *
 * Independent of plan generation, so the week grid and the deadline markers can
 * be drawn without planning anything.
 *
 * @param {Date} today
 * @returns {{ label: string, date: Date }[]}
 */
export function getWeekDays(today = new Date()) {
  const todayStart = startOfDay(today)
  const jsDay = todayStart.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  const monday = addDays(todayStart, mondayOffset)
  return WORK_DAYS.map((label, i) => ({ label, date: addDays(monday, i) }))
}

/**
 * First free slot of `durationMin` inside the working day.
 *
 * `busyIntervals` are [start, end] pairs in minutes after midnight. They are
 * sorted first, then the cursor walks past each one. `earliestMin` lets today
 * start at the current time instead of at the start of the day.
 *
 * @returns {[number, number]|null} the slot, or null when nothing fits
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
 * Splits a total into sessions of at most `sessionMin`, as evenly as the
 * 30-minute grid allows.
 *
 * 120 becomes 60 + 60, 150 becomes 90 + 60, 720 becomes 8 × 90. Even sizes are
 * deliberate: four 45-minute sittings are easier to start than one 3-hour block.
 *
 * @param {number} minutes
 * @param {number} sessionMin
 * @returns {number[]} session lengths, summing to the rounded total
 */
export function splitIntoSessions(minutes, sessionMin = PLANNER_DEFAULTS.sessionMin) {
  const total = roundUp(minutes)
  if (total <= 0) return []

  const count = Math.ceil(total / sessionMin)
  const size = Math.min(sessionMin, roundUp(total / count))
  const sizes = Array(count - 1).fill(size)
  // The last session takes the remainder, so the sum is exact.
  sizes.push(total - size * (count - 1))
  return sizes.filter(s => s > 0)
}

/**
 * Day offsets around a target, nearest first, earlier before later:
 * 0, -1, 1, -2, 2, ...
 *
 * Earlier before later is deliberate: finishing before the deadline is always
 * better than after it.
 */
function* nearestOffsets(max) {
  yield 0
  for (let i = 1; i <= max; i++) {
    yield -i
    yield i
  }
}

/**
 * Builds the plan.
 *
 * For every open task with a deadline, most urgent first and then by priority:
 * - the time still to do (`remainingMin`, or the default estimate) is split into
 *   sessions of at most 90 minutes,
 * - the task should be done `bufferDays` before its deadline,
 * - sessions are spread over the days from today to that date, each one on the
 *   free day nearest to its target, with at most 3 h of a task and 6 h in total
 *   per day, around the busy blocks, and today only from now on,
 * - `mode` decides where in that range: 'even' spreads them evenly, 'early'
 *   starts as soon as possible, 'bundled' packs them into few, fuller days,
 * - only `workDays` are used; a free weekday stays empty, and a deadline on one
 *   is still shown while the work moves to the days before,
 * - sessions the user pinned (`task.pinned`, B12) are placed first and count
 *   towards the task's time; only the rest is planned around them,
 * - overdue tasks are placed as early as possible,
 * - what does not fit is reported as a shortfall, never squeezed in silently.
 *
 * @param {object[]} enrichedTasks - from `useTaskEnrichment`
 * @param {(task: object) => { estimateMin: number|null, remainingMin: number|null, priority: string }} getPlanningFor
 * @param {object[]} availabilityBlocks - `{ days, startTime, endTime }`
 * @param {Date} today
 * @param {Partial<typeof PLANNER_DEFAULTS>} options
 * @returns {{ days: object[], sessions: object[], shortfalls: object[], horizonEnd: Date }}
 */
export function generatePlan(enrichedTasks, getPlanningFor, availabilityBlocks, today = new Date(), options = {}) {
  const rules = { ...PLANNER_DEFAULTS, ...options }
  const todayStart = startOfDay(today)
  const nowMin = today.getHours() * 60 + today.getMinutes()
  const todayEarliest = roundUp(nowMin)

  // Busy blocks are stored per weekday. They are copied per date the first time
  // that date is used, because planning adds sessions to the list as it goes.
  const weekly = Object.fromEntries(WORK_DAYS.map(d => [d, []]))
  for (const block of expandBlocksByDay(availabilityBlocks)) {
    if (weekly[block.day]) weekly[block.day].push([toMinutes(block.startTime), toMinutes(block.endTime)])
  }

  const busy = new Map()
  const busyOf = (date) => {
    const key = dayKey(date)
    if (!busy.has(key)) busy.set(key, weekly[weekdayLabel(date)].map(interval => [...interval]))
    return busy.get(key)
  }

  const plannedPerDay = new Map()
  const taskPerDay = new Map()

  const sessions = []
  const pinnedMin = new Map()

  const parseISO = (iso) => {
    const [y, m, d] = iso.split('-').map(Number)
    return new Date(y, m - 1, d)
  }

  // Pinned sessions first (B12): fixed slots the user chose. They reserve their
  // time before anything is planned, and a pin may exceed the daily limits
  // because the user decided so.
  for (const task of enrichedTasks) {
    if (task.status === 'done') continue

    for (const pin of pinsOf(task)) {
      const date = parseISO(pin.date)
      // A pin that already ended is history, not a plan.
      if (date < todayStart || (date.getTime() === todayStart.getTime() && pin.endMin <= nowMin)) continue

      const key = dayKey(date)
      const length = pin.endMin - pin.startMin
      busyOf(date).push([pin.startMin, pin.endMin])
      plannedPerDay.set(key, (plannedPerDay.get(key) || 0) + length)
      taskPerDay.set(`${task._id}|${key}`, (taskPerDay.get(`${task._id}|${key}`) || 0) + length)
      pinnedMin.set(task._id, (pinnedMin.get(task._id) || 0) + length)

      sessions.push({
        taskId: task._id,
        title: task._title || 'Aufgabe',
        area: task._area || task.area || 'study',
        day: weekdayLabel(date),
        date,
        startMin: pin.startMin,
        endMin: pin.endMin,
        startTime: toTimeLabel(pin.startMin),
        endTime: toTimeLabel(pin.endMin),
        pinned: true,
        pinId: pin.id,
      })
    }
  }

  const eligible = enrichedTasks
    .filter(t => t._deadlineDate && t.status !== 'done')
    .map((task) => {
      const planning = getPlanningFor(task)
      const remaining = planning.remainingMin ?? planning.estimateMin ?? null
      return { task, planning, remaining, defaultEstimate: remaining === null }
    })
    .filter(e => e.remaining === null || e.remaining > 0)
    .map((e) => {
      // Pinned time already counts towards the task, so only the rest is planned.
      const needed = roundUp(e.remaining ?? rules.defaultEstimateMin) - (pinnedMin.get(e.task._id) || 0)
      const deadline = startOfDay(e.task._deadlineDate)
      const overdue = deadline < todayStart

      let last = overdue ? addDays(todayStart, 6) : addDays(deadline, -rules.bufferDays)
      // No room for the buffer: use the deadline itself, or today when it is past.
      if (last < todayStart) last = deadline >= todayStart ? deadline : todayStart

      const horizon = addDays(todayStart, PLANNING_HORIZON_DAYS)
      if (last > horizon) last = horizon

      return { ...e, needed, deadline, overdue, last }
    })
    .filter(e => e.needed > 0)
    .sort((a, b) =>
      a.last - b.last ||
      PRIORITY_RANK[a.planning.priority] - PRIORITY_RANK[b.planning.priority] ||
      String(a.task._title).localeCompare(String(b.task._title), 'de-CH'))

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

    // How many sessions of one task fit into a day, and how many days that needs.
    const perDay = Math.max(1, Math.floor(rules.maxPerTaskPerDayMin / rules.sessionMin))
    const bundleDays = Math.ceil(sizes.length / perDay)

    // Target day index for session i, depending on the spread mode.
    const targetOf = (i) => {
      if (overdue || rules.mode === 'early') return 0
      if (rules.mode === 'bundled') return Math.floor((Math.floor(i / perDay) * dayCount) / bundleDays)
      return Math.floor((i * dayCount) / sizes.length)
    }

    const pieces = sizes.map((minutes, i) => ({ minutes, target: targetOf(i) }))

    let placedMin = 0

    for (let p = 0; p < pieces.length; p++) {
      const piece = pieces[p]
      let placed = false

      // Try the full length first. When nothing fits anywhere, a shorter piece
      // (60, then 30) is tried instead, so a tight week still gets some work done.
      const lengths = [piece.minutes, 60, 30]
        .filter((l, i, all) => l <= piece.minutes && all.indexOf(l) === i)

      for (const length of lengths) {
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

          // A shortened piece leaves a remainder, which is tried again at the
          // same target on the next pass.
          if (length < piece.minutes) {
            pieces.splice(p + 1, 0, { minutes: piece.minutes - length, target: piece.target })
          }
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

  // Chronological order, then "n of m" per task for the calendar entries and labels.
  sessions.sort((a, b) => a.date - b.date || a.startMin - b.startMin)

  const totals = new Map()
  for (const session of sessions) totals.set(session.taskId, (totals.get(session.taskId) || 0) + 1)

  const counter = new Map()
  for (const session of sessions) {
    session.n = (counter.get(session.taskId) || 0) + 1
    counter.set(session.taskId, session.n)
    session.of = totals.get(session.taskId)
  }

  return { days: getWeekDays(today), sessions, shortfalls, horizonEnd }
}
