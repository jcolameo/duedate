/**
 * Helpers for the saved CSV column mapping.
 *
 * The mapping says which CSV column fills which task field, for example
 * `{ title: 'Titel', deadline: 'Fällig am' }`. It is stored per user so the next
 * import of the same export does not ask again.
 *
 * Pure functions: no storage, no Vue.
 */

/**
 * Sets one role, or clears it when `column` is empty.
 *
 * Clearing deletes the key instead of storing `null`. A stored `null` would look
 * like an assigned column to the reuse check below and block the saved mapping.
 *
 * @param {object} mapping - current mapping, not modified
 * @param {string} role - task field, e.g. 'title' or 'deadline'
 * @param {string|null} column - CSV header to use, or empty to clear the role
 * @returns {object} new mapping
 */
export function withRole(mapping, role, column) {
  const next = { ...mapping }
  if (column) next[role] = column
  else delete next[role]
  return next
}

/**
 * Can this saved mapping be reused for the new file without asking?
 *
 * Only when both required roles are set and every assigned column still exists
 * in the new header row. Empty values are skipped: older versions stored them.
 *
 * @param {object|null} saved - mapping from a previous import
 * @param {string[]} headers - header row of the file being imported
 * @returns {boolean}
 */
export function isSavedMappingUsable(saved, headers) {
  if (!saved || !saved.title || !saved.deadline) return false
  const headerSet = new Set(headers)
  return Object.values(saved).filter(Boolean).every((col) => headerSet.has(col))
}
