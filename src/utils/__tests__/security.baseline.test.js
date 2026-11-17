/**
 * Security baseline for DueDate: guards for the areas that are already safe.
 *
 * Findings live in their own file (`security.sec-00N.test.js`) together with the
 * fix, so a published commit never describes an open hole without the repair.
 * This file only holds checks that pass today and must keep passing.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { renderMarkdown } from '../markdown.js'
import { buildDeadlineEvent, buildIcs } from '../ics.js'
import { parseBackup, applyBackup } from '../backup.js'

const SRC = fileURLToPath(new URL('../../', import.meta.url))

// ---------------------------------------------------------------- helpers

/** Walks src/ and returns [relativePath, text] for files with one of the extensions. */
function sourceFiles(exts) {
  const out = []
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      if (statSync(full).isDirectory()) {
        if (name === '__tests__' || name === 'locales' || name === 'stories') continue
        walk(full)
      } else if (exts.some(e => name.endsWith(e))) {
        out.push([relative(SRC, full).replaceAll('\\', '/'), readFileSync(full, 'utf8')])
      }
    }
  }
  walk(SRC)
  return out
}

const ALLOWED_ATTRS = {
  p: [], br: [], strong: [], em: [], code: [], ul: [], ol: [], h3: [], h4: [], h5: [], span: [],
  li: ['class'], label: [], a: ['href', 'target', 'rel'],
  input: ['type', 'data-check', 'checked', 'aria-label'],
}

/**
 * Asserts that HTML from renderMarkdown only contains the tags/attributes the renderer is
 * meant to produce, that every href is http(s)/mailto and that no "<" is left over outside
 * a well-formed tag. Text is HTML-escaped by the renderer, so a "<" in the output must
 * belong to a generated tag.
 */
const TAG = /<(\/?)([a-z0-9]+)((?:\s[^<>]*)?)>/gi

function expectOnlySafeHtml(html) {
  for (const [, closing, tag, attrs] of html.matchAll(TAG)) {
    expect(Object.keys(ALLOWED_ATTRS), `tag <${tag}>`).toContain(tag.toLowerCase())
    if (closing) continue
    // The whole attribute string must be well-formed (` name="value"` pairs only),
    // otherwise an unescaped quote could smuggle in an attribute the loop below never sees.
    expect(attrs, `attributes of <${tag}>`).toMatch(/^(?:\s[a-z-]+(?:="[^"]*")?)*$/i)
    for (const [, name, value] of attrs.matchAll(/\s([a-z-]+)(?:="([^"]*)")?/gi)) {
      expect(ALLOWED_ATTRS[tag.toLowerCase()], `attribute ${name} on <${tag}>`).toContain(name)
      if (name === 'href') expect(value).toMatch(/^(https?:\/\/|mailto:)/i)
    }
  }
  // Whatever is left after removing the well-formed tags must not contain a "<":
  // that would be a half-open tag a browser could still parse (e.g. "<img onerror=...").
  expect(html.replace(TAG, '')).not.toContain('<')
}

// ---------------------------------------------------------------- SEC-XSS

describe('SEC-XSS: Markdown renderer feeds v-html', () => {
  // Task descriptions can come from third parties (school platform CSV), so treat as hostile.
  const payloads = [
    '<img src=x onerror=alert(1)>',
    '<script>alert(1)</script>',
    '[x](javascript:alert(1))',
    '[x](JaVaScRiPt:alert(1))',
    '[x](data:text/html,<script>alert(1)</script>)',
    '[x](https://a.com" onmouseover="alert(1))',
    'https://a.com/"onmouseover="alert(1)',
    '[https://evil.example](https://good.example)',
    '`<b>`', '- [x] <b>x</b>', '# <svg onload=alert(1)>',
    '\u00000\u0000 `c`', '**<i>**', '*a<b>*', '_a<b>_',
  ]
  it.each(payloads)('only emits allowed tags and attributes: %s', (p) => {
    expectOnlySafeHtml(renderMarkdown(p))
  })

  it('javascript: links are not turned into anchors', () => {
    expect(renderMarkdown('[x](javascript:alert(1))')).not.toContain('<a ')
  })
})

describe('SEC-HTML: unsafe sinks stay in one place', () => {
  const ALLOWED_V_HTML = ['components/ui/MarkdownEditor.vue']
  it('v-html / innerHTML only in the reviewed component', () => {
    const hits = sourceFiles(['.vue', '.js'])
      .filter(([, text]) => /v-html|\.innerHTML|insertAdjacentHTML|document\.write/.test(text))
      .map(([path]) => path)
      .filter(path => path !== 'utils/markdown.js') // mentions v-html in a comment only
    expect(hits.filter(p => !ALLOWED_V_HTML.includes(p))).toEqual([])
  })
  it('no eval / new Function', () => {
    const hits = sourceFiles(['.vue', '.js'])
      .filter(([, text]) => /\beval\(|new Function\(/.test(text)).map(([p]) => p)
    expect(hits).toEqual([])
  })
})

// ---------------------------------------------------------------- SEC-NET

describe('SEC-NET: local-first means no runtime network access', () => {
  it('no fetch / XHR / WebSocket / beacon in app code', () => {
    const hits = sourceFiles(['.vue', '.js'])
      .filter(([, text]) => /\bfetch\(|XMLHttpRequest|new WebSocket|sendBeacon|new EventSource/.test(text))
      .map(([p]) => p)
    expect(hits).toEqual([])
  })
  it('index.html loads nothing from another origin', () => {
    const html = readFileSync(join(SRC, '..', 'index.html'), 'utf8')
    expect(html.match(/(?:src|href)="https?:\/\/[^"]+"/g) || []).toEqual([])
  })
})

// ---------------------------------------------------------------- SEC-ICS

describe('SEC-ICS: calendar export escapes user text', () => {
  it('line breaks in title/description cannot create extra events or properties', async () => {
    const task = {
      _id: 't1', _deadlineDate: new Date(2026, 10, 20), _category: '', _isGraded: false,
      _title: 'A\r\nEND:VEVENT\r\nBEGIN:VEVENT\r\nSUMMARY:evil',
      _description: 'x\nATTENDEE:mailto:a@b.example\r\nURL:http://evil.example',
    }
    const ics = await buildIcs([buildDeadlineEvent(task)])
    const lines = ics.split('\r\n').filter(Boolean)
    expect(lines.filter(l => l === 'BEGIN:VEVENT')).toHaveLength(1)
    expect(lines.some(l => /^(ATTENDEE|URL)[:;]/.test(l))).toBe(false)
  })
})

// ---------------------------------------------------------------- SEC-BKP

describe('SEC-BKP: importing a backup file', () => {
  const memoryStorage = () => {
    const m = new Map()
    return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), m }
  }

  it('a "__proto__" key does not pollute Object.prototype', () => {
    const r = parseBackup('{"format":"duedate-backup","version":1,"schema":5,"data":{"tasks":[{"id":"a","title":"t","__proto__":{"polluted":true}}]}}')
    applyBackup(r.backup, memoryStorage())
    expect({}.polluted).toBeUndefined()
  })
})
