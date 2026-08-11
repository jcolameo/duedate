import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'duedate.taskPlanning.v1'

export const EFFORT_OPTIONS = ['30m', '1h', '2h', '3h+']
export const PRIORITY_OPTIONS = ['high', 'medium', 'low']

/**
 * Per-task planning overrides (effort estimate, priority), keyed by the
 * stable task._id. Separate from the raw CSV data so it survives re-imports
 * of the same CSV. Shared module-level singleton, same pattern as
 * useTheme.js / useCSVImport.js.
 */
function loadSavedPlanning() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch (e) {
    console.warn('[TaskPlanning] LocalStorage read failed:', e)
    return {}
  }
}

const planning = ref(loadSavedPlanning())

watchEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(planning.value))
  } catch (e) {
    console.warn('[TaskPlanning] LocalStorage write failed:', e)
  }
})

function defaultPriority(task) {
  return task._isGraded ? 'high' : 'medium'
}

function getPlanningFor(task) {
  const entry = planning.value[task._id]
  return {
    effort: entry?.effort || null,
    priority: entry?.priority || defaultPriority(task),
  }
}

function setEffort(taskId, effort) {
  const current = planning.value[taskId] || {}
  planning.value = { ...planning.value, [taskId]: { ...current, effort } }
}

function setPriority(taskId, priority) {
  const current = planning.value[taskId] || {}
  planning.value = { ...planning.value, [taskId]: { ...current, priority } }
}

export function useTaskPlanning() {
  return { getPlanningFor, setEffort, setPriority }
}
