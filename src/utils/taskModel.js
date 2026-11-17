/**
 * The task data model (since B1) and the pure helpers around it.
 *
 * A task looks like this:
 *
 *   {
 *     id, title,
 *     area: 'study' | 'freelance' | 'personal',
 *     status: 'open' | 'done',
 *     due: 'YYYY-MM-DD' | null,
 *     dueRaw: string | null,      // the original CSV text, kept for display
 *     start, category, description, graded: boolean, files,
 *     priority: 'high' | 'medium' | 'low' | null,   // null means "automatic"
 *     estimateMin: number | null, // total effort in minutes (B8)
 *     notes: string,
 *     steps: [],                  // legacy, not extended any more
 *     tags: string[],             // tag IDs (B5c)
 *     pinned: [],                 // work sessions the user fixed (B12)
 *     source: 'csv' | 'manual',
 *     sourceKey: string | null,
 *     createdAt, updatedAt, completedAt: ISO timestamp | null
 *   }
 *
 * CSV tasks keep the ID they had before B1, `taskId(title, deadlineRaw)`. That
 * is what keeps calendar UIDs and saved planning data matching across imports.
 *
 * Pure functions: the current time is a parameter, never read here.
 */
import { parseGermanDate, daysUntil } from './dateParser.js'
import { taskId } from './taskId.js'
import { AREAS, DEFAULT_AREA, normalizeArea } from './areas.js'
import { checklistProgress, checklistTextOf } from './checklist.js'
import { LEGACY_EFFORT_MINUTES } from './estimate.js'

/**
 * Version of the stored data shape. Backups carry it, and an older value is
 * upgraded on import. Raise it whenever a stored field changes shape, together
 * with an idempotent `upgradeToVn` below.
 */
export const SCHEMA_VERSION = 5

export const TASK_STATUS = ['open', 'done']
export { AREAS }

/**
 * Local calendar date to 'YYYY-MM-DD'.
 *
 * `toISOString()` is not used on purpose: it converts to UTC first, so a task
 * due on the 1st would show the 31st for anyone east of Greenwich after
 * midnight.
 *
 * @param {Date|null} date
 * @returns {string|null}
 */
export function toISODate(date) {
  if (!date) return null
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/**
 * 'YYYY-MM-DD' to a local Date at midnight, or null.
 *
 * @param {string|null} iso
 * @returns {Date|null}
 */
export function fromISODate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null
}

/**
 * Column names used before the mapping existed.
 *
 * They stay as a fallback so data imported by an older version still reads
 * correctly after the upgrade.
 */
const FALLBACKS = {
  title: ['Titel', 'Title', 'Aufgabe'],
  deadline: ['Abgabe', 'Deadline', 'Due', 'Fällig'],
  start: ['Start', 'Beginn'],
  category: ['Fach', 'Category', 'Kategorie'],
  description: ['Beschreibung', 'Description'],
  graded: ['Benotet?', 'Benotet', 'Graded'],
  files: ['Datei(en) zur Aufgabe', 'Datei', 'Files'],
}

/**
 * Reads one role from a CSV row: the mapped column first, then the legacy names.
 *
 * @returns {*} the cell value, or '' when neither is present
 */
function readField(row, mapping, role) {
  if (mapping && mapping[role] && row[mapping[role]] !== undefined) return row[mapping[role]]
  for (const name of FALLBACKS[role]) if (row[name] !== undefined) return row[name]
  return ''
}

/** Reads the many spellings of "yes" in a graded column. */
function isTruthyGraded(value) {
  const v = String(value || '').trim().toLowerCase()
  return v.startsWith('j') || v === 'yes' || v === 'true' || v === 'x' || v === '1'
}

/**
 * Turns one CSV row into the task fields that come from the file.
 *
 * @param {object} row
 * @param {object} mapping - role to column name
 * @returns {object} title, dueRaw, due, start, category, description, graded, files
 */
export function rowToFields(row, mapping) {
  const title = String(readField(row, mapping, 'title')).trim()
  const dueRaw = String(readField(row, mapping, 'deadline')).trim()
  return {
    title,
    dueRaw: dueRaw || null,
    due: toISODate(parseGermanDate(dueRaw)),
    start: String(readField(row, mapping, 'start')).trim() || null,
    category: String(readField(row, mapping, 'category')).trim(),
    description: String(readField(row, mapping, 'description')).trim(),
    graded: isTruthyGraded(readField(row, mapping, 'graded')),
    files: String(readField(row, mapping, 'files')).trim(),
  }
}

/**
 * A complete task, with defaults for everything not given.
 *
 * `fields` is spread last on purpose: it may override any default, including
 * `id` and the timestamps, which is what the backup import relies on.
 *
 * @param {object} fields
 * @param {Date} now
 * @returns {object}
 */
