/**
 * Text edits behind the description toolbar and its keyboard shortcuts (B5b).
 *
 * Every function takes `{ value, start, end }` — the text and the current
 * selection in the textarea — and returns the same shape with the new text and
 * the new selection. That keeps the component free of string surgery and makes
 * the behaviour testable without a DOM.
 *
 * Pure functions: no storage, no Vue.
 */

/**
 * Puts a marker around the selection, or removes it when it is already there.
 *
 * Used for **bold**, *italic* and `code`. With an empty selection the
 * placeholder is inserted and selected, so the user can type over it.
 *
 * @param {{ value: string, start: number, end: number }} state
 * @param {string} marker - '**', '*' or '`'
 * @param {string} placeholder - text to insert when nothing is selected
 * @returns {{ value: string, start: number, end: number }}
 */
export function wrapSelection({ value, start, end }, marker, placeholder = '') {
  const selected = value.slice(start, end) || placeholder

  // Already wrapped? Then the same click removes the markers again.
  const before = value.slice(start - marker.length, start)
  const after = value.slice(end, end + marker.length)
  if (start !== end && before === marker && after === marker) {
    return {
      value: value.slice(0, start - marker.length) + selected + value.slice(end + marker.length),
      start: start - marker.length,
      end: end - marker.length,
    }
  }

  const next = value.slice(0, start) + marker + selected + marker + value.slice(end)
  return { value: next, start: start + marker.length, end: start + marker.length + selected.length }
}

/**
 * Start and end of the lines the selection touches.
 *
 * A selection that ends exactly at a line start does not pull in that line,
 * which is what a user expects when selecting whole lines by dragging.
 */
function lineRange(value, start, end) {
  const from = value.lastIndexOf('\n', start - 1) + 1
  const newline = value.indexOf('\n', end)
  return [from, newline === -1 ? value.length : newline]
}

/**
 * Adds a prefix to every selected line, or removes it when all lines have it.
 *
 * Kinds: 'check' ("- [ ] "), 'bullet' ("- "), 'numbered' ("1. ") and 'heading'
 * ("## "). Numbered lists count up from 1. Switching between kinds replaces the
 * old marker instead of stacking them.
 *
 * @param {{ value: string, start: number, end: number }} state
 * @param {'check'|'bullet'|'numbered'|'heading'} kind
 * @returns {{ value: string, start: number, end: number }}
 */
export function toggleLinePrefix({ value, start, end }, kind) {
  const [from, to] = lineRange(value, start, end)
  const lines = value.slice(from, to).split('\n')

  // A checklist line ("- [ ] x") must not count as a plain bullet, hence the
  // negative lookahead in the bullet pattern.
  const patterns = {
    check: /^[-*]\s+\[[ xX]\]\s?/,
    bullet: /^[-*]\s+(?!\[[ xX]](?:\s|$))/,
    numbered: /^\d+[.)]\s+/,
    heading: /^#{1,3}\s+/,
  }
  const pattern = patterns[kind]
  const allHave = lines.every(l => pattern.test(l))

  const changed = lines.map((line, i) => {
    const bare = line
      .replace(patterns.check, '')
      .replace(patterns.bullet, '')
      .replace(patterns.numbered, '')
      .replace(patterns.heading, '')
    if (allHave) return bare
    if (kind === 'check') return `- [ ] ${bare}`
    if (kind === 'bullet') return `- ${bare}`
    if (kind === 'numbered') return `${i + 1}. ${bare}`
    return `## ${bare}`
  }).join('\n')

  const next = value.slice(0, from) + changed + value.slice(to)

  // With nothing selected the caret goes to the end of the line, so typing
  // continues it. A selection would be replaced by the first typed character.
  const collapsed = start === end
  return { value: next, start: collapsed ? from + changed.length : from, end: from + changed.length }
}

/**
 * Inserts a Markdown link and selects the URL part, ready to type over.
 *
 * @param {{ value: string, start: number, end: number }} state
 * @param {string} placeholder - link text when nothing is selected
 * @returns {{ value: string, start: number, end: number }}
 */
export function insertLink({ value, start, end }, placeholder = 'Link') {
  const text = value.slice(start, end) || placeholder
  const url = 'https://'
  const snippet = `[${text}](${url})`
  // "[text](" is text.length + 3 characters, then the URL starts.
  const urlStart = start + text.length + 3
  return { value: value.slice(0, start) + snippet + value.slice(end), start: urlStart, end: urlStart + url.length }
}

/**
 * Continues a list when Enter is pressed inside a list item.
 *
 * "- " becomes a new "- ", "2. " becomes "3. ", and a checklist item becomes a
 * new unchecked one. Enter on an empty item removes the marker and ends the
 * list, which is how every editor behaves.
 *
 * @param {{ value: string, start: number, end: number }} state
 * @returns {{ value: string, start: number, end: number }|null} null when the
 *   cursor is not in a list item, so the caller lets Enter do its normal thing
 */
export function continueList({ value, start, end }) {
  if (start !== end) return null

  const from = value.lastIndexOf('\n', start - 1) + 1
  const line = value.slice(from, start)
  const match = /^(\s*)([-*]|\d+[.)])\s+(.*)$/.exec(line)
  if (!match) return null

  // A checklist item continues as a new, unchecked one.
  const check = /^\[[ xX]\](?:\s+(.*))?$/.exec(match[3])
  const content = check ? check[1] || '' : match[3]

  if (!content.trim()) {
    // Empty item: drop the marker and leave the list.
    return { value: value.slice(0, from) + value.slice(start), start: from, end: from }
  }

  const marker = /\d/.test(match[2])
    ? `${parseInt(match[2], 10) + 1}${match[2].slice(-1)}`
    : check ? `${match[2]} [ ]` : match[2]

  const insert = `\n${match[1]}${marker} `
  const position = start + insert.length
  return { value: value.slice(0, start) + insert + value.slice(end), start: position, end: position }
}
