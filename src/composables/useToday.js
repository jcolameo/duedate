/**
 * useToday: the user's short list for today (up to three tasks, picked in the
 * morning ritual on Home) and the tasks they skipped today.
 *
 * Called by: src/views/HomeView.vue:46.
 *
 * In: nothing. Out: `{ todayISO, todayIds, skippedIds, setToday, addToday,
 * swapToday }`. `todayISO` is today's date as 'YYYY-MM-DD', `todayIds` and
 * `skippedIds` are task id arrays, empty on a new day.
 *
 * In the background: a deep `watch` saves `{ date, ids, skipped }` under
 * `duedate.today.v1`. A timer (every minute) plus the browser events
 * `focus` and `visibilitychange` update "now", so the list empties itself
 * after midnight.
 *
 * Why module level: one today list for the whole app; the timer and event
 * listeners are registered once at import and never removed.
 *
 * How to read this file: `now` and `todayISO` first (the clock), then
 * `stored` and its `watch` (the saved list), then `isCurrent`, which ties the
 * two together: the saved list only counts if its date is today.
 */
import { ref, computed, watch } from 'vue'
import { toISODate } from '../utils/taskModel.js'
import { normalizeToday } from '../utils/todaySuggestion.js'

/**
 * Today's plan (B6): up to three tasks the user picked for today, persisted
 * under duedate.today.v1 as { date, ids, skipped }. A new calendar day starts
 * empty: yesterday's picks are not carried over, the morning ritual asks
 * again (open tasks simply show up as suggestions).
 * `skipped` = tasks the user passed on today ("Andere vorschlagen").
 */
const STORAGE_KEY = 'duedate.today.v1'

/**
 * Reads the saved list.
 *
 * @returns {{ date: string, ids: string[], skipped: string[] }} always a valid shape
 */
function load() {
  // Blocked storage or broken JSON: start with an empty, dateless list.
  try {
    return normalizeToday(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return normalizeToday(null)
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one clock and one list for
// the whole app.
// "Now" is a ref so an app left open over midnight switches to the new day
const now = ref(new Date())
// `computed` is like a getter that React would recompute in `render`, but Vue
// caches it until `now` changes.
const todayISO = computed(() => toISODate(now.value))
/** Sets "now" to the current time; todayISO follows if the day changed. */
function refreshNow() {
  now.value = new Date()
}
// Only in a browser; in a test runner without a DOM there is no document,
// and the clock simply stays at import time.
if (typeof document !== 'undefined') {
  // Coming back to the tab or window, and once a minute while open.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNow() })
  window.addEventListener('focus', refreshNow)
  setInterval(refreshNow, 60_000)
}

const stored = ref(load())

// `watch` is like `componentDidUpdate`, but it names the value it listens to.
// `deep: true` also reacts to changes inside the stored object.
watch(stored, (value) => {
  // A failed save keeps today's list for this session only.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch (e) {
    console.warn('[Today] LocalStorage write failed:', e)
  }
}, { deep: true })

// The saved list belongs to today only if its date matches. On a new day this
// is false, so both lists below are empty without deleting anything.
const isCurrent = computed(() => stored.value.date === todayISO.value)
const todayIds = computed(() => (isCurrent.value ? stored.value.ids : []))
const skippedIds = computed(() => (isCurrent.value ? stored.value.skipped : []))

/**
 * Saves a new list for today.
 *
 * @param {string[]} ids today's task ids
 * @param {string[]} skipped task ids skipped today
 * @sideeffect replaces `stored.value`, which the watch saves
 */
function write(ids, skipped) {
  stored.value = { date: todayISO.value, ids, skipped }
}

/**
 * Replaces today's list (morning ritual, "Tag ändern").
 *
 * @param {string[]} ids the chosen task ids; duplicates are removed
 */
function setToday(ids) {
  write([...new Set(ids)], skippedIds.value)
}

/**
 * Appends one task ("Noch eine Aufgabe").
 *
 * @param {string} id task id; ignored if already in the list
 */
function addToday(id) {
  if (!todayIds.value.includes(id)) write([...todayIds.value, id], skippedIds.value)
}

/**
 * Swaps one task for another at the same position and remembers the first as skipped.
 *
 * @param {string} oldId the task to replace
 * @param {string} newId the task that takes its place
 */
function swapToday(oldId, newId) {
  const ids = todayIds.value.map(id => (id === oldId ? newId : id))
  // If newId was already in the list, the Set keeps only its first
  // occurrence, so the list gets one shorter.
  write([...new Set(ids)], [...new Set([...skippedIds.value, oldId])])
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {object} the computed values and actions from the file header
 */
export function useToday() {
  return { todayISO, todayIds, skippedIds, setToday, addToday, swapToday }
}
