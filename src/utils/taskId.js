/**
 * Stable task IDs derived from the task itself.
 *
 * A CSV import produces the same logical task again on every run. If the ID came
 * from the row position, the same task would get a new ID each time and lose its
 * planning data. Deriving it from title + deadline keeps it stable, and the same
 * value doubles as the ICS UID.
 *
 * Pure function: no storage, no clock, no Vue.
 */

/**
 * Builds the ID for a task.
 *
 * The hash is a small 31-based polynomial, the same shape Java uses for
 * `String.hashCode()`. It is not cryptographic; it only has to spread titles
 * over the ID space and stay identical across runs and browsers.
 *
 * @param {string} title - task title as written by the user or the CSV
 * @param {string|null} deadline - raw deadline text, part of the identity
 * @returns {string} ID such as "t-1847293012"
 */
export function taskId(title, deadline) {
  const raw = `${title || ''}|${deadline || ''}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    // `| 0` keeps the value a 32-bit integer, so the result is the same everywhere.
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return `t${hash}`
}
