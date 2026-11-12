import { ref, computed, watch } from 'vue'
import { useTasks } from './useTasks.js'
import { ensureTags as ensureTagList, normalizeTagName, findTagByName, TAG_COLORS } from '../utils/tags.js'

/**
 * User tags (B5c), persisted under duedate.tags.v1 as { tags: Tag[] }.
 * Tasks only store tag IDs; deleting a tag removes it from all tasks.
 */
const STORAGE_KEY = 'duedate.tags.v1'

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return Array.isArray(saved?.tags)
      ? saved.tags.filter(t => t && t.id && t.name).map(t => ({ ...t, color: TAG_COLORS.includes(t.color) ? t.color : 'gray' }))
      : []
  } catch {
    return []
  }
}

const tags = ref(load())
const tagsById = computed(() => new Map(tags.value.map(t => [t.id, t])))

watch(tags, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tags: value }))
  } catch (e) {
    console.warn('[Tags] LocalStorage write failed:', e)
  }
}, { deep: true })

const { tasks } = useTasks()

/** Names -> tag IDs, creating tags that do not exist yet. */
function ensureTags(names) {
  const result = ensureTagList(tags.value, names)
  if (result.tags !== tags.value) tags.value = result.tags
  return result.ids
}

/**
 * Rename / recolor. Returns an error code instead of saving when the new
 * name is empty or already used by another tag.
 */
function updateTag(id, patch) {
  const next = { ...patch }
  if ('name' in next) {
    next.name = normalizeTagName(next.name)
    if (!next.name) return 'empty'
    const other = findTagByName(tags.value, next.name)
    if (other && other.id !== id) return 'duplicate'
  }
  tags.value = tags.value.map(t => (t.id === id ? { ...t, ...next } : t))
  return null
}

/** Deletes a tag everywhere; returns what is needed to undo it. */
function deleteTag(id) {
  const index = tags.value.findIndex(t => t.id === id)
  if (index === -1) return null
  const tag = tags.value[index]
  const taskIds = tasks.value.filter(t => (t.tags || []).includes(id)).map(t => t.id)
  tags.value = tags.value.filter(t => t.id !== id)
  tasks.value = tasks.value.map(t => (taskIds.includes(t.id) ? { ...t, tags: t.tags.filter(x => x !== id) } : t))
  return { tag, index, taskIds }
}

function restoreTag({ tag, index, taskIds }) {
  if (tags.value.some(t => t.id === tag.id)) return
  const next = [...tags.value]
  next.splice(Math.min(index, next.length), 0, tag)
  tags.value = next
  tasks.value = tasks.value.map(t => (taskIds.includes(t.id) && !(t.tags || []).includes(tag.id) ? { ...t, tags: [...(t.tags || []), tag.id] } : t))
}

/** How many tasks use each tag (for settings and the filter). */
const usage = computed(() => {
  const counts = new Map()
  for (const task of tasks.value) for (const id of task.tags || []) counts.set(id, (counts.get(id) || 0) + 1)
  return counts
})

export function useTags() {
  return { tags, tagsById, usage, ensureTags, updateTag, deleteTag, restoreTag }
}
