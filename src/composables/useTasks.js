/**
 * useTasks: the task store. It holds every task of the user as its own
 * object, loads them at start, saves every change, and offers the basic
 * operations (add, update, remove, undo).
 *
 * Called by: src/components/TaskDetail.vue:37, src/components/QuickAdd.vue:36,
 * src/components/DataSettings.vue:22, and inside this folder by almost every
 * other store: useTaskEnrichment, useTaskActions, useTaskPlanning,
 * usePlanEdit, useTags, useBackup, useFileImport, useColumnMapping.
 *
 * In: nothing. Out: `{ tasks, applyCsvImport, updateTask, setStatus, getTask,
 * addTask, removeTask, restoreTask, removeTasks, restoreTasks }`. `tasks` is a
 * ref with the array of task objects (fields are defined in
 * src/utils/taskModel.js).
 *
 * In the background: localStorage key `duedate.taskStore.v1` (`{ tasks }`)
 * and `duedate.schemaVersion`. A deep `watch` writes the store after every
 * change. On start, old data is upgraded (schema versions) or migrated once
 * from the pre-B1 keys.
 *
 * Why module level: `tasks` exists once for the whole app; every view and
 * every other store sees and changes the same array.
 *
 * How to read this file: read `loadTasks` first, then the `watch` below it,
 * then `applyCsvImport`. The `watch` is the only place that writes the task
 * store during normal use; all actions just assign a new array to
 * `tasks.value`.
 */
import { ref, watch } from 'vue'
import { detectColumns } from '../utils/columnDetector.js'
import { isSavedMappingUsable } from '../utils/mapping.js'
import { migrateLegacy, mergeImport, rowsToTasks, withStatus, createManualTask, upgradeToV3, upgradeToV4, upgradeToV5, SCHEMA_VERSION } from '../utils/taskModel.js'

/**
 * The task store (since B1): every task is its own object, persisted in
 * localStorage. Shared module-level singleton like the other stores.
 *
 * Migration: on first start after B1 the old data (raw CSV rows, column
 * mapping, per-task planning) is converted once. The old keys are left in
 * place as a fallback and are not written to anymore.
 * (Not quite: useCSVImport.js and useColumnMapping.js still write the rows
 * and mapping keys, because the CSV import still uses them. This file only
 * reads them.)
 */
const STORE_KEY = 'duedate.taskStore.v1'
const SCHEMA_KEY = 'duedate.schemaVersion'
export { SCHEMA_VERSION }

// Storage keys from before B1, read only by the one-time migration.
const LEGACY = {
  rows: 'duedate.tasks.v1',
  mapping: 'duedate.columnMapping.v1',
  planning: 'duedate.taskPlanning.v1',
}

/**
 * Reads and parses one JSON value from localStorage.
 *
 * @param {string} key storage key
 * @returns {*} the parsed value, or null if missing or unreadable
 */
function readJSON(key) {
  // Blocked storage or broken JSON: treat it as missing and log the key.
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn(`[Tasks] Could not read ${key}:`, e)
    return null
  }
}

/**
 * Writes one value as JSON to localStorage.
 *
 * @param {string} key storage key
 * @param {*} value anything JSON can hold
 * @sideeffect writes localStorage
 */
