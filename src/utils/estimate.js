/**
 * Effort as a total estimate in minutes (B8): "this task needs about 8 h".
 *
 * Stored on the task as `estimateMin` (number|null). Before B8 the effort was one
 * of '30m' | '1h' | '2h' | '3h+'; `upgradeToV4` in `taskModel.js` converts those.
 *
 * Pure functions: no storage, no clock, no Vue.
 */
import { checklistProgress, checklistTextOf } from './checklist.js'

/** Values the quick picker offers, in hours. */
export const ESTIMATE_PRESETS_H = [2, 4, 8, 16]

/** Estimates snap to half hours, so the planner gets readable slots. */
export const ESTIMATE_STEP_MIN = 30

/** Upper bound, about 16 weeks of full-time work. Guards against typos like "9999". */
export const ESTIMATE_MAX_MIN = 999 * 60

/** Old effort values to minutes. '3h+' becomes 3 h, which is what the old planner used. */
export const LEGACY_EFFORT_MINUTES = { '30m': 30, '1h': 60, '2h': 120, '3h+': 180 }

/**
 * Reads free input and returns minutes, rounded up to the next half hour.
 *
 * Accepted: "6" / "6,5" / "6.5 h" as hours, "90 min" / "45m" as minutes, "" as
 * "no estimate". A comma is accepted as the decimal separator because that is
 * what a Swiss or German keyboard produces.
 *
 * @param {string} text
 * @returns {{ value: number|null }|{ error: true }}
 */
export function parseEstimate(text) {
  const raw = String(text ?? '').trim().toLowerCase()
  if (!raw) return { value: null }
  const match = /^(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|m|min|minuten?)?$/.exec(raw)
  if (!match) return { error: true }
  const amount = Number(match[1].replace(',', '.'))
  // A unit starting with "m" means minutes, everything else (or no unit) hours.
  const minutes = match[2] && /^m/.test(match[2]) ? amount : amount * 60
  if (!(minutes > 0) || minutes > ESTIMATE_MAX_MIN) return { error: true }
  return { value: Math.ceil(minutes / ESTIMATE_STEP_MIN) * ESTIMATE_STEP_MIN }
}

/**
 * Minutes back into the input field: 90 -> "1,5", 120 -> "2", null -> "".
 *
 * @param {number|null} minutes
 * @param {string} decimal - decimal separator of the current language
 */
export function estimateToInput(minutes, decimal = ',') {
  if (!minutes) return ''
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', decimal)
}

/**
 * Time still to do on a task.
 *
 * The estimate is reduced by the share of finished checklist steps: 8 h with 2
 * of 4 steps done leaves 4 h. Rounded up to half hours, never below zero.
 * Time tracking (a later feature) will deduct worked time as well.
 *
 * @param {object} task
 * @returns {number|null} null when the task has no estimate
 */
export function remainingMinutes(task) {
  const total = task.estimateMin
  if (!total) return null
  const progress = checklistProgress(checklistTextOf(task))
  if (!progress) return total
  const left = total * (1 - progress.done / progress.total)
  return Math.max(0, Math.ceil(left / ESTIMATE_STEP_MIN) * ESTIMATE_STEP_MIN)
}

/**
 * Minutes as readable text: 45 -> "45 min", 60 -> "1 h", 150 -> "2,5 h".
 *
 * @param {number} minutes
 * @param {string} decimal - decimal separator of the current language
 */
export function formatMinutes(minutes, decimal = ',') {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace('.', decimal)} h`
}
