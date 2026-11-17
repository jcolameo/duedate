/**
 * useTagFilter: remembers which tag the task lists are filtered by ('all' or
 * one tag id). It works like useAreaFilter.js, but for tags.
 *
 * Called by: src/views/HomeView.vue:40, src/views/DeadlinesView.vue:47,
 * src/components/TagFilter.vue:14 (the control that changes it).
 *
 * In: nothing. Out: `{ tagFilter }`, a ref with 'all' or a tag id.
 *
 * In the background: two `watch`es. One resets the filter to 'all' when its
 * tag no longer exists; the other saves every change under
 * `duedate.tagFilter.v1`.
 *
 * Why module level: `tagFilter` exists once, so Home and Deadlines filter by
 * the same tag.
 *
 * How to read this file: `load()`, then the two watches in their order. The
 * invisible link: `tagsById` comes from useTags.js, so deleting a tag in the
 * settings resets this filter.
 */
import { ref, watch } from 'vue'
import { useTags } from './useTags.js'

/** Shared tag filter ('all' or a tag ID), like the area filter. */
const STORAGE_KEY = 'duedate.tagFilter.v1'

/**
 * Reads the saved filter.
 *
 * @returns {string} 'all' or a tag id (not yet checked against existing tags)
 */
function load() {
  // Blocked storage: show everything.
  try {
    return localStorage.getItem(STORAGE_KEY) || 'all'
  } catch {
    return 'all'
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one filter for the whole app.
const tagFilter = ref(load())
const { tagsById } = useTags()

// `watch` is like `componentDidUpdate`, but it names the values it listens to.
// `{ immediate: true }` runs it once right away, so a saved filter for a tag
// that no longer exists is cleared at start.
// Order: this watch is registered before the saving watch below, so its first
// immediate reset is not written to storage; that is harmless, because the
// next start resets it again.
// A deleted tag must not leave an invisible filter behind
watch([tagFilter, tagsById], ([value, byId]) => {
  if (value !== 'all' && !byId.has(value)) tagFilter.value = 'all'
}, { immediate: true })

watch(tagFilter, (value) => {
  // A failed save only means the filter is not remembered after a reload.
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch (e) {
    console.warn('[TagFilter] LocalStorage write failed:', e)
  }
})

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ tagFilter: import('vue').Ref<string> }}
 */
export function useTagFilter() {
  return { tagFilter }
}
