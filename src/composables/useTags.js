/**
 * useTags: the user's own labels for tasks ("Exam", "Group work", …) with a
 * name and a colour. Tasks only store the tag ids; this file owns the list.
 *
 * Called by: src/components/TagMenu.vue:21 (create, rename, recolour,
 * delete, undo), src/components/QuickAdd.vue:60 and
 * src/components/TagPicker.vue:14 (choose tags), src/components/TagFilter.vue:13,
 * src/views/HomeView.vue:41 and src/views/DeadlinesView.vue:48 (show tags),
 * and inside this folder by useTagFilter.js and useBackup.js.
 *
 * In: nothing. Out: `{ tags, tagsById, usage, ensureTags, updateTag,
 * deleteTag, restoreTag }`. `tags` is the array `{ id, name, color, … }`,
 * `tagsById` a Map for fast lookup, `usage` a Map tag id -> number of tasks.
 *
 * In the background: a deep `watch` saves the list under `duedate.tags.v1` as
 * `{ tags: [...] }`. `deleteTag` and `restoreTag` also change the tasks in
 * useTasks.js.
 *
 * Why module level: one tag list for the whole app, so a tag renamed in the
 * menu is renamed everywhere at once.
 *
 * How to read this file: `load()` and the `watch` first, then the actions.
 * `deleteTag` and `restoreTag` are a pair: the first returns exactly what the
 * second needs for undo.
 */
import { ref, computed, watch } from 'vue'
import { useTasks } from './useTasks.js'
import { ensureTags as ensureTagList, normalizeTagName, findTagByName, TAG_COLORS } from '../utils/tags.js'

/**
 * User tags (B5c), persisted under duedate.tags.v1 as { tags: Tag[] }.
 * Tasks only store tag IDs; deleting a tag removes it from all tasks.
 */
const STORAGE_KEY = 'duedate.tags.v1'

/**
 * Reads the saved tags and drops broken entries.
 *
 * @returns {object[]} tags with id, name and a known colour
 */
function load() {
  // Blocked storage or broken JSON: start without tags.
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    // Keep only entries with id and name; an unknown colour becomes gray.
    return Array.isArray(saved?.tags)
      ? saved.tags.filter(t => t && t.id && t.name).map(t => ({ ...t, color: TAG_COLORS.includes(t.color) ? t.color : 'gray' }))
      : []
  } catch {
    return []
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one tag list for the whole app.
const tags = ref(load())
// `computed` is like a getter that React would recompute in `render`, but Vue
// caches it until `tags` changes. Here: the same tags, keyed by id.
const tagsById = computed(() => new Map(tags.value.map(t => [t.id, t])))

// `watch` is like `componentDidUpdate`, but it names the value it listens to.
// `deep: true` also notices changes inside the array.
watch(tags, (value) => {
  // A failed save keeps the tags for this session only.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tags: value }))
  } catch (e) {
    console.warn('[Tags] LocalStorage write failed:', e)
  }
}, { deep: true })

const { tasks } = useTasks()

/**
 * Names -> tag IDs, creating tags that do not exist yet.
 *
 * @param {string[]} names tag names typed by the user
 * @returns {string[]} the ids in input order; empty names are skipped, repeats appear once
 * @sideeffect may add new tags to `tags`
 */
function ensureTags(names) {
  const result = ensureTagList(tags.value, names)
  // utils/tags.js returns the same array if nothing was created; only assign
  // when it changed, so the save watch does not run for nothing.
  if (result.tags !== tags.value) tags.value = result.tags
  return result.ids
}

/**
 * Rename / recolor. Returns an error code instead of saving when the new
 * name is empty or already used by another tag.
 *
 * @param {string} id tag id
 * @param {{ name?: string, color?: string }} patch the fields to change
 * @returns {null|'empty'|'duplicate'} null on success
 * @sideeffect replaces `tags.value` on success
 */
function updateTag(id, patch) {
  const next = { ...patch }
  // Only a rename needs checks; a colour change never collides.
  if ('name' in next) {
    next.name = normalizeTagName(next.name)
    if (!next.name) return 'empty'
    const other = findTagByName(tags.value, next.name)
    // Renaming a tag to its own name (e.g. only changing capitals) is fine.
    if (other && other.id !== id) return 'duplicate'
  }
  tags.value = tags.value.map(t => (t.id === id ? { ...t, ...next } : t))
  return null
}

/**
 * Deletes a tag everywhere; returns what is needed to undo it.
 *
 * @param {string} id tag id
 * @returns {{ tag: object, index: number, taskIds: string[] }|null} undo data, or null if unknown
 * @sideeffect replaces `tags.value` and `tasks.value`
 */
function deleteTag(id) {
  const index = tags.value.findIndex(t => t.id === id)
  if (index === -1) return null
  const tag = tags.value[index]
  // Remember which tasks had the tag before removing it, for the undo.
  const taskIds = tasks.value.filter(t => (t.tags || []).includes(id)).map(t => t.id)
  tags.value = tags.value.filter(t => t.id !== id)
  // HINWEIS: The tasks are changed directly, not through updateTask, so their
  // `updatedAt` stays the same although their tags changed.
  tasks.value = tasks.value.map(t => (taskIds.includes(t.id) ? { ...t, tags: t.tags.filter(x => x !== id) } : t))
  return { tag, index, taskIds }
}

/**
 * Undo of deleteTag: puts the tag back at its old position and onto the same
 * tasks again.
 *
 * @param {{ tag: object, index: number, taskIds: string[] }} undo the value deleteTag returned
 * @sideeffect replaces `tags.value` and `tasks.value`
 */
function restoreTag({ tag, index, taskIds }) {
  // Undo clicked twice: the tag is already back.
  if (tags.value.some(t => t.id === tag.id)) return
  const next = [...tags.value]
  next.splice(Math.min(index, next.length), 0, tag)
  tags.value = next
  // Only tasks that still exist and do not have the tag yet get it back.
  tasks.value = tasks.value.map(t => (taskIds.includes(t.id) && !(t.tags || []).includes(tag.id) ? { ...t, tags: [...(t.tags || []), tag.id] } : t))
}

/** How many tasks use each tag (for settings and the filter). */
const usage = computed(() => {
  const counts = new Map()
  for (const task of tasks.value) for (const id of task.tags || []) counts.set(id, (counts.get(id) || 0) + 1)
  return counts
})

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {object} the shared refs, computed values and actions from the file header
 */
export function useTags() {
  return { tags, tagsById, usage, ensureTags, updateTag, deleteTag, restoreTag }
}
