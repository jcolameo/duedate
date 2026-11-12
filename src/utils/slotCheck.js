import { expandBlocksByDay } from './availability.js'
import { WORK_DAYS, DAY_START_MIN, DAY_END_MIN } from './scheduler.js'
import { dateToISO } from './pins.js'

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}
const overlaps = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && bStart < aEnd

/**
 * Checks a target slot for a session.
 * - `reject`: 'past' | 'outside' — the move is not allowed
 * - `warnings`: 'busy' | 'overlap' | 'afterDeadline' | 'dayLimit' — allowed, but the user is told
 *
 * @param {{ date: Date, startMin: number, endMin: number }} slot
 * @param {{ now?: Date, deadline?: Date|null, blocks?: Array, sessions?: Array,
 *           ignore?: (s) => boolean, maxPerDayMin?: number }} context
 *   `sessions` = the current plan's sessions; only pinned ones count as an
 *   overlap (the planner moves the others out of the way).
 */
export function checkSlot(slot, { now = new Date(), deadline = null, blocks = [], sessions = [], ignore = () => false, maxPerDayMin = 360 } = {}) {
  const { date, startMin, endMin } = slot
  if (startMin < DAY_START_MIN || endMin > DAY_END_MIN) return { reject: 'outside', warnings: [] }

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (dayStart < todayStart || (dayStart.getTime() === todayStart.getTime() && startMin < now.getHours() * 60 + now.getMinutes())) {
    return { reject: 'past', warnings: [] }
  }

  const warnings = []
  const weekday = WORK_DAYS[(date.getDay() + 6) % 7]
  if (expandBlocksByDay(blocks).some(b => b.day === weekday && overlaps(startMin, endMin, toMin(b.startTime), toMin(b.endTime)))) {
    warnings.push('busy')
  }
  const sameDay = sessions.filter(s => !ignore(s) && dateToISO(s.date) === dateToISO(date))
  if (sameDay.some(s => s.pinned && overlaps(startMin, endMin, s.startMin, s.endMin))) warnings.push('overlap')
  if (deadline && dayStart > new Date(deadline.getFullYear(), deadline.getMonth(), deadline.getDate())) warnings.push('afterDeadline')
  const planned = sameDay.reduce((sum, s) => sum + (s.endMin - s.startMin), 0)
  if (planned + (endMin - startMin) > maxPerDayMin) warnings.push('dayLimit')
  return { reject: null, warnings }
}
