/**
 * Pinned work sessions (B12).
 *
 * The planner normally decides when a session happens. When the user drags one
 * to another slot, that decision is stored on the task as
 * `pinned: [{ id, date, startMin, endMin }]`. The planner places pins first and
 * fits the rest of the task around them, so a moved session stays where it was
 * put.
 *
 * Times are minutes after midnight, dates are 'YYYY-MM-DD' strings.
 * Pure functions: no storage, no clock, no Vue.
 */

/** Pins snap to this grid, so dragged sessions land on readable times. */
export const PIN_STEP_MIN = 15

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

/** Rounds a time to the nearest grid step. */
export const snapMinutes = (min, step = PIN_STEP_MIN) => Math.round(min / step) * step

/**
 * ID for a new pin. Time plus random suffix, so two pins made in the same
 * millisecond still differ.
 *
 * @param {number} now - milliseconds, passed in so tests stay deterministic
 */
export function newPinId(now = Date.now()) {
  return `p-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

const pad = (n) => String(n).padStart(2, '0')

/** Local date as 'YYYY-MM-DD'. Not `toISOString()`, which would shift to UTC. */
export const dateToISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/**
 * The usable pins of a task, oldest first.
 *
 * Anything malformed is dropped rather than repaired: a pin with a broken date
 * or an end before its start would confuse the planner. Pins can come from a
 * backup file, so the shape is not trusted.
 *
 * @param {object} task
 * @returns {object[]} pins sorted by date, then start time
 */
export function pinsOf(task) {
  const list = Array.isArray(task?.pinned) ? task.pinned : []
  return list
    .filter(p => p && typeof p.id === 'string' && ISO_RE.test(p.date || '') &&
      Number.isInteger(p.startMin) && Number.isInteger(p.endMin) && p.endMin > p.startMin)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
}

/**
 * Adds a pin, or replaces the existing one with the same ID.
 *
 * @param {object[]} pins
 * @param {object} pin
 * @returns {object[]} new array
 */
export function withPin(pins, pin) {
  const rest = (pins || []).filter(p => p.id !== pin.id)
  return [...rest, pin]
}

/** Removes one pin by ID. */
export const withoutPin = (pins, id) => (pins || []).filter(p => p.id !== id)
