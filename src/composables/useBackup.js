import { ref, computed } from 'vue'
import { useTasks } from './useTasks.js'
import { useTags } from './useTags.js'
import { useAvailability } from './useAvailability.js'
import { createBackup, parseBackup, applyBackup, clearAllData, backupFilename } from '../utils/backup.js'

/**
 * Backup actions (B7). Export downloads a file and remembers when; restore
 * and "delete all" write to localStorage and reload the page, because every
 * store reads its data once at start.
 */
const LAST_KEY = 'duedate.lastBackup.v1'
const HINT_KEY = 'duedate.backupHintUntil.v1'
const NOTICE_KEY = 'duedate.afterReload' // sessionStorage, shown once after the reload

const DAY = 24 * 60 * 60 * 1000
export const HINT_AFTER_DAYS = 14
export const HINT_MIN_TASKS = 3

function read(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function write(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.warn('[Backup] LocalStorage write failed:', e)
  }
}

const lastBackup = ref(read(LAST_KEY)) // ISO string or null
const hintUntil = ref(Number(read(HINT_KEY)) || 0)

function download(text, filename) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Pure rule for the quiet reminder; exported for tests. */
export function shouldHint({ taskCount, lastBackupISO, hintUntilMs, now = Date.now() }) {
  if (taskCount < HINT_MIN_TASKS || now < hintUntilMs) return false
  if (!lastBackupISO) return true
  const last = Date.parse(lastBackupISO)
  return Number.isNaN(last) || now - last > HINT_AFTER_DAYS * DAY
}

export function useBackup() {
  const { tasks } = useTasks()
  const { tags } = useTags()
  const { blocks } = useAvailability()

  /** What the app holds right now (for the "current vs. backup" preview). */
  const current = computed(() => ({
    tasks: tasks.value.length,
    open: tasks.value.filter(t => t.status !== 'done').length,
    done: tasks.value.filter(t => t.status === 'done').length,
    tags: tags.value.length,
    blocks: blocks.value.length,
  }))

  function exportBackup() {
    const now = new Date()
    download(JSON.stringify(createBackup(localStorage, now), null, 2), backupFilename(now))
    lastBackup.value = now.toISOString()
    write(LAST_KEY, lastBackup.value)
  }

  /** File -> { backup, summary } or { error: { code, params } } */
  async function readFile(file) {
    try {
      return parseBackup(await file.text())
    } catch {
      return { error: { code: 'not_json', params: {} } }
    }
  }

  function restore(backup, summary) {
    applyBackup(backup, localStorage)
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ kind: 'restored', count: summary.tasks }))
    location.reload()
  }

  function wipe() {
    clearAllData(localStorage)
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ kind: 'wiped' }))
    location.reload()
  }

  const showHint = computed(() => shouldHint({
    taskCount: tasks.value.length, lastBackupISO: lastBackup.value, hintUntilMs: hintUntil.value,
  }))
  function snoozeHint(days = 7) {
    hintUntil.value = Date.now() + days * DAY
    write(HINT_KEY, String(hintUntil.value))
  }

  return { current, lastBackup, exportBackup, readFile, restore, wipe, showHint, snoozeHint }
}

/** Message for what happened before the last reload ("restored", "wiped"), once. */
export function takeAfterReloadNotice() {
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY)
    sessionStorage.removeItem(NOTICE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
