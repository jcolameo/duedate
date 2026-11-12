/**
 * Small, safe Markdown subset for task descriptions (B5b), no dependency.
 * Everything is HTML-escaped first; only the tags below are generated, and
 * links are limited to http(s) and mailto. The output can go into v-html.
 *
 * Blocks: "# / ## / ###" headings, "- " / "* " lists, "1. " lists,
 * paragraphs (single line breaks kept). Inline: **bold**, *italic* / _italic_,
 * `code`, [text](https://…), bare https:// URLs.
 */

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(url) {
  return /^(https?:\/\/|mailto:)/i.test(url) ? url : null
}

const LINK_ATTRS = 'target="_blank" rel="noopener noreferrer"'

/** Inline formatting on one already escaped line. */
function inline(escaped) {
  // Protect code spans from further formatting
  const codes = []
  let s = escaped.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(`<code>${code}</code>`)
    return `\u0000${codes.length - 1}\u0000`
  })
  // [text](url) — the URL is already escaped, which keeps quotes harmless
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, text, url) => {
    const href = safeUrl(url.replace(/&amp;/g, '&'))
    return href ? `<a href="${escapeHtml(href)}" ${LINK_ATTRS}>${text}</a>` : match
  })
  // Bare URLs (not inside an href or link text we just created)
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) =>
    `${pre}<a href="${url}" ${LINK_ATTRS}>${url}</a>`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
  s = s.replace(/(^|[^\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>')
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[Number(i)])
}

const BULLET = /^\s*[-*]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/
const HEADING = /^(#{1,3})\s+(.*)$/

/** Markdown text -> safe HTML string. */
export function renderMarkdown(text) {
  const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n')
  const out = []
  let list = null // 'ul' | 'ol'
  let paragraph = []

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${paragraph.map(l => inline(escapeHtml(l))).join('<br>')}</p>`)
    paragraph = []
  }
  const closeList = () => {
    if (list) out.push(`</${list}>`)
    list = null
  }

  for (const line of lines) {
    const bullet = BULLET.exec(line)
    const numbered = !bullet && NUMBERED.exec(line)
    const heading = HEADING.exec(line)
    if (bullet || numbered) {
      flushParagraph()
      const type = bullet ? 'ul' : 'ol'
      if (list !== type) { closeList(); out.push(`<${type}>`); list = type }
      out.push(`<li>${inline(escapeHtml((bullet || numbered)[1]))}</li>`)
    } else if (heading) {
      flushParagraph(); closeList()
      // Inside the panel the task title is the h2, so descriptions start at h3
      const level = Math.min(heading[1].length + 2, 5)
      out.push(`<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`)
    } else if (!line.trim()) {
      flushParagraph(); closeList()
    } else {
      closeList()
      paragraph.push(line)
    }
  }
  flushParagraph(); closeList()
  return out.join('')
}

/** First meaningful line without Markdown syntax, for list previews. */
export function markdownSummary(text, max = 120) {
  const line = String(text || '')
    .split('\n')
    .map(l => l.replace(HEADING, '$2').replace(BULLET, '$1').replace(NUMBERED, '$1').trim())
    .find(Boolean)
  if (!line) return ''
  const plain = line
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/[*_`]/g, '')
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain
}
