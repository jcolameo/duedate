/**
 * The JSON backup (B7): everything the user owns, in one file.
 *
 * File shape:
 *   { format: 'duedate-backup', version, schema, exportedAt, app, data }
 *
 * - `version` is the version of this file format. An importer refuses a newer
 *   one, because it cannot know what the extra fields mean.
 * - `schema` is the version of the stored data shape. An older one is upgraded
 *   during the import, see `upgradeToV3` and friends in `taskModel.js`.
 * - `data` holds tasks, tags, availability, today, columnMapping, csv and the
 *   settings.
 *
 * Every function takes a Storage-like object (`getItem`/`setItem`/`removeItem`)
 * instead of touching `localStorage` directly, which is what makes the whole
 * import testable without a browser.
 *
 * State that only affects looks (area and tag filters) is deliberately not part
 * of a backup: restoring a file should not change what the user is looking at.
 */
import { createTask, upgradeToV3, upgradeToV4, upgradeToV5, SCHEMA_VERSION } from './taskModel.js'
import { normalizeBlocks } from './availability.js'
import { TAG_COLORS } from './tags.js'

export const BACKUP_FORMAT = 'duedate-backup'
export const BACKUP_VERSION = 1

/** The storage keys a backup reads and writes. */
const KEYS = {
  tasks: 'duedate.taskStore.v1',
  tags: 'duedate.tags.v1',
  availability: 'duedate.availability.v1',
  today: 'duedate.today.v1',
  columnMapping: 'duedate.columnMapping.v1',
  csv: 'duedate.tasks.v1',
  theme: 'duedate.theme.v1',
  locale: 'duedate.locale.v1',
  planner: 'duedate.plannerSettings.v1',
}

const SCHEMA_KEY = 'duedate.schemaVersion'

/**
 * Removed by "delete all data": the data plus the looks-only state.
 *
 * Theme and language stay, because wiping tasks should not reset the app to
 * dark mode and German for an English user.
 */
const WIPE_KEYS = [
  KEYS.tasks, KEYS.tags, KEYS.availability, KEYS.today, KEYS.columnMapping, KEYS.csv, SCHEMA_KEY,
  'duedate.taskPlanning.v1', 'duedate.areaFilter.v1', 'duedate.tagFilter.v1', 'duedate.lastBackup.v1',
  'duedate.backupHintUntil.v1',
]

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

/**
 * The types a stored task field may have (SEC-002).
 *
 * A backup is a file from outside, so a field with the wrong type has to be
 * refused here instead of crashing later in `enrichTask`. A numeric `due` used
 * to pass the import and throw there, which took down the whole task list.
 *
 * Fields that are not listed are left to the defaults of `createTask`.
 */
const TASK_FIELD_TYPES = {
  area: 'string',
  status: 'string',
  due: 'string',
  dueRaw: 'string',
  start: 'string',
  category: 'string',
  description: 'string',
  files: 'string',
  notes: 'string',
  source: 'string',
  sourceKey: 'string',
  createdAt: 'string',
  updatedAt: 'string',
  completedAt: 'string',
  priority: 'string',
  graded: 'boolean',
  estimateMin: 'number',
  steps: 'array',
  tags: 'array',
  pinned: 'array',
}

/**
 * True when the field is present but has another type than the one allowed.
 *
 * A missing or null field is fine: `createTask` fills it in. Only a value that
 * is there and wrong is a problem.
 */
function hasWrongType(task, field, type) {
  const value = task[field]
  if (value === undefined || value === null) return false
  return type === 'array' ? !Array.isArray(value) : typeof value !== type
}

/** True when any known field of the task carries the wrong type. */
function hasInvalidFields(task) {
  return Object.entries(TASK_FIELD_TYPES).some(([field, type]) => hasWrongType(task, field, type))
}

/**
 * Reads and parses one key, or null.
 *
 * Broken JSON returns null instead of throwing: a half-written value from an
 * older version must not stop the export.
 */
