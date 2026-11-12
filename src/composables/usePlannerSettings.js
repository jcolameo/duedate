import { ref, computed, watch } from 'vue'

/**
 * Planner settings (B8), persisted under duedate.plannerSettings.v1:
 * buffer (days before the deadline a task should be done) and the maximum
 * planned work per day. Everything else about the planner is fixed.
 */
const STORAGE_KEY = 'duedate.plannerSettings.v1'

export const BUFFER_OPTIONS = [0, 1, 2, 3, 5]
export const MAX_HOURS_OPTIONS = [3, 4, 6, 8, 10]
const DEFAULTS = { bufferDays: 1, maxPerDayHours: 6 }

/** Unknown or out-of-range values fall back to the defaults. */
export function normalizeSettings(value) {
  const v = value && typeof value === 'object' ? value : {}
  return {
    bufferDays: BUFFER_OPTIONS.includes(v.bufferDays) ? v.bufferDays : DEFAULTS.bufferDays,
    maxPerDayHours: MAX_HOURS_OPTIONS.includes(v.maxPerDayHours) ? v.maxPerDayHours : DEFAULTS.maxPerDayHours,
  }
}

function load() {
  try {
    return normalizeSettings(JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'))
  } catch {
    return normalizeSettings(null)
  }
}

const settings = ref(load())

watch(settings, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
  } catch (e) {
    console.warn('[PlannerSettings] LocalStorage write failed:', e)
  }
}, { deep: true })

/** Options for generatePlan() */
const plannerOptions = computed(() => ({
  bufferDays: settings.value.bufferDays,
  maxPerDayMin: settings.value.maxPerDayHours * 60,
}))

export function usePlannerSettings() {
  return { settings, plannerOptions }
}
