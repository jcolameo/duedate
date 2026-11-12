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

function load() {
  try {
    return normalizeToday(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return normalizeToday(null)
  }
}

// "Now" is a ref so an app left open over midnight switches to the new day
const now = ref(new Date())
const todayISO = computed(() => toISODate(now.value))
function refreshNow() {
  now.value = new Date()
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshNow() })
  window.addEventListener('focus', refreshNow)
  setInterval(refreshNow, 60_000)
}

const stored = ref(load())

watch(stored, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch (e) {
    console.warn('[Today] LocalStorage write failed:', e)
  }
}, { deep: true })

const isCurrent = computed(() => stored.value.date === todayISO.value)
const todayIds = computed(() => (isCurrent.value ? stored.value.ids : []))
const skippedIds = computed(() => (isCurrent.value ? stored.value.skipped : []))

function write(ids, skipped) {
  stored.value = { date: todayISO.value, ids, skipped }
}

/** Replaces today's list (morning ritual, "Tag ändern"). */
function setToday(ids) {
  write([...new Set(ids)], skippedIds.value)
}

/** Appends one task ("Noch eine Aufgabe"). */
function addToday(id) {
  if (!todayIds.value.includes(id)) write([...todayIds.value, id], skippedIds.value)
}

/** Swaps one task for another at the same position and remembers the first as skipped. */
function swapToday(oldId, newId) {
  const ids = todayIds.value.map(id => (id === oldId ? newId : id))
  write([...new Set(ids)], [...new Set([...skippedIds.value, oldId])])
}

export function useToday() {
  return { todayISO, todayIds, skippedIds, setToday, addToday, swapToday }
}
