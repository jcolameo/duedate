/**
 * A small, safe Markdown subset for task descriptions (B5b), without a dependency.
 *
 * Safety comes first: the whole text is HTML-escaped before anything is built,
 * so the only tags in the output are the ones generated here. Links are limited
 * to http(s) and mailto. That is what makes the result safe for `v-html`.
 *
 * Blocks: "# / ## / ###" headings, "- " and "* " lists, "1. " lists, checklist
 * items "- [ ] todo" and "- [x] done", paragraphs with single line breaks kept.
 *
 * Inline: **bold**, *italic* and _italic_, `code`, [text](https://...), and bare
 * https:// URLs.
 *
 * Checklist items become checkboxes with `data-check="<n>"`, where n is the
 * position among all checklist items in the text. The editor uses that number to
 * flip the matching "[ ]" in the source, which is why the numbering has to match
 * `parseChecklist()` exactly.
 */

/**
 * Escapes the five characters that could break out of text or an attribute.
 *
 * This runs before any tag is generated, so a "<" typed by the user can never
 * become a tag.
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Only http(s) and mailto survive; everything else (javascript:, data:) is refused. */
function safeUrl(url) {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null
}

const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"'

/**
 * Rewrites every "[text](url)" with the result of `make(text, url)`.
 *
 * Hand-written instead of a regex: the regex form backtracked quadratically on
 * long input (SEC-001). This walks the string once and gives up as soon as the
 * rest cannot contain a link any more, so the work stays linear.
 *
 * @param {string} s - already escaped text
 * @param {(text: string, url: string) => string} make - builds the replacement
 * @returns {string}
 */
function replaceLinks(s, make) {
  let out = ''
  let i = 0

  while (i < s.length) {
    const open = s.indexOf('[', i)
    if (open === -1) break

    const close = s.indexOf(']', open + 1)
    if (close === -1) break // no "]" left, so no link can follow

    // "[]" and "()" are not links: both parts need at least one character.
    if (close === open + 1 || s[close + 1] !== '(') {
      out += s.slice(i, close + 1)
      i = close + 1
      continue
    }

    let end = close + 2
    while (end < s.length && s[end] !== ')' && !/\s/.test(s[end])) end++
    if (end >= s.length) break // no ")" left, so no link can follow

    if (s[end] !== ')' || end === close + 2) {
      out += s.slice(i, close + 1)
      i = close + 1
      continue
    }

    out += s.slice(i, open) + make(s.slice(open + 1, close), s.slice(close + 2, end))
    i = end + 1
  }

  return out + s.slice(i)
}

/**
 * Inline formatting on one already escaped line.
 *
 * Code spans are pulled out first and put back at the end, so `**bold**` inside
 * backticks stays literal. The placeholder uses \u0000, a character that cannot
 * appear in user text after escaping.
 */
function inline(escaped) {
  const codes = []
  let s = escaped.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${code}</code>`)
    return `\u0000${codes.length - 1}\u0000`
  })

  // [text](url) — the URL is already escaped, which keeps quotes harmless.
  s = replaceLinks(s, (text, url) => {
    const href = safeUrl(url.replace(/&amp;/g, '&'))
    return href ? `<a href="${escapeHtml(href)}" ${LINK_ATTRS}>${text}</a>` : `[${text}](${url})`
  })

  // Bare URLs, but not inside an href or link text that was just created.
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) =>
    `${pre}<a href="${url}" ${LINK_ATTRS}>${url}</a>`)

  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
  s = s.replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')

  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)])
}

const BULLET = /^\s*[-*]\s+(.*)$/

/** "- [ ] text" / "- [x] text" (text may be empty): 1 = box, 2 = text. */
export const CHECK_ITEM = /^\s*[-*]\s+\[([ xX])\](?:\s+(.*))?$/

const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^(#{1,3})\s+(.*)$/

/**
 * Markdown text to a safe HTML string.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {string} [options.emptyItemLabel] - accessible name for checklist items
 *   without text, so a screen reader still announces something
 * @returns {string} HTML, safe for `v-html`
 */
export function renderMarkdown(text, { emptyItemLabel = '' } = {}) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let list = null // 'ul' | 'ol'
  let paragraph = []
  let checkIndex = 0

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(l => inline(escapeHtml(l))).join('<br>')}</p>`)
    paragraph = []
  }
  const closeList = () => {
    if (list) out.push(`</${list}>`)
    list = null
  }

  for (const line of lines) {
    const check = CHECK_ITEM.exec(line)
    if (check) {
      flushParagraph()
      if (list !== 'ul') { closeList(); out.push('<ul>'); list = 'ul' }
      const label = check[2] ? '' : ` aria-label="${escapeHtml(emptyItemLabel)}"`
      out.push(
        `<li class="dd-task"><label><input type="checkbox" data-check="${checkIndex++}"${label}${check[1] === ' ' ? '' : ' checked'}>` +
        `<span>${check[2] ? inline(escapeHtml(check[2])) : '&nbsp;'}</span></label></li>`,
      )
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = !bullet && NUMBERED.exec(line)
    const heading = HEADING.exec(line)

    if (bullet || numbered) {
      flushParagraph()
      const type = bullet ? 'ul' : 'ol'
      if (list !== type) { closeList(); out.push(`<${type}>`); list = type }
      out.push(`<li>${inline(escapeHtml((bullet || numbered)[1]))}</li>`)
    } else if (heading) {
      flushParagraph()
      closeList()
      // Inside the panel the task title is the h2, so descriptions start at h3.
      const level = Math.min(heading[1].length + 2, 5)
      out.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`)
    } else if (!line.trim()) {
      flushParagraph()
      closeList()
    } else {
      closeList()
      paragraph.push(line)
    }
  }

  flushParagraph()
  closeList()
  return out.join('')
}

/**
 * First meaningful line without Markdown syntax, for list previews.
 *
 * Checklist steps are skipped on purpose: they are shown as steps (next step,
 * progress), not as the description of the task.
 *
 * @param {string} text
 * @param {number} max - maximum length before the text is cut with "..."
 * @returns {string} empty when the text has no usable line
 */
export function markdownSummary(text, max = 120) {
  const line = String(text || '')
    .split('\n')
    .filter(l => !CHECK_ITEM.test(l))
    .map(l => l
      .replace(HEADING, '$2')
      .replace(BULLET, '$1')
      .replace(NUMBERED, '$1')
      .replace(/^\[[ xX]\]\s*/, '')
      .trim())
    .find(Boolean)

  if (!line) return ''

  const plain = replaceLinks(line, (text) => text)
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_`]/g, '')

  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}
