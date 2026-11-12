/**
 * Task data model (since B1) and pure helpers around it.
 *
 * Task = {
 *   id, title, area: 'study'|'freelance'|'personal', status: 'open'|'done',
 *   due: 'YYYY-MM-DD'|null, dueRaw: string|null (original CSV text, for display),
 *   start, category, description, graded: boolean, files,
 *   priority: 'high'|'medium'|'low'|null (null = automatic default),
 *   estimateMin: number|null (total effort, B8), notes: string, steps: [], tags: string[] (tag IDs, B5c),
 *   source: 'csv'|'manual', sourceKey: string|null,
 *   createdAt, updatedAt, completedAt: ISO timestamps|null
 * }
 *
 * CSV tasks use the same ID as before B1 (taskId(title, deadlineRaw)), so
 * calendar UIDs and saved planning data keep matching.
 */
import { parseGermanDate, daysUntil } from './dateParser.js'
import { taskId } from './taskId.js'
import { AREAS, DEFAULT_AREA, normalizeArea } from './areas.js'
import { checklistProgress, checklistTextOf } from './checklist.js'
import { LEGACY_EFFORT_MINUTES } from './estimate.js'

/** Version of the stored data shape (3 since B5b, 4 since B8); backups carry it. */
export const SCHEMA_VERSION = 4
export const TASK_STATUS = ['open', 'done']
export { AREAS }

