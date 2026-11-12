import { ref, watch } from 'vue'
import { normalizeAreaFilter } from '../utils/areas.js'

/**
 * Shared area filter (since B3): Overview and Deadlines show the same
 * selection, and it survives a reload.
 */
const STORAGE_KEY = 'duedate.areaFilter.v1'

function load() {
  try {
    return normalizeAreaFilter(localStorage.getItem(STORAGE_KEY))
  } catch {
    return 'all'
  }
}

const areaFilter = ref(load())

watch(areaFilter, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch (e) {
    console.warn('[AreaFilter] LocalStorage write failed:', e)
  }
})

export function useAreaFilter() {
  return { areaFilter }
}