function readJSON(storage, key) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Collects all user data from storage into the backup structure.
 *
 * @param {Storage} storage - localStorage, or a test double
 * @param {Date} now - passed in so the export timestamp is testable
 * @returns {object} the backup object, ready to be stringified
 */
export function createBackup(storage, now = new Date()) {
  const tasks = readJSON(storage, KEYS.tasks)
  const tags = readJSON(storage, KEYS.tags)
  const availability = readJSON(storage, KEYS.availability)
  const today = readJSON(storage, KEYS.today)
  const mapping = readJSON(storage, KEYS.columnMapping)
  const csv = readJSON(storage, KEYS.csv)
  const planner = readJSON(storage, KEYS.planner)

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    schema: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    app: 'DueDate',
    data: {
      tasks: Array.isArray(tasks?.tasks) ? tasks.tasks : [],
      tags: Array.isArray(tags?.tags) ? tags.tags : [],
      availability: Array.isArray(availability) ? availability : [],
      today: isObject(today) ? today : null,
      columnMapping: isObject(mapping) ? mapping : null,
      csv: isObject(csv) && Array.isArray(csv.rows) ? csv : null,
      settings: {
        theme: storage.getItem(KEYS.theme) || null,
        locale: storage.getItem(KEYS.locale) || null,
        planner: isObject(planner) ? planner : null,
      },
    },
  }
}

/**
 * Counts for the preview the user sees before confirming an import
 * ("42 Aufgaben, 5 Tags, 120 CSV-Zeilen").
 *
 * @param {object} data - the `data` part of a backup
 * @returns {{ tasks: number, open: number, done: number, tags: number,
 *   blocks: number, csvRows: number }}
 */
export function summarize(data) {
  const tasks = Array.isArray(data?.tasks) ? data.tasks : []
  return {
    tasks: tasks.length,
    open: tasks.filter(t => t && t.status !== 'done').length,
    done: tasks.filter(t => t && t.status === 'done').length,
    tags: Array.isArray(data?.tags) ? data.tags.length : 0,
    blocks: Array.isArray(data?.availability) ? data.availability.length : 0,
    csvRows: Array.isArray(data?.csv?.rows) ? data.csv.rows.length : 0,
  }
}

/**
 * Turns the text of a backup file into a usable backup, or into an error code.
 *
 * Every check runs before anything is written, so a rejected file leaves the
 * stored data untouched.
 *
 * Error codes: `not_json`, `wrong_format`, `too_new`, `invalid_data`,
 * `invalid_tasks`, `duplicate_ids`, `invalid_tags`, `invalid_availability`.
 *
 * @param {string} text - file content
 * @returns {{ backup: object, summary: object }|{ error: { code: string, params: object } }}
 */
export function parseBackup(text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    return { error: { code: 'not_json', params: {} } }
  }

  if (!isObject(json) || json.format !== BACKUP_FORMAT) {
    return { error: { code: 'wrong_format', params: {} } }
  }
  if (typeof json.version !== 'number' || json.version > BACKUP_VERSION) {
    return { error: { code: 'too_new', params: { version: json.version ?? '?' } } }
  }
  if (!isObject(json.data)) {
    return { error: { code: 'invalid_data', params: {} } }
  }

  const { tasks, tags, availability } = json.data
  if (!Array.isArray(tasks)) {
    return { error: { code: 'invalid_data', params: {} } }
  }

  const badTasks = tasks.filter(t =>
    !isObject(t) || typeof t.id !== 'string' || !t.id || typeof t.title !== 'string' || hasInvalidFields(t)).length
  if (badTasks) {
    return { error: { code: 'invalid_tasks', params: { count: badTasks } } }
  }

  // Duplicate IDs would make two tasks share a plan and an ICS UID.
  if (new Set(tasks.map(t => t.id)).size !== tasks.length) {
    return { error: { code: 'duplicate_ids', params: {} } }
  }

  if (tags !== undefined && (!Array.isArray(tags) || tags.some(t => !isObject(t) || typeof t.id !== 'string' || typeof t.name !== 'string'))) {
    return { error: { code: 'invalid_tags', params: {} } }
  }
  if (availability !== undefined && (!Array.isArray(availability) || availability.some(b => !isObject(b)))) {
    return { error: { code: 'invalid_availability', params: {} } }
  }

  return { backup: json, summary: summarize(json.data) }
}