/** Local calendar date -> 'YYYY-MM-DD' (no UTC shift, unlike toISOString). */
export function toISODate(date) {
  if (!date) return null
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${d}`
}

/** 'YYYY-MM-DD' -> local Date at midnight, or null. */
export function fromISODate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null
}

// Reads a role via the mapping, with the legacy hard-coded column names as
// fallback so data imported before the mapping existed still works.
const FALLBACKS = {
  title: ['Titel', 'Title', 'Aufgabe'],
  deadline: ['Abgabe', 'Deadline', 'Due', 'Fällig'],
  start: ['Start', 'Beginn'],
  category: ['Fach', 'Category', 'Kategorie'],
  description: ['Beschreibung', 'Description'],
  graded: ['Benotet?', 'Benotet', 'Graded'],
  files: ['Datei(en) zur Aufgabe', 'Datei', 'Files'],
}

function readField(row, mapping, role) {
  if (mapping && mapping[role] && row[mapping[role]] !== undefined) return row[mapping[role]]
  for (const f of FALLBACKS[role]) if (row[f] !== undefined) return row[f]
  return ''
}

function isTruthyGraded(value) {
  const v = String(value || '').trim().toLowerCase()
  return v.startsWith('j') || v === 'yes' || v === 'true' || v === 'x' || v === '1'
}

/** CSV row -> the task fields that come from the file. */
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

/** A complete task with defaults for everything not given. */
export function createTask(fields, now = new Date()) {
  const ts = now.toISOString()
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
    source: 'manual',
    sourceKey: null,
    createdAt: ts,
    updatedAt: ts,
    completedAt: null,
    ...fields,
  }
}

/** Unique ID for tasks the user creates (CSV tasks use taskId instead). */
export function manualTaskId(now = new Date()) {
  return `m-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/** A task created in the app (quick capture, later the detail panel). */
export function createManualTask(fields, now = new Date()) {
  return createTask({ ...fields, id: manualTaskId(now), source: 'manual', sourceKey: null }, now)
}

/**
 * CSV rows -> tasks. ID = sourceKey = taskId(title, dueRaw), as before B1.
 * A repeated title + date within one file gets "-2", "-3" … so two rows
 * never share an ID (fixes the collision documented in A2).
 */
export function rowsToTasks(rows, mapping, now = new Date()) {
  const seen = new Map()
  const tasks = []
  for (const row of rows || []) {
    const fields = rowToFields(row, mapping)
    if (!fields.title && !fields.dueRaw) continue // empty line
    const base = taskId(fields.title, fields.dueRaw || '')
    const n = (seen.get(base) || 0) + 1
    seen.set(base, n)
    const key = n === 1 ? base : `${base}-${n}`
    tasks.push(createTask({ ...fields, id: key, sourceKey: key, source: 'csv' }, now))
  }
  return tasks
}

const CSV_FIELDS = ['title', 'dueRaw', 'due', 'start', 'category', 'description', 'graded', 'files']

/** Has the user changed anything on this task that a re-import must not lose? */
export function isTouched(task) {
  return task.status !== 'open' || !!task.priority || !!task.estimateMin || !!task.notes ||
    (task.steps && task.steps.length > 0) || (task.tags && task.tags.length > 0) || normalizeArea(task.area) !== DEFAULT_AREA
}

/**
 * Merges a fresh CSV import into the existing tasks.
 * - Same sourceKey: CSV fields are refreshed, user fields (status, priority,
 *   estimateMin, notes, steps, area, tags) are kept.
 * - New rows: added.
 * - CSV tasks missing from the new import: removed only if untouched
 *   (e.g. after correcting a wrong mapping); touched ones are kept.
 * - Manual tasks are never affected.
 */
export function mergeImport(existing, incoming, now = new Date()) {
  const byKey = new Map(incoming.map(t => [t.sourceKey, t]))
  const result = []
  const used = new Set()
  for (const task of existing) {
    if (task.source !== 'csv') { result.push(task); continue }
    const fresh = byKey.get(task.sourceKey)
    if (fresh) {
      used.add(task.sourceKey)
      const changed = CSV_FIELDS.some(f => task[f] !== fresh[f])
      const patch = Object.fromEntries(CSV_FIELDS.map(f => [f, fresh[f]]))
      result.push(changed ? { ...task, ...patch, updatedAt: now.toISOString() } : task)
    } else if (isTouched(task)) {
      result.push(task)
    }
  }
  for (const t of incoming) if (!used.has(t.sourceKey)) result.push(t)
  return result
}

/**
 * One-time migration from the pre-B1 storage:
 * raw CSV rows + column mapping + per-task planning ({ [id]: {effort, priority} }).
 */
export function migrateLegacy({ rows, mapping, planning }, now = new Date()) {
  const plan = planning && typeof planning === 'object' ? planning : {}
  return rowsToTasks(Array.isArray(rows) ? rows : [], mapping || {}, now).map((task) => {
    // Duplicates shared their planning entry before B1, so "-2" reads the base key
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
 * Schema 3 (B5b): manual tasks keep their text in `description` (Markdown);
 * `notes` is only used for the user's own notes on CSV tasks, whose
 * description belongs to the CSV. Moves B5 notes of manual tasks over.
 * Idempotent, returns the same array when nothing changes.
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
 * Schema 4 (B8): effort '30m' | '1h' | '2h' | '3h+' becomes `estimateMin`
 * (minutes, total effort). The old field is removed. Idempotent, returns the
 * same array when nothing changes.
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
 * Adds the derived, underscore-prefixed fields the views, scheduler and
 * exports already use. Status label translation happens in the composable.
 */
export function enrichTask(task) {
  const deadlineDate = fromISODate(task.due)
  const days = daysUntil(deadlineDate)
  let code = 'ok'
  if (days === null) code = 'unknown'
  else if (days < 0) code = 'overdue'
  else if (days < 3) code = 'urgent'
  else if (days < 7) code = 'soon'
  const [y, m, d] = (task.due || '').split('-')
  return {
    ...task,
    _id: task.id,
    _title: task.title,
    _deadline: task.dueRaw || (task.due ? `${d}.${m}.${y}` : ''),
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

/** Returns the task with a new status; completedAt is set or cleared. */
export function withStatus(task, status, now = new Date()) {
  if (!TASK_STATUS.includes(status)) throw new Error(`Unknown status: ${status}`)
  const ts = now.toISOString()
  return { ...task, status, completedAt: status === 'done' ? ts : null, updatedAt: ts }
}

/** Sort: by due date, tasks without a date last. */
export function compareByDue(a, b) {
  if (a._days === null && b._days === null) return 0
  if (a._days === null) return 1
  if (b._days === null) return -1
  return a._days - b._days
}
