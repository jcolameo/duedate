/**
 * Checklists inside the description (C1): lines "- [ ] step" / "- [x] step"
 * in the Markdown text are the steps of a task. One source of truth: the
 * text itself, so the editor, the detail panel and the overview all show the
 * same state. Indexes count checklist lines in document order, the same way
 * the renderer numbers its checkboxes.
 */
import { CHECK_ITEM, markdownSummary } from './markdown.js'

/** All checklist items: { index, text, checked, line } (line = line number). */
export function parseChecklist(markdown) {
  const items = []
  String(markdown || '').replace(/\r\n?/g, '\n').split('\n').forEach((line, lineNo) => {
    const m = CHECK_ITEM.exec(line)
    if (m) items.push({ index: items.length, text: (m[2] || '').trim(), checked: m[1] !== ' ', line: lineNo })
  })
  return items
}

/** Flips item `index`; unknown indexes leave the text unchanged. */
export function toggleChecklistItem(markdown, index) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
  const item = parseChecklist(markdown)[index]
  if (!item) return String(markdown || '')
  lines[item.line] = lines[item.line].replace(/\[([ xX])\]/, item.checked ? '[ ]' : '[x]')
  return lines.join('\n')
}

/**
 * Progress of a text: null without a checklist, else
 * { done, total, complete, next: { index, text } | null } where `next` is the
 * first step that is not checked yet (plain text, Markdown removed).
 */
export function checklistProgress(markdown) {
  const items = parseChecklist(markdown)
  if (!items.length) return null
  const done = items.filter(i => i.checked).length
  const open = items.find(i => !i.checked)
  return {
    done,
    total: items.length,
    complete: done === items.length,
    next: open ? { index: open.index, text: markdownSummary(open.text) || open.text } : null,
  }
}

/**
 * Where the user's own text lives: BBNet tasks keep their description from
 * the CSV (read-only), so their steps go into the notes.
 */
export function checklistFieldOf(task) {
  return task.source === 'csv' ? 'notes' : 'description'
}

export function checklistTextOf(task) {
  return task[checklistFieldOf(task)] || ''
}
