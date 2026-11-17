/**
 * Checklists inside a task description (C1).
 *
 * A step is a Markdown line `- [ ] text` or `- [x] text`. The text itself is the
 * only storage: the editor, the detail panel and the overview all read the same
 * lines, so there is no second state that could drift.
 *
 * Indexes count checklist lines in document order, which is exactly how the
 * renderer numbers its checkboxes. That is what lets the UI toggle step 2 by
 * index without knowing where it sits in the text.
 *
 * Pure functions: no storage, no Vue.
 */
import { CHECK_ITEM, markdownSummary } from './markdown.js'

/**
 * All checklist items of a text.
 *
 * @param {string} markdown
 * @returns {{ index: number, text: string, checked: boolean, line: number }[]}
 *   `line` is the zero-based line number, used to rewrite the text in place
 */
export function parseChecklist(markdown) {
  const items = []
  // Normalise line endings first: a CRLF file would otherwise leave "\r" in the text.
  String(markdown || '').replace(/\r\n?/g, '\n').split('\n').forEach((line, lineNo) => {
    const match = CHECK_ITEM.exec(line)
    if (match) {
      items.push({
        index: items.length,
        text: (match[2] || '').trim(),
        checked: match[1] !== ' ',
        line: lineNo,
      })
    }
  })
  return items
}

/**
 * Flips one item between checked and open.
 *
 * An unknown index returns the text unchanged rather than throwing: the UI may
 * still hold an index from before the user edited the description.
 *
 * @param {string} markdown
 * @param {number} index
 * @returns {string} the new text
 */
export function toggleChecklistItem(markdown, index) {
  const lines = String(markdown || '').replace(/\r\n?/g, '\n').split('\n')
  const item = parseChecklist(markdown)[index]
  if (!item) return String(markdown || '')
  lines[item.line] = lines[item.line].replace(/\[([ xX])\]/, item.checked ? '[ ]' : '[x]')
  return lines.join('\n')
}

/**
 * How far the checklist is.
 *
 * @param {string} markdown
 * @returns {{ done: number, total: number, complete: boolean,
 *   next: { index: number, text: string }|null }|null}
 *   null when the text has no checklist at all; `next` is the first open step
 *   with its Markdown removed, so it can be shown as plain text
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
    next: open ? { index: open.index, text: markdownSummary(`- ${open.text}`) || open.text } : null,
  }
}

/**
 * Which field holds the user's own text.
 *
 * Tasks from the BBNet CSV keep their description as imported (read-only), so
 * their steps go into the notes instead of overwriting the CSV text.
 *
 * @param {object} task
 * @returns {'description'|'notes'}
 */
export function checklistFieldOf(task) {
  return task.source === 'csv' ? 'notes' : 'description'
}

/** The checklist text of a task, from whichever field applies. */
export function checklistTextOf(task) {
  return task[checklistFieldOf(task)] || ''
}
