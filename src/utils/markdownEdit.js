/**
 * Pure text edits for the description toolbar and shortcuts (B5b).
 * Each takes { value, start, end } (textarea selection) and returns the
 * same shape with the new text and selection.
 */

/** **bold** / *italic* / `code` around the selection (or a placeholder). */
export function wrapSelection({ value, start, end }, marker, placeholder = '') {
  const selected = value.slice(start, end) || placeholder
  // Toggle off when the selection is already wrapped
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

function lineRange(value, start, end) {
  const from = value.lastIndexOf('\n', start - 1) + 1
  const nl = value.indexOf('\n', end)
  return [from, nl === -1 ? value.length : nl]
}

/**
 * Adds a prefix to every selected line ("- ", "1. ", "## "), or removes it
 * when all lines already have it. Numbered lists count up.
 */
export function toggleLinePrefix({ value, start, end }, kind) {
  const [from, to] = lineRange(value, start, end)
  const lines = value.slice(from, to).split('\n')
  const patterns = { bullet: /^[-*]\s+/, numbered: /^\d+[.)]\s+/, heading: /^#{1,3}\s+/ }
  const pattern = patterns[kind]
  const allHave = lines.every(l => pattern.test(l))
  const changed = lines.map((l, i) => {
    const bare = l.replace(patterns.bullet, '').replace(patterns.numbered, '').replace(patterns.heading, '')
    if (allHave) return bare
    if (kind === 'bullet') return `- ${bare}`
    if (kind === 'numbered') return `${i + 1}. ${bare}`
    return `## ${bare}`
  }).join('\n')
  const next = value.slice(0, from) + changed + value.slice(to)
  return { value: next, start: from, end: from + changed.length }
}

/** [text](https://) with the URL part selected for typing. */
export function insertLink({ value, start, end }, placeholder = 'Link') {
  const text = value.slice(start, end) || placeholder
  const url = 'https://'
  const snippet = `[${text}](${url})`
  const urlStart = start + text.length + 3
  return { value: value.slice(0, start) + snippet + value.slice(end), start: urlStart, end: urlStart + url.length }
}

/**
 * Enter inside a list item continues the list ("- " or "2. "); Enter on an
 * empty item ends the list. Returns null when nothing special applies.
 */
export function continueList({ value, start, end }) {
  if (start !== end) return null
  const from = value.lastIndexOf('\n', start - 1) + 1
  const line = value.slice(from, start)
  const m = /^(\s*)([-*]|\d+[.)])\s+(.*)$/.exec(line)
  if (!m) return null
  if (!m[3].trim()) {
    // Empty item: remove the marker and end the list
    return { value: value.slice(0, from) + value.slice(start), start: from, end: from }
  }
  const marker = /\d/.test(m[2]) ? `${parseInt(m[2], 10) + 1}${m[2].slice(-1)}` : m[2]
  const insert = `\n${m[1]}${marker} `
  const pos = start + insert.length
  return { value: value.slice(0, start) + insert + value.slice(end), start: pos, end: pos }
}
