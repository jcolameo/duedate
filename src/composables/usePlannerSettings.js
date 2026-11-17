/**
 * usePlannerSettings: the few rules the user can set for the automatic
 * planner: buffer days before a deadline, maximum work hours per day, working
 * weekdays and the planning mode.
 *
 * Called by: src/views/StundenplanView.vue:39 and src/views/CalendarView.vue:39
 * (the settings controls; they also import BUFFER_OPTIONS, MAX_HOURS_OPTIONS,
 * PLAN_MODES), inside this folder by usePlanState.js and usePlanEdit.js
 * (`plannerOptions`), and src/utils/__tests__/planSummary.test.js
 * (`normalizeSettings`).
 *
 * In: nothing. Out: `{ settings, plannerOptions }`. `settings` is what the
 * user sees (hours), `plannerOptions` is the same in the shape generatePlan()
 * wants (minutes).
 *
 * In the background: a deep `watch` saves `settings` under
 * `duedate.plannerSettings.v1` after every change.
 *
 * Why module level: one `settings` ref for the whole app, so a change on the
 * calendar page is the same change on the Stundenplan page.
 *
 * How to read this file: `normalizeSettings` first (it decides what a valid
 * setting is), then `load`, the `watch` that saves, and `plannerOptions`.
 */
import { ref, computed, watch } from 'vue'
import { WEEKDAYS, sortDays } from '../utils/availability.js'

/**
 * Planner settings (B8), persisted under duedate.plannerSettings.v1:
 * buffer (days before the deadline a task should be done) and the maximum
 * planned work per day, the working weekdays (B11) and the planning mode (B13). Everything else about
 * the planner is fixed.
 */
const STORAGE_KEY = 'duedate.plannerSettings.v1'

export const BUFFER_OPTIONS = [0, 1, 2, 3, 5]
export const MAX_HOURS_OPTIONS = [3, 4, 6, 8, 10]
export const PLAN_MODES = ['even', 'early', 'bundled']
const DEFAULTS = { bufferDays: 1, maxPerDayHours: 6, workDays: [...WEEKDAYS], mode: 'even' }

/**
 * Valid weekday codes in week order; nothing usable means every day.
 *
 * @param {*} value whatever was stored
 * @returns {string[]} day codes like ['Mon', 'Wed'], never empty
 */
function normalizeWorkDays(value) {
  const days = Array.isArray(value) ? value.filter(d => WEEKDAYS.includes(d)) : []
  // An empty list would mean "never work"; the planner could not place
  // anything, so we fall back to all days. The Set removes duplicates.
  return days.length ? sortDays([...new Set(days)]) : [...DEFAULTS.workDays]
}

/**
 * Unknown or out-of-range values fall back to the defaults.
 *
 * @param {*} value the parsed stored object, or anything else
 * @returns {{ bufferDays: number, maxPerDayHours: number, workDays: string[], mode: string }}
 */
export function normalizeSettings(value) {
  // null, a number or a string from a broken save: treat as "nothing saved".
  const v = value && typeof value === 'object' ? value : {}
  return {
    bufferDays: BUFFER_OPTIONS.includes(v.bufferDays) ? v.bufferDays : DEFAULTS.bufferDays,
    maxPerDayHours: MAX_HOURS_OPTIONS.includes(v.maxPerDayHours) ? v.maxPerDayHours : DEFAULTS.maxPerDayHours,
    workDays: normalizeWorkDays(v.workDays),
    mode: PLAN_MODES.includes(v.mode) ? v.mode : DEFAULTS.mode,
  }
}

/**
 * Reads the saved settings.
 *
 * @returns {object} valid settings, defaults where needed
 */
function load() {
  // Blocked storage or broken JSON: start with the defaults.
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return normalizeSettings(null)
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one settings object for the
// whole app.
const settings = ref(load())

// `watch` is like `componentDidUpdate`, but it names the value it listens to.
// `deep: true` is needed because the UI changes single fields
// (settings.value.bufferDays = 2) instead of replacing the whole object.
watch(settings, (value) => {
  // A failed save keeps the setting for this session only.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch (e) {
    console.warn('[PlannerSettings] LocalStorage write failed:', e)
  }
}, { deep: true })

// `computed` is like a getter that React would recompute in `render`, but
// Vue caches it until `settings` changes.
/** Options for generatePlan(); hours are converted to minutes here. */
const plannerOptions = computed(() => ({
  bufferDays: settings.value.bufferDays,
  maxPerDayMin: settings.value.maxPerDayHours * 60,
  workDays: settings.value.workDays,
  mode: settings.value.mode,
}))

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ settings: import('vue').Ref<object>, plannerOptions: import('vue').ComputedRef<object> }}
 */
export function usePlannerSettings() {
  return { settings, plannerOptions }
}
