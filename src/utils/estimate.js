/**
 * Effort as a total estimate in minutes (B8): "this task needs about 8 h".
 * Stored on the task as `estimateMin` (number|null). Before B8 the effort was
 * one of '30m' | '1h' | '2h' | '3h+', migrated by upgradeToV4 (taskModel.js).
 */
import { checklistProgress, checklistTextOf } from './checklist.js'

export const ESTIMATE_PRESETS_H = [2, 4, 8, 16]
export const ESTIMATE_STEP_MIN = 30
export const ESTIMATE_MAX_MIN = 999 * 60

/** Old effort values -> minutes ("3h+" becomes 3 h, as the old planner used). */
export const LEGACY_EFFORT_MINUTES = { '30m': 30, '1h': 60, '2h': 120, '3h+': 180 }

/**
 * Free input -> minutes in 30-minute steps (rounded up).
 * "6" / "6,5" / "6.5 h" = hours, "90 min" / "45m" = minutes, "" = no estimate.
 * Returns { value: number|null } or { error: true }.
 */
export function parseEstimate(text) {
  const raw = String(text ?? '').trim().toLowerCase()
  if (!raw) return { value: null }
  const m = /^(\d+(?:[.,]\d+)?)\s*(h|std|stunden?|m|min|minuten?)?$/.exec(raw)
  if (!m) return { error: true }
  const amount = Number(m[1].replace(',', '.'))
  const minutes = m[2] && /^m/.test(m[2]) ? amount : amount * 60
  if (!(minutes > 0) || minutes > ESTIMATE_MAX_MIN) return { error: true }
  return { value: Math.ceil(minutes / ESTIMATE_STEP_MIN) * ESTIMATE_STEP_MIN }
}

/** Minutes -> text for the input field: 90 -> "1,5", 120 -> "2", null -> "" */
export function estimateToInput(minutes, decimal = ',') {
  if (!minutes) return ''
  const hours = minutes / 60
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace('.', decimal)
}

/**
 * Time still to do on a task: the estimate minus the share of finished
 * checklist steps (8 h with 2 of 4 steps done -> 4 h), rounded up to 30 min.
 * null without an estimate. Time tracking (later) will deduct worked time too.
 */
export function remainingMinutes(task) {
  const total = task.estimateMin
  if (!total) return null
  const progress = checklistProgress(checklistTextOf(task))
  if (!progress) return total
  const left = total * (1 - progress.done / progress.total)
  return Math.max(0, Math.ceil(left / ESTIMATE_STEP_MIN) * ESTIMATE_STEP_MIN)
}

/** 45 -> "45 min", 60 -> "1 h", 150 -> "2,5 h" (decimal separator per language). */
export function formatMinutes(minutes, decimal = ',') {
  if (minutes < 60) return `${minutes} min`
  const hours = minutes / 60
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1).replace('.', decimal)} h`
}
