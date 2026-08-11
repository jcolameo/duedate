/**
 * Deterministic stable ID for a task, derived from title + deadline so the
 * same logical task keeps the same ID across re-imports of the same CSV,
 * unlike a per-render array index. Used to attach per-task planning data
 * (effort estimate, priority) that must survive re-parsing.
 */
export function taskId(title, deadline) {
  const raw = `${title || ''}|${deadline || ''}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0
  }
  return `t${hash}`
}