function writeJSON(key, value) {
  // A full storage must not break the app; the data stays in memory for this
  // session, only the next reload would miss the change.
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[Tasks] Could not write ${key}:`, e)
  }
}

/**
 * Builds the legacy migration input from localStorage. Exported for tests.
 *
 * @returns {{ rows: object[], mapping: object, planning: object }|null}
 *   null if there were no old CSV rows
 */
export function readLegacyInput() {
  const saved = readJSON(LEGACY.rows)
  const rows = Array.isArray(saved?.rows) ? saved.rows : []
  // Nothing was ever imported before B1: nothing to migrate.
  if (rows.length === 0) return null
  const headers = Object.keys(rows[0] || {})
  const savedMapping = readJSON(LEGACY.mapping)
  // Use the mapping the user confirmed back then if it still fits; otherwise
  // detect the columns again.
  const mapping = isSavedMappingUsable(savedMapping, headers)
    ? savedMapping
    : detectColumns(headers, rows).mapping
  return { rows, mapping, planning: readJSON(LEGACY.planning) || {} }
}

/**
 * Loads the tasks at start. Three cases: a current store, an older store that
 * needs upgrading, or no store at all (first start, maybe with pre-B1 data).
 *
 * @returns {object[]} the task list in the current schema
 * @sideeffect may write the upgraded or migrated store and the schema version
 */
function loadTasks() {
  const stored = readJSON(STORE_KEY)
  if (stored && Array.isArray(stored.tasks)) {
    // Stores from before the version key existed are schema 2.
    const version = readJSON(SCHEMA_KEY) || 2
    // Saved by an older app version: run every upgrade step it missed, in
    // order, then save the result once.
    // Note: a new SCHEMA_VERSION needs its own upgrade line here, otherwise
    // the version is bumped without converting the data.
    if (version < SCHEMA_VERSION) {
      let upgraded = stored.tasks
      if (version < 3) upgraded = upgradeToV3(upgraded)
      if (version < 4) upgraded = upgradeToV4(upgraded)
      if (version < 5) upgraded = upgradeToV5(upgraded)
      writeJSON(STORE_KEY, { tasks: upgraded })
      writeJSON(SCHEMA_KEY, SCHEMA_VERSION)
      return upgraded
    }
    // HINWEIS: Data from a newer app version (version > SCHEMA_VERSION, e.g.
    // after restoring a newer backup) is used as it is, without a warning.
    return stored.tasks
  }

  // First start after B1: migrate once
  const legacy = readLegacyInput()
  const tasks = legacy ? migrateLegacy(legacy) : []
  // Written right away, so the next start takes the first branch above and
  // never migrates twice.
  writeJSON(STORE_KEY, { tasks })
  writeJSON(SCHEMA_KEY, SCHEMA_VERSION)
  if (legacy) console.info(`[Tasks] Migrated ${tasks.length} tasks from the pre-B1 storage`)
  return tasks
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one task list for the
// whole app, created when this file is first imported.
const tasks = ref(loadTasks())

// `watch` is like `componentDidUpdate`, but it names the value it listens to.
// `deep: true` also reacts to changes inside the array, not only to a new
// array. This is the only place that saves the task store during normal use.
watch(tasks, (value) => writeJSON(STORE_KEY, { tasks: value }), { deep: true })

/**
 * Applies a confirmed CSV import (rows + mapping) to the store.
 * Tasks that already exist are updated, new ones are added (see mergeImport).
 *
 * @param {object[]} rows raw CSV rows from useCSVImport.js
 * @param {object} mapping role -> column name from useColumnMapping.js
 * @sideeffect replaces `tasks.value`
 */
function applyCsvImport(rows, mapping) {
  // One timestamp for the whole import, so all created tasks share it.
  const now = new Date()
  tasks.value = mergeImport(tasks.value, rowsToTasks(rows, mapping, now), now)
}

/**
 * Shallow update of one task; bumps updatedAt.
 *
 * @param {string} id task id
 * @param {object} patch fields to overwrite (not merged into nested objects)
 * @sideeffect replaces `tasks.value`
 */
function updateTask(id, patch) {
  const now = new Date().toISOString()
  // A new array with one replaced object, instead of changing the object in
  // place; like setState with a copy in React.
  tasks.value = tasks.value.map(t => (t.id === id ? { ...t, ...patch, updatedAt: now } : t))
}

/**
 * Marks a task done or open again (completedAt is maintained).
 *
 * @param {string} id task id
 * @param {'done'|'open'} status the new status
 * @sideeffect replaces `tasks.value`
 */
function setStatus(id, status) {
  const now = new Date()
  tasks.value = tasks.value.map(t => (t.id === id ? withStatus(t, status, now) : t))
}

/**
 * Creates a manual task and returns it.
 *
 * @param {object} fields what the user entered (title, due, area, …)
 * @returns {object} the new task with id and timestamps
 * @sideeffect appends to `tasks.value`
 */
function addTask(fields) {
  const task = createManualTask(fields)
  tasks.value = [...tasks.value, task]
  return task
}

/**
 * Removes a task; returns it (and its position) so it can be restored.
 *
 * @param {string} id task id
 * @returns {{ task: object, index: number }|null} undo data, or null if unknown
 * @sideeffect replaces `tasks.value`
 */
function removeTask(id) {
  const index = tasks.value.findIndex(t => t.id === id)
  if (index === -1) return null
  const task = tasks.value[index]
  tasks.value = tasks.value.filter(t => t.id !== id)
  return { task, index }
}

/**
 * Puts a removed task back where it was (undo).
 *
 * @param {{ task: object, index: number }} removed the value removeTask returned
 * @sideeffect replaces `tasks.value`
 */
function restoreTask({ task, index }) {
  // Undo clicked twice: the task is already back.
  if (tasks.value.some(t => t.id === task.id)) return
  const next = [...tasks.value]
  // The list may be shorter now; Math.min puts the task at the end then.
  next.splice(Math.min(index, next.length), 0, task)
  tasks.value = next
}

/**
 * Removes several tasks at once (cleanup); returns what is needed to put them back.
 *
 * @param {string[]} ids task ids
 * @returns {Array<{ task: object, index: number }>} the removed tasks with their old positions
 * @sideeffect replaces `tasks.value`
 */
function removeTasks(ids) {
  const gone = new Set(ids)
  const removed = tasks.value.map((task, index) => ({ task, index })).filter(e => gone.has(e.task.id))
  tasks.value = tasks.value.filter(t => !gone.has(t.id))
  return removed
}

/**
 * Undo of removeTasks: every task returns to its old position.
 *
 * @param {Array<{ task: object, index: number }>} removed the value removeTasks returned
 * @sideeffect replaces `tasks.value`
 */
function restoreTasks(removed) {
  const have = new Set(tasks.value.map(t => t.id))
  const next = [...tasks.value]
  // Insert from the lowest old index upwards. Each insert shifts the later
  // positions by one, which is exactly what the later, higher indexes expect.
  for (const { task, index } of [...removed].sort((a, b) => a.index - b.index)) {
    // Skip tasks that are already in the list (undo clicked twice).
    if (!have.has(task.id)) next.splice(Math.min(index, next.length), 0, task)
  }
  tasks.value = next
}

/**
 * @param {string} id task id
 * @returns {object|null} the task from the store, or null if there is none
 */
function getTask(id) {
  return tasks.value.find(t => t.id === id) || null
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {object} the shared `tasks` ref and the actions from the file header
 */
export function useTasks() {
  return { tasks, applyCsvImport, updateTask, setStatus, getTask, addTask, removeTask, restoreTask, removeTasks, restoreTasks }
}
