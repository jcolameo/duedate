/**
 * useAreaFilter: remembers which life area (study, work, private, or "all")
 * the user wants to see in the task lists.
 *
 * Called by: src/views/HomeView.vue:39, src/views/DeadlinesView.vue:46,
 * src/views/CalendarView.vue:48, src/components/AreaFilter.vue:15 (the
 * buttons that change it), src/components/QuickAdd.vue:37 (new tasks start in
 * the currently filtered area).
 *
 * In: nothing. Out: `{ areaFilter }`, a ref holding a string such as 'all'
 * or an area code from src/utils/areas.js.
 *
 * In the background: a `watch` writes every change to localStorage under
 * `duedate.areaFilter.v1`, so the choice survives a reload.
 *
 * Why module level: `areaFilter` is created once when the file is first
 * imported, so every caller gets the very same ref. Changing it on Home
 * changes it on Deadlines too (shared filter since B3).
 *
 * How to read this file: `load()` runs once at import, its result becomes the
 * ref, and the `watch` below is the only place that writes to localStorage.
 * `useAreaFilter()` itself only hands out the existing ref.
 */
import { ref, watch } from 'vue'
import { normalizeAreaFilter } from '../utils/areas.js'

/**
 * Shared area filter (since B3): Overview and Deadlines show the same
 * selection, and it survives a reload.
 */
const STORAGE_KEY = 'duedate.areaFilter.v1'

/**
 * Reads the saved filter. Unknown or missing values become 'all'
 * (normalizeAreaFilter checks against the list of known areas).
 *
 * @returns {string} 'all' or a known area code
 */
function load() {
  // localStorage can throw, e.g. when the browser blocks storage in a private
  // window. Then we simply start unfiltered instead of breaking the page.
  try {
    return normalizeAreaFilter(localStorage.getItem(STORAGE_KEY))
  } catch {
    return 'all'
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`. Vue re-renders every
// component that read `.value` when it changes.
// Module singleton: like a `static` field in Java, one instance for the whole
// app, not one per component.
const areaFilter = ref(load())

// `watch` is like `componentDidUpdate`, but it names the value it listens to:
// this callback runs after every change of `areaFilter`, not on start.
watch(areaFilter, (value) => {
  // A full or blocked storage must not break the filter itself; the choice
  // just will not survive a reload.
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch (e) {
    console.warn('[AreaFilter] LocalStorage write failed:', e)
  }
})

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ areaFilter: import('vue').Ref<string> }} the shared filter ref
 */
export function useAreaFilter() {
  return { areaFilter }
}
