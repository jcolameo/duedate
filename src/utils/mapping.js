/**
 * Pure helpers for the user's saved column mapping ({ role: columnName }).
 */

/**
 * Sets or clears one role. Clearing removes the key instead of storing null,
 * so an intentionally unassigned optional field never invalidates the
 * saved mapping on the next import.
 */
export function withRole(mapping, role, column) {
  const next = { ...mapping }
  if (column) next[role] = column
  else delete next[role]
  return next
}

/**
 * A saved mapping can be reused automatically if it has both required roles
 * and every assigned column still exists in the new CSV. Empty values (from
 * mappings saved by older versions) are ignored.
 */
export function isSavedMappingUsable(saved, headers) {
  if (!saved || !saved.title || !saved.deadline) return false
  const headerSet = new Set(headers)
  return Object.values(saved).filter(Boolean).every((col) => headerSet.has(col))
}
