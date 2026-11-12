/**
 * Pinned work sessions (B12): when the user moves a planned session, the new
 * slot is stored on the task as `pinned: [{ id, date, startMin, endMin }]`.
 * The planner places pins first and plans the rest of the task around them.
 */
export const PIN_STEP_MIN = 15

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/

export const snapMinutes = (min, step = PIN_STEP_MIN) => Math.round(min / step) * step

export function newPinId(now = Date.now()) {
  return `p-${now.toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

const pad = (n) => String(n).padStart(2, '0')
export const dateToISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

/** Valid pins only (unknown shapes are dropped), in chronological order. */
export function pinsOf(task) {
  const list = Array.isArray(task?.pinned) ? task.pinned : []
  return list
    .filter(p => p && typeof p.id === 'string' && ISO_RE.test(p.date || '') &&
      Number.isInteger(p.startMin) && Number.isInteger(p.endMin) && p.endMin > p.startMin)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startMin - b.startMin)
}

/** Adds the pin, or replaces the one with the same id. */
export function withPin(pins, pin) {
  const rest = (pins || []).filter(p => p.id !== pin.id)
  return [...rest, pin]
}

export const withoutPin = (pins, id) => (pins || []).filter(p => p.id !== id)