/**
 * Writes one value, or removes the key when there is nothing to write.
 *
 * Strings are stored as they are, everything else as JSON. `null` and
 * `undefined` mean "this key should not exist", which keeps a restore from
 * leaving stale data behind.
 */
function put(storage, key, value) {
  if (value === null || value === undefined) storage.removeItem(key)
  else storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
}

/**
 * Writes all pairs or none (SEC-004).
 *
 * `localStorage` has no transaction. Without this, a quota error on the last key
 * left the new tasks in place and the old CSV rows behind: a half-imported state
 * the user can neither see nor undo.
 *
 * The previous values are kept and put back when a write fails. Restoring frees
 * space again, so the rollback itself can run even with a full quota.
 */
function writeAll(storage, pairs) {
  const previous = pairs.map(([key]) => [key, storage.getItem(key)])
  try {
    for (const [key, value] of pairs) put(storage, key, value)
  } catch (error) {
    for (const [key, value] of previous) put(storage, key, value)
    throw error
  }
}

/**
 * Replaces all user data in storage with the backup's.
 *
 * Three things happen on the way in:
 * - older data shapes are upgraded (`upgradeToV3` to `upgradeToV5`),
 * - missing task fields get their defaults from `createTask`,
 * - tag IDs that point to no tag are dropped, so no task references a ghost.
 *
 * The stores read their data once at start, so the caller reloads the page
 * afterwards.
 *
 * @param {object} backup - result of `parseBackup`
 * @param {Storage} storage
 */
export function applyBackup(backup, storage) {
  const data = backup.data

  const tags = (data.tags || []).map(t => ({
    id: t.id,
    name: t.name,
    // SEC-003: a color from outside must not reach the class lookup unchecked.
    color: TAG_COLORS.includes(t.color) ? t.color : 'gray',
  }))
  const tagIds = new Set(tags.map(t => t.id))

  let tasks = data.tasks
  if ((backup.schema ?? 2) < 3) tasks = upgradeToV3(tasks)
  if ((backup.schema ?? 2) < 4) tasks = upgradeToV4(tasks)
  if ((backup.schema ?? 2) < 5) tasks = upgradeToV5(tasks)

  tasks = tasks.map((task) => {
    const full = createTask(task)
    return { ...full, tags: (Array.isArray(full.tags) ? full.tags : []).filter(id => tagIds.has(id)) }
  })

  const writes = [
    [KEYS.tasks, { tasks }],
    [SCHEMA_KEY, String(SCHEMA_VERSION)],
    [KEYS.tags, tags.length ? { tags } : null],
    [KEYS.availability, data.availability?.length ? normalizeBlocks(data.availability) : null],
    [KEYS.today, data.today],
    [KEYS.columnMapping, data.columnMapping],
    [KEYS.csv, data.csv],
  ]
  if (data.settings?.theme) writes.push([KEYS.theme, data.settings.theme])
  if (data.settings?.locale) writes.push([KEYS.locale, data.settings.locale])
  if (isObject(data.settings?.planner)) writes.push([KEYS.planner, data.settings.planner])

  writeAll(storage, writes)
}

/**
 * Removes all user data. Theme and language stay, see `WIPE_KEYS`.
 *
 * @param {Storage} storage
 */
export function clearAllData(storage) {
  for (const key of WIPE_KEYS) storage.removeItem(key)
}

/**
 * File name for the download: "duedate-backup-2026-11-12.json".
 *
 * The local date is used, not the UTC one, so a backup made late in the evening
 * carries the day the user thinks it is.
 *
 * @param {Date} now
 * @returns {string}
 */
export function backupFilename(now = new Date()) {
  const pad = (n) => String(n).padStart(2, '0')
  return `duedate-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`
}
