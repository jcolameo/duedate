import { ref, watch } from 'vue'
import { useTags } from './useTags.js'

/** Shared tag filter ('all' or a tag ID), like the area filter. */
const STORAGE_KEY = 'duedate.tagFilter.v1'

function load() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'all'
  } catch {
    return 'all'
  }
}

const tagFilter = ref(load())
const { tagsById } = useTags()

// A deleted tag must not leave an invisible filter behind
watch([tagFilter, tagsById], ([value, byId]) => {
  if (value !== 'all' && !byId.has(value)) tagFilter.value = 'all'
}, { immediate: true })

watch(tagFilter, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch (e) {
    console.warn('[TagFilter] LocalStorage write failed:', e)
  }
})

export function useTagFilter() {
  return { tagFilter }
}
