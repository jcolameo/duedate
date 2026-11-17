/**
 * User tags (B5c): free labels with a color, on top of area, priority and effort.
 *
 * Tags are stored once as `{ id, name, color }`; a task keeps only the IDs in
 * `tags`. That way renaming or recoloring a tag changes it everywhere at once
 * instead of leaving copies behind.
 *
 * Pure functions: the current time is a parameter, never read here.
 */

/** The palette. A color from outside is only accepted if it is in here. */
export const TAG_COLORS = ['gray', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'teal']

/** Longer names get cut, so a chip stays readable. */
export const TAG_NAME_MAX = 30

/**
 * Cleans a typed tag name: "  #Foto  grafie " becomes "Foto grafie".
 *
 * Leading hashes are dropped because the UI shows them itself, and runs of
 * spaces collapse so "Foto  grafie" and "Foto grafie" are the same tag.
 *
 * @param {string} name
 * @returns {string} empty when nothing usable is left
 */
export function normalizeTagName(name) {
  return String(name || '')
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .slice(0, TAG_NAME_MAX)
}

/** Comparison key: case-insensitive, Swiss locale, so "Foto" and "foto" match. */
const key = (name) => normalizeTagName(name).toLocaleLowerCase('de-CH')

/**
 * Finds a tag by name, ignoring case.
 *
 * @param {object[]} tags
 * @param {string} name
 * @returns {object|null}
 */
export function findTagByName(tags, name) {
  const wanted = key(name)
  return wanted ? tags.find(t => key(t.name) === wanted) || null : null
}

/**
 * Picks a color for a new tag: the first unused one, else round-robin.
 *
 * Starting with unused colors keeps a fresh list visually distinct instead of
 * giving every tag the same gray.
 */
export function nextTagColor(tags) {
  const used = new Set(tags.map(t => t.color))
  return TAG_COLORS.find(c => !used.has(c)) || TAG_COLORS[tags.length % TAG_COLORS.length]
}

/** ID for a new tag. Time plus random suffix, so two tags made at once differ. */
export function tagId(now = new Date()) {
  return `t-${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Makes sure a tag exists for every given name.
 *
 * Used by the quick-add parser: typing "#foto" creates the tag on the fly.
 * Names are normalized first, so duplicates in the input collapse.
 *
 * @param {object[]} tags - current tag list, not modified
 * @param {string[]} names - names as typed
 * @param {Date} now - passed in so IDs are testable
 * @returns {{ tags: object[], ids: string[] }} extended list and the IDs in input order
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

/**
 * Keeps the tasks carrying one tag.
 *
 * @param {object[]} tasks
 * @param {string} tagFilter - tag ID, or 'all'/empty for no filtering
 * @returns {object[]} the same array when nothing is filtered
 */
export function filterByTag(tasks, tagFilter) {
  if (!tagFilter || tagFilter === 'all') return tasks
  return tasks.filter(task => (task.tags || []).includes(tagFilter))
}

/**
 * The tag objects of a task, in the task's own order.
 *
 * IDs without a matching tag are skipped: a tag can be deleted while tasks
 * still reference it.
 *
 * @param {object} task
 * @param {Map<string, object>} tagsById
 * @returns {object[]}
 */
export function tagsOf(task, tagsById) {
  return (task.tags || []).map(id => tagsById.get(id)).filter(Boolean)
}
