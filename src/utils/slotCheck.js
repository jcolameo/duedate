/**
 * Checks whether a session may be moved to a given slot.
 *
 * Used by the calendar when the user drags a planned session. Two different
 * answers come back: a `reject` stops the move, a `warnings` entry lets it
 * happen but tells the user what is odd about the slot.
 *
 * Pure function: the current time is a parameter, never read here.
 */
import { expandBlocksByDay } from './availability.js'
import { WORK_DAYS, DAY_START_MIN, DAY_END_MIN } from './scheduler.js'
import { dateToISO } from './pins.js'

/** '09:30' to 570. Missing or broken input becomes midnight. */
const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd

/**
 * Checks a target slot for a session.
 *
 * - `reject`: 'past' | 'outside' — the move is not allowed
 * - `warnings`: 'busy' | 'overlap' | 'afterDeadline' | 'dayLimit' — allowed, but
 *   the user is told
 *
 * @param {{ date: Date, startMin: number, endMin: number }} slot
 * @param {object} context
 * @param {Date} [context.now] - current time, for the "past" check
 * @param {Date|null} [context.deadline] - deadline of the task being moved
 * @param {Array} [context.blocks] - the user's blocked times
 * @param {Array} [context.sessions] - sessions of the current plan; only pinned
 *   ones count as an overlap, because the planner moves the others aside
 * @param {(session: object) => boolean} [context.ignore] - sessions to skip,
 *   usually the one being moved
 * @param {number} [context.maxPerDayMin] - daily planning limit
 * @returns {{ reject: string|null, warnings: string[] }}
 */
export function checkSlot(slot, { now = new Date(), deadline = null, blocks = [], sessions = [], ignore = () => false, maxPerDayMin = 360 } = {}) {
  const { date, startMin, endMin } = slot

  // Outside the planning window the planner would never place a session there.
  if (startMin < DAY_START_MIN || endMin > DAY_END_MIN) return { reject: 'outside', warnings: [] }

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const isToday = dayStart.getTime() === todayStart.getTime()
  const nowMin = now.getHours() * 60 + now.getMinutes()
  if (dayStart < todayStart || (isToday && startMin < nowMin)) {
    return { reject: 'past', warnings: [] }
  }

  const warnings = []

  // Blocked times are stored per weekday, so the day has to be looked up first.
  const weekday = WORK_DAYS[(date.getDay() + 6) % 7] // JS starts on Sunday, the app on Monday
  const blockedToday = expandBlocksByDay(blocks).filter(b => b.day === weekday)
  if (blockedToday.some(b => overlaps(startMin, endMin, toMin(b.startTime), toMin(b.endTime)))) {
    warnings.push('busy')
  }

  const sameDay = sessions.filter(s => !ignore(s) && dateToISO(s.date) === dateToISO(date))
  if (sameDay.some(s => s.pinned && overlaps(startMin, endMin, s.startMin, s.endMin))) warnings.push('overlap')

  if (deadline && dayStart > new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())) {
    warnings.push('afterDeadline')
  }

  const planned = sameDay.reduce((sum, s) => sum + (s.endMin - s.startMin), 0)
  if (planned + (endMin - startMin) > maxPerDayMin) warnings.push('dayLimit')

  return { reject: null, warnings }
}
