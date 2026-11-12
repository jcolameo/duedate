/**
 * User tags (B5c): free labels with a color, on top of area/priority/effort.
 * Stored separately ({ id, name, color }); tasks keep tag IDs in `tags`, so
 * renaming or recoloring a tag changes it everywhere at once.
 */
export const TAG_COLORS = ['gray', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal']
export const TAG_NAME_MAX = 30

/** "  #Foto  grafie " -> "Foto grafie"; empty string when nothing usable is left. */
export function normalizeTagName(name) {
  return String(name || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, TAG_NAME_MAX)
}

const key = (name) => normalizeTagName(name).toLocaleLowerCase('de-CH')

/** Case-insensitive lookup by name. */
export function findTagByName(tags, name) {
  const k = key(name)
  return k ? tags.find(t => key(t.name) === k) || null : null
}

/** Next color: the first one not used yet, else round-robin. */
export function nextTagColor(tags) {
  const used = new Set(tags.map(t => t.color))
  return TAG_COLORS.find(c => !used.has(c)) || TAG_COLORS[tags.length % TAG_COLORS.length]
}

export function tagId(now = new Date()) {
  return `t-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Makes sure tags with these names exist. Returns the (possibly extended)
 * tag list and the IDs in the order of `names`, without duplicates.
 */
export function ensureTags(tags, names, now = new Date()) {
  let list = tags
  const ids = []
  for (const raw of names) {
    const name = normalizeTagName(raw)
    if (!name) continue
    let tag = findTagByName(list, name)
    if (!tag) {
      tag = { id: tagId(now), name, color: nextTagColor(list) }
      list = [...list, tag]
    }
    if (!ids.includes(tag.id)) ids.push(tag.id)
  }
  return { tags: list, ids }
}

/** Filter tasks by one tag ID; 'all' (or empty) returns the list as is. */
export function filterByTag(tasks, tagFilter) {
  if (!tagFilter || tagFilter === 'all') return tasks
  return tasks.filter(task => (task.tags || []).includes(tagFilter))
}

/** Tag objects of a task in its order, skipping IDs that no longer exist. */
export function tagsOf(task, tagsById) {
  return (task.tags || []).map(id => tagsById.get(id)).filter(Boolean)
}
