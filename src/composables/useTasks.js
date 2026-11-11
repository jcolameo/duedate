import { ref, watch } from 'vue'
import { detectColumns } from '../utils/columnDetector.js'
import { isSavedMappingUsable } from '../utils/mapping.js'
import { migrateLegacy, mergeImport, rowsToTasks } from '../utils/taskModel.js'

/**
 * The task store (since B1): every task is its own object, persisted in
 * localStorage. Shared module-level singleton like the other stores.
 *
 * Migration: on first start after B1 the old data (raw CSV rows, column
 * mapping, per-task planning) is converted once. The old keys are left in
 * place as a fallback and are not written to anymore.
 */
const STORE_KEY = 'duedate.taskStore.v1'
const SCHEMA_KEY = 'duedate.schemaVersion'
export const SCHEMA_VERSION = 2

const LEGACY = {
  rows: 'duedate.tasks.v1',
  mapping: 'duedate.columnMapping.v1',
  planning: 'duedate.taskPlanning.v1',
}

function readJSON(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch (e) {
    console.warn(`[Tasks] Could not read ${key}:`, e)
    return null
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.warn(`[Tasks] Could not write ${key}:`, e)
  }
}

/** Builds the legacy migration input from localStorage. Exported for tests. */
export function readLegacyInput() {
  const saved = readJSON(LEGACY.rows)
  const rows = Array.isArray(saved?.rows) ? saved.rows : []
  if (rows.length === 0) return null
  const headers = Object.keys(rows[0] || {})
  const savedMapping = readJSON(LEGACY.mapping)
  const mapping = isSavedMappingUsable(savedMapping, headers)
    ? savedMapping
    : detectColumns(headers, rows).mapping
  return { rows, mapping, planning: readJSON(LEGACY.planning) || {} }
}

function loadTasks() {
  const stored = readJSON(STORE_KEY)
  if (stored && Array.isArray(stored.tasks)) return stored.tasks

  // First start after B1: migrate once
  const legacy = readLegacyInput()
  const tasks = legacy ? migrateLegacy(legacy) : []
  writeJSON(STORE_KEY, { tasks })
  writeJSON(SCHEMA_KEY, SCHEMA_VERSION)
  if (legacy) console.info(`[Tasks] Migrated ${tasks.length} tasks from the pre-B1 storage`)
  return tasks
}

const tasks = ref(loadTasks())

watch(tasks, (value) => writeJSON(STORE_KEY, { tasks: value }), { deep: true })

/** Applies a confirmed CSV import (rows + mapping) to the store. */
function applyCsvImport(rows, mapping) {
  const now = new Date()
  tasks.value = mergeImport(tasks.value, rowsToTasks(rows, mapping, now), now)
}

/** Shallow update of one task; bumps updatedAt. */
function updateTask(id, patch) {
  const now = new Date().toISOString()
  tasks.value = tasks.value.map(t => (t.id === id ? { ...t, ...patch, updatedAt: now } : t))
}

function getTask(id) {
  return tasks.value.find(t => t.id === id) || null
}

export function useTasks() {
  return { tasks, applyCsvImport, updateTask, getTask }
}
