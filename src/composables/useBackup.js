/**
 * useBackup: everything behind "Data" in the settings. It downloads a backup
 * file, reads one back in, restores it, deletes all data, and decides when to
 * show the quiet "make a backup" reminder on Home.
 *
 * Called by: src/components/DataSettings.vue:20 (export, restore, delete),
 * src/views/HomeView.vue:43 (reminder and quick export), src/App.vue:68
 * (`takeAfterReloadNotice`), src/utils/__tests__/backup.test.js (`shouldHint`).
 *
 * In: nothing. Out: `{ current, lastBackup, exportBackup, readFile, restore,
 * wipe, showHint, snoozeHint }`. `current` counts what the app holds now,
 * `lastBackup` is the ISO time of the last export, `showHint` says whether the
 * reminder should be visible.
 *
 * In the background: localStorage keys `duedate.lastBackup.v1` and
 * `duedate.backupHintUntil.v1`; sessionStorage key `duedate.afterReload` for
 * the message after a reload. Restore and delete reload the whole page.
 *
 * Why module level: `lastBackup` and `hintUntil` exist once, so Home and the
 * settings page show the same date. The stores it reads (tasks, tags, blocks)
 * are shared singletons as well.
 *
 * How to read this file: `shouldHint` is the pure rule (easy to test), then
 * `useBackup()` from top to bottom. The invisible link: `restore` and `wipe`
 * write straight into localStorage and reload, because every store reads its
 * data only once, at import time.
 */
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

/**
 * Reads one localStorage value.
 *
 * @param {string} key storage key
 * @returns {string|null} the stored text, or null if missing or unreadable
 */