export function createTask(fields, now = new Date()) {
  const timestamp = now.toISOString()
  return {
    id: fields.id,
    title: '',
    area: DEFAULT_AREA,
    status: 'open',
    due: null,
    dueRaw: null,
    start: null,
    category: '',
    description: '',
    graded: false,
    files: '',
    priority: null,
    estimateMin: null,
    notes: '',
    steps: [],
    tags: [],
    pinned: [],
    source: 'manual',
    sourceKey: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    completedAt: null,
    ...fields,
  }
}

/**
 * ID for a task the user creates in the app.
 *
 * CSV tasks use `taskId()` instead, because their ID has to survive a re-import.
 *
 * @param {Date} now
 * @returns {string}
 */
export function manualTaskId(now = new Date()) {
  return `m-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** A task created in the app: quick capture, and later the detail panel. */
export function createManualTask(fields, now = new Date()) {
  return createTask({ ...fields, id: manualTaskId(now), source: 'manual', sourceKey: null }, now)
}

/**
 * CSV rows to tasks.
 *
 * The ID is `taskId(title, dueRaw)`, the same value as before B1, and it is
 * stored as `sourceKey` too. A repeated title and date inside one file gets
 * "-2", "-3" and so on, so two rows never share an ID (the collision documented
 * in A2).
 *
 * @param {object[]} rows
 * @param {object} mapping
 * @param {Date} now
 * @returns {object[]}
 */
export function rowsToTasks(rows, mapping, now = new Date()) {
  const seen = new Map()
  const tasks = []

  for (const row of rows || []) {
    const fields = rowToFields(row, mapping)
    if (!fields.title && !fields.dueRaw) continue // empty line

    const base = taskId(fields.title, fields.dueRaw || '')
    const count = (seen.get(base) || 0) + 1
    seen.set(base, count)

    const key = count === 1 ? base : `${base}-${count}`
    tasks.push(createTask({ ...fields, id: key, sourceKey: key, source: 'csv' }, now))
  }

  return tasks
}

/** The fields a re-import is allowed to overwrite. */
const CSV_FIELDS = ['title', 'dueRaw', 'due', 'start', 'category', 'description', 'graded', 'files']

/**
 * Has the user changed anything on this task that a re-import must not lose?
 *
 * Any of these means "hands off": a status, a priority, an estimate, notes,
 * steps, tags, pins, or an area other than the default.
 *
 * @param {object} task
 * @returns {boolean}
 */
export function isTouched(task) {
  return task.status !== 'open' ||
    !!task.priority ||
    !!task.estimateMin ||
    !!task.notes ||
    (task.steps && task.steps.length > 0) ||
    (task.tags && task.tags.length > 0) ||
    (task.pinned && task.pinned.length > 0) ||
    normalizeArea(task.area) !== DEFAULT_AREA
}

/**
 * Merges a fresh CSV import into the existing tasks.
 *
 * - Same `sourceKey`: the CSV fields are refreshed, the user's own fields
 *   (status, priority, estimate, notes, steps, area, tags, pins) are kept.
 * - New rows are added.
 * - CSV tasks missing from the new import are removed only when untouched, for
 *   example after correcting a wrong column mapping. Touched ones stay.
 * - Manual tasks are never affected.
 *
 * @param {object[]} existing
 * @param {object[]} incoming
 * @param {Date} now
 * @returns {object[]}
 */
export function mergeImport(existing, incoming, now = new Date()) {
  const byKey = new Map(incoming.map(t => [t.sourceKey, t]))
  const result = []
  const used = new Set()

  for (const task of existing) {
    if (task.source !== 'csv') {
      result.push(task)
      continue
    }

    const fresh = byKey.get(task.sourceKey)
    if (fresh) {
      used.add(task.sourceKey)
      const changed = CSV_FIELDS.some(f => task[f] !== fresh[f])
      const patch = Object.fromEntries(CSV_FIELDS.map(f => [f, fresh[f]]))
      // Only bump `updatedAt` when something really changed, so an unchanged
      // re-import does not look like an edit.
      result.push(changed ? { ...task, ...patch, updatedAt: now.toISOString() } : task)
    } else if (isTouched(task)) {
      result.push(task)
    }
  }

  for (const task of incoming) if (!used.has(task.sourceKey)) result.push(task)
  return result
}

/**
 * One-time migration from the storage used before B1: raw CSV rows, the column
 * mapping, and per-task planning (`{ [id]: { effort, priority } }`).
 *
 * @param {{ rows: object[], mapping: object, planning: object }} legacy
 * @param {Date} now
 * @returns {object[]}
 */
export function migrateLegacy({ rows, mapping, planning }, now = new Date()) {
  const plan = planning && typeof planning === 'object' ? planning : {}
  return rowsToTasks(Array.isArray(rows) ? rows : [], mapping || {}, now).map((task) => {
    // Duplicates shared their planning entry before B1, so "-2" reads the base key.
    const entry = plan[task.id] || plan[task.id.replace(/-\d+$/, '')]
    if (!entry) return task
    return {
      ...task,
      estimateMin: LEGACY_EFFORT_MINUTES[entry.effort] ?? null,
      priority: entry.priority || null,
    }
  })
}

/**
 * Schema 3 (B5b): manual tasks keep their text in `description` as Markdown;
 * `notes` is only for the user's own notes on CSV tasks, whose description
 * belongs to the CSV. Moves the B5 notes of manual tasks over.
 *
 * Idempotent: returns the same array when nothing changes.
 */
export function upgradeToV3(tasks) {
  let changed = false
  const next = tasks.map((task) => {
    if (task.source === 'csv' || !task.notes) return task
    changed = true
    const description = task.description ? `${task.description}\n\n${task.notes}` : task.notes
    return { ...task, description, notes: '' }
  })
  return changed ? next : tasks
}

/**
 * Schema 4 (B8): the effort '30m' | '1h' | '2h' | '3h+' becomes `estimateMin`
 * in minutes, and the old field is removed.
 *
 * Idempotent: a task that already has `estimateMin` and no `effort` is left
 * alone, so a second run changes nothing.
 */
export function upgradeToV4(tasks) {
  let changed = false
  const next = tasks.map((task) => {
    if (!('effort' in task) && 'estimateMin' in task) return task
    changed = true
    const { effort, ...rest } = task
    const known = typeof task.estimateMin === 'number' ? task.estimateMin : LEGACY_EFFORT_MINUTES[effort]
    return { ...rest, estimateMin: known ?? null }
  })
  return changed ? next : tasks
}

/**
 * Schema 5 (B12): every task gets `pinned: []`, the work sessions the user moved
 * and fixed in the calendar.
 *
 * Idempotent: returns the same array when every task already has the field.
 */
export function upgradeToV5(tasks) {
  if (tasks.every(task => Array.isArray(task.pinned))) return tasks
  return tasks.map(task => (Array.isArray(task.pinned) ? task : { ...task, pinned: [] }))
}

/**
 * Adds the derived, underscore-prefixed fields the views, the scheduler and the
 * exports already use.
 *
 * Derived fields are never stored: they are recomputed from the task and the
 * current date on every render. The status label is translated in the
 * composable, not here, because this file knows nothing about languages.
 *
 * @param {object} task
 * @returns {object} a copy with `_id`, `_title`, `_days`, `_statusCode`, ...
 */
export function enrichTask(task) {
  const deadlineDate = fromISODate(task.due)
  const days = daysUntil(deadlineDate)

  let code = 'ok'
  if (days === null) code = 'unknown'
  else if (days < 0) code = 'overdue'
  else if (days < 3) code = 'urgent'
  else if (days < 7) code = 'soon'

  // Split the ISO date for the Swiss display form "24.11.2026".
  const [year, month, day] = (task.due || '').split('-')

  return {
    ...task,
    _id: task.id,
    _title: task.title,
    _deadline: task.dueRaw || (task.due ? `${day}.${month}.${year}` : ''),
    _start: task.start || '',
    _category: task.category,
    _description: task.description,
    _files: task.files,
    _isGraded: task.graded,
    _deadlineDate: deadlineDate,
    _days: days,
    _statusCode: code,
    _isDone: task.status === 'done',
    _area: normalizeArea(task.area),
    _checklist: checklistProgress(checklistTextOf(task)),
  }
}

/** True for tasks that still need doing. Works on plain and enriched tasks. */
export function isOpen(task) {
  return task.status !== 'done'
}

/**
 * Returns the task with a new status.
 *
 * `completedAt` is set when the task becomes done and cleared when it is
 * reopened, so the cleanup feature can tell how long ago it was finished.
 *
 * @param {object} task
 * @param {'open'|'done'} status
 * @param {Date} now
 * @returns {object}
 */
export function withStatus(task, status, now = new Date()) {
  if (!TASK_STATUS.includes(status)) throw new Error(`Unknown status: ${status}`)
  const timestamp = now.toISOString()
  return { ...task, status, completedAt: status === 'done' ? timestamp : null, updatedAt: timestamp }
}

/**
 * Sort by due date, with tasks without a date last.
 *
 * Works on enriched tasks, because it reads `_days`.
 */
export function compareByDue(a, b) {
  if (a._days === null && b._days === null) return 0
  if (a._days === null) return 1
  if (b._days === null) return -1
  return a._days - b._days
}
