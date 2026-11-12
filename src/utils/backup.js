/**
 * JSON backup (B7): everything the user owns in one file.
 *
 * File: { format: 'duedate-backup', version, schema, exportedAt, app, data }
 * - version: version of this file format (importers refuse newer ones)
 * - schema:  version of the stored data shape (older ones are upgraded on import)
 * - data:    tasks, tags, availability, today, columnMapping, csv, settings
 *
 * All functions take a Storage-like object (getItem/setItem/removeItem), so
 * they are tested without a browser. UI preferences that are only about
 * looks (filters) are not part of a backup.
 */
import { createTask, upgradeToV3, SCHEMA_VERSION } from './taskModel.js'
import { normalizeBlocks } from './availability.js'

export const BACKUP_FORMAT = 'duedate-backup'
export const BACKUP_VERSION = 1

const KEYS = {
  tasks: 'duedate.taskStore.v1',
  tags: 'duedate.tags.v1',
  availability: 'duedate.availability.v1',
  today: 'duedate.today.v1',
  columnMapping: 'duedate.columnMapping.v1',
  csv: 'duedate.tasks.v1',
  theme: 'duedate.theme.v1',
  locale: 'duedate.locale.v1',
}
const SCHEMA_KEY = 'duedate.schemaVersion'

// Removed by "delete all data": data plus looks-only state, not theme/language
const WIPE_KEYS = [
  KEYS.tasks, KEYS.tags, KEYS.availability, KEYS.today, KEYS.columnMapping, KEYS.csv, SCHEMA_KEY,
  'duedate.taskPlanning.v1', 'duedate.areaFilter.v1', 'duedate.tagFilter.v1', 'duedate.lastBackup.v1',
  'duedate.backupHintUntil.v1',
]

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function readJSON(storage, key) {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/** Reads all user data from storage into the backup structure. */
export function createBackup(storage, now = new Date()) {
  const tasks = readJSON(storage, KEYS.tasks)
  const tags = readJSON(storage, KEYS.tags)
  const availability = readJSON(storage, KEYS.availability)
  const today = readJSON(storage, KEYS.today)
  const mapping = readJSON(storage, KEYS.columnMapping)
  const csv = readJSON(storage, KEYS.csv)
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
      },
    },
  }
}

/** Counts for the preview ("42 Aufgaben, 5 Tags …"). */
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
 * Text of a backup file -> { backup, summary } or { error: { code, params } }.
 * Codes: not_json, wrong_format, too_new, invalid_data, invalid_tasks,
 * duplicate_ids, invalid_tags, invalid_availability.
 */
export function parseBackup(text) {
  let json
  try {
    json = JSON.parse(text)
  } catch {
    return { error: { code: 'not_json', params: {} } }
  }
  if (!isObject(json) || json.format !== BACKUP_FORMAT) return { error: { code: 'wrong_format', params: {} } }
  if (typeof json.version !== 'number' || json.version > BACKUP_VERSION) {
    return { error: { code: 'too_new', params: { version: json.version ?? '?' } } }
  }
  if (!isObject(json.data)) return { error: { code: 'invalid_data', params: {} } }

  const { tasks, tags, availability } = json.data
  if (!Array.isArray(tasks)) return { error: { code: 'invalid_data', params: {} } }
  const badTasks = tasks.filter(t => !isObject(t) || typeof t.id !== 'string' || !t.id || typeof t.title !== 'string').length
  if (badTasks) return { error: { code: 'invalid_tasks', params: { count: badTasks } } }
  if (new Set(tasks.map(t => t.id)).size !== tasks.length) return { error: { code: 'duplicate_ids', params: {} } }
  if (tags !== undefined && (!Array.isArray(tags) || tags.some(t => !isObject(t) || typeof t.id !== 'string' || typeof t.name !== 'string'))) {
    return { error: { code: 'invalid_tags', params: {} } }
  }
  if (availability !== undefined && (!Array.isArray(availability) || availability.some(b => !isObject(b)))) {
    return { error: { code: 'invalid_availability', params: {} } }
  }
  return { backup: json, summary: summarize(json.data) }
}

function put(storage, key, value) {
  if (value === null || value === undefined) storage.removeItem(key)
  else storage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
}

/**
 * Replaces all user data in storage with the backup's. Older data shapes are
 * upgraded, missing task fields get defaults and tag IDs that point to no tag
 * are dropped. The app reads its stores at start, so reload afterwards.
 */
export function applyBackup(backup, storage) {
  const data = backup.data
  const tags = (data.tags || []).map(t => ({ id: t.id, name: t.name, color: t.color || 'gray' }))
  const tagIds = new Set(tags.map(t => t.id))

  let tasks = data.tasks
  if ((backup.schema ?? 2) < 3) tasks = upgradeToV3(tasks)
  tasks = tasks.map(task => {
    const full = createTask(task)
    return { ...full, tags: (Array.isArray(full.tags) ? full.tags : []).filter(id => tagIds.has(id)) }
  })

  put(storage, KEYS.tasks, { tasks })
  put(storage, SCHEMA_KEY, String(SCHEMA_VERSION))
  put(storage, KEYS.tags, tags.length ? { tags } : null)
  put(storage, KEYS.availability, data.availability?.length ? normalizeBlocks(data.availability) : null)
  put(storage, KEYS.today, data.today)
  put(storage, KEYS.columnMapping, data.columnMapping)
  put(storage, KEYS.csv, data.csv)
  if (data.settings?.theme) put(storage, KEYS.theme, data.settings.theme)
  if (data.settings?.locale) put(storage, KEYS.locale, data.settings.locale)
}

/** Removes all user data (theme and language stay). */
export function clearAllData(storage) {
  for (const key of WIPE_KEYS) storage.removeItem(key)
}

/** duedate-backup-2026-11-12.json (local date) */
export function backupFilename(now = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `duedate-backup-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`
}