function read(key) {
  // Blocked storage (private mode, strict settings) throws; treat it like
  // "nothing saved yet".
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/**
 * Writes one localStorage value and only warns if that fails.
 *
 * @param {string} key storage key
 * @param {string} value text to store
 * @sideeffect writes localStorage
 */
function write(key, value) {
  // A failed write only loses the "last backup" date or the snooze, which is
  // not worth an error for the user.
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    console.warn('[Backup] LocalStorage write failed:', e)
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one value for the whole app.
const lastBackup = ref(read(LAST_KEY)) // ISO string or null
// Missing or broken value -> Number(null) is 0, Number('abc') is NaN; both end
// up as 0, which means "no snooze".
const hintUntil = ref(Number(read(HINT_KEY)) || 0)

/**
 * Starts a browser download of `text` as a file.
 *
 * @param {string} text file content
 * @param {string} filename suggested file name
 * @sideeffect adds and removes a hidden link in the page, triggers a download
 */
function download(text, filename) {
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  // Browsers only download on a click on a link with a `download` attribute,
  // so we build one, click it in code and remove it again.
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  // HINWEIS: The object URL is released right after click(); some browsers
  // start the download asynchronously and may then find the URL gone.
  URL.revokeObjectURL(url)
}

/**
 * Pure rule for the quiet reminder; exported for tests.
 *
 * @param {{ taskCount: number, lastBackupISO: string|null, hintUntilMs: number, now?: number }} input
 *   `hintUntilMs` is the end of a snooze in ms since 1970, 0 if none
 * @returns {boolean} true if the reminder should be shown
 */
export function shouldHint({ taskCount, lastBackupISO, hintUntilMs, now = Date.now() }) {
  // Few tasks are not worth a reminder, and a snoozed reminder stays quiet.
  if (taskCount < HINT_MIN_TASKS || now < hintUntilMs) return false
  // Never backed up at all.
  if (!lastBackupISO) return true
  const last = Date.parse(lastBackupISO)
  // An unreadable date counts as "too old", so the user is asked once more.
  return Number.isNaN(last) || now - last > HINT_AFTER_DAYS * DAY
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ current: import('vue').ComputedRef<object>, lastBackup: import('vue').Ref<string|null>,
 *   exportBackup: Function, readFile: Function, restore: Function, wipe: Function,
 *   showHint: import('vue').ComputedRef<boolean>, snoozeHint: Function }}
 */
export function useBackup() {
  const { tasks } = useTasks()
  const { tags } = useTags()
  const { blocks } = useAvailability()

  // `computed` is like a getter that React would recompute in `render`, but
  // Vue caches it until one of the refs it reads (tasks, tags, blocks) changes.
  /** What the app holds right now (for the "current vs. backup" preview). */
  const current = computed(() => ({
    tasks: tasks.value.length,
    open: tasks.value.filter(t => t.status !== 'done').length,
    done: tasks.value.filter(t => t.status === 'done').length,
    tags: tags.value.length,
    blocks: blocks.value.length,
  }))

  /**
   * Downloads a backup of all DueDate keys and remembers the time.
   *
   * @sideeffect file download, writes `duedate.lastBackup.v1`
   */
  function exportBackup() {
    // One `now` for both the file content and the file name, so they match.
    const now = new Date()
    download(JSON.stringify(createBackup(localStorage, now), null, 2), backupFilename(now))
    lastBackup.value = now.toISOString()
    write(LAST_KEY, lastBackup.value)
  }

  /**
   * Reads and checks a backup file chosen by the user.
   * File -> { backup, summary } or { error: { code, params } }
   *
   * @param {File} file the selected file
   * @returns {Promise<object>} the parsed backup with a summary, or an error object
   */
  async function readFile(file) {
    // file.text() or parseBackup can throw on a file that is not text or not
    // JSON at all; the caller gets one error code instead of an exception.
    try {
      return parseBackup(await file.text())
    } catch {
      return { error: { code: 'not_json', params: {} } }
    }
  }

  /**
   * Replaces all data with the backup and reloads the page.
   *
   * @param {object} backup the parsed backup from readFile
   * @param {{ tasks: number }} summary counts from readFile, used for the message
   * @sideeffect overwrites localStorage, writes sessionStorage, reloads the page
   */
  function restore(backup, summary) {
    applyBackup(backup, localStorage)
    // Order matters: the notice must be stored before the reload, because the
    // reload ends this script. App.vue reads it on the next start.
    // HINWEIS: sessionStorage.setItem is not in a try/catch; if it throws, the
    // data is already overwritten but the page does not reload, and the old
    // in-memory stores can write their old data back on the next change.
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ kind: 'restored', count: summary.tasks }))
    location.reload()
  }

  /**
   * Deletes all DueDate data and reloads the page.
   *
   * @sideeffect clears localStorage keys, writes sessionStorage, reloads the page
   */
  function wipe() {
    clearAllData(localStorage)
    // HINWEIS: Same as in restore: if sessionStorage throws, there is no
    // reload and the in-memory stores still hold the deleted data.
    sessionStorage.setItem(NOTICE_KEY, JSON.stringify({ kind: 'wiped' }))
    location.reload()
  }

  const showHint = computed(() => shouldHint({
    taskCount: tasks.value.length, lastBackupISO: lastBackup.value, hintUntilMs: hintUntil.value,
  }))

  /**
   * Hides the reminder for a number of days.
   *
   * @param {number} [days=7] how long to stay quiet
   * @sideeffect writes `duedate.backupHintUntil.v1`
   */
  function snoozeHint(days = 7) {
    hintUntil.value = Date.now() + days * DAY
    write(HINT_KEY, String(hintUntil.value))
  }

  return { current, lastBackup, exportBackup, readFile, restore, wipe, showHint, snoozeHint }
}

/**
 * Message for what happened before the last reload ("restored", "wiped"), once.
 *
 * @returns {{ kind: string, count?: number }|null} the stored notice, or null
 * @sideeffect removes the notice from sessionStorage, so it shows only once
 */
export function takeAfterReloadNotice() {
  // Blocked sessionStorage or a broken JSON string: no message, the app starts
  // normally.
  try {
    const raw = sessionStorage.getItem(NOTICE_KEY)
    sessionStorage.removeItem(NOTICE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
