import { describe, it, expect } from 'vitest'
import { renderMarkdown as md, markdownSummary } from '../markdown.js'
import { wrapSelection, toggleLinePrefix, insertLink, continueList } from '../markdownEdit.js'
import { parseChecklist, toggleChecklistItem, checklistProgress, checklistFieldOf, checklistTextOf } from '../checklist.js'

describe('renderMarkdown', () => {
  it('empty input renders nothing', () => {
    expect(md('')).toBe('')
    expect(md(null)).toBe('')
  })

  it('paragraphs and line breaks', () => {
    expect(md('Erste Zeile\nzweite\n\nNeuer Absatz')).toBe('<p>Erste Zeile<br>zweite</p><p>Neuer Absatz</p>')
  })

  it('bullet and numbered lists', () => {
    expect(md('- A\n- B\n\n1. Eins\n2. Zwei')).toBe('<ul><li>A</li><li>B</li></ul><ol><li>Eins</li><li>Zwei</li></ol>')
    expect(md('* Stern')).toBe('<ul><li>Stern</li></ul>')
  })

  it('headings start below the panel title', () => {
    expect(md('# Ziel\n## Teil')).toBe('<h3>Ziel</h3><h4>Teil</h4>')
  })

  it('inline formatting', () => {
    expect(md('**fett** und *kursiv* und _auch_ und `code`')).toBe(
      '<p><strong>fett</strong> und <em>kursiv</em> und <em>auch</em> und <code>code</code></p>')
  })

  it('does not italicise snake_case or multiplication', () => {
    expect(md('datei_name_v2 und 2*3*4')).toBe('<p>datei_name_v2 und 2*3*4</p>')
  })

  it('links: markdown and bare URLs, opened safely', () => {
    expect(md('[Brief](https://example.org/a?b=1&c=2)')).toBe(
      '<p><a href="https://example.org/a?b=1&amp;c=2" target="_blank" rel="noopener noreferrer">Brief</a></p>')
    expect(md('siehe https://example.org')).toContain('<a href="https://example.org"')
  })

  it('escapes HTML (no script injection)', () => {
    expect(md('<script>alert(1)</script>')).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
    expect(md('<img src=x onerror=alert(1)>')).not.toContain('<img')
  })

  it('rejects javascript: and data: links', () => {
    expect(md('[x](javascript:alert(1))')).not.toContain('href')
    expect(md('[x](data:text/html,hi)')).not.toContain('href')
  })

  it('quotes inside link text cannot break out of attributes', () => {
    expect(md('[a" onmouseover="x](https://e.org)')).not.toMatch(/onmouseover="/)
  })

  it('code spans are not formatted further', () => {
    expect(md('`**nicht fett**`')).toBe('<p><code>**nicht fett**</code></p>')
  })
})

describe('markdownSummary', () => {
  it('first meaningful line, without syntax', () => {
    expect(markdownSummary('\n# Ziel: **Logo** für [Kunde](https://x.ch)\n- mehr')).toBe('Ziel: Logo für Kunde')
    expect(markdownSummary('- erster Punkt')).toBe('erster Punkt')
    expect(markdownSummary('')).toBe('')
  })

  it('shortens long lines', () => {
    expect(markdownSummary('a'.repeat(200), 10)).toBe('aaaaaaaaa…')
  })
})

describe('markdownEdit', () => {
  it('wrapSelection wraps and selects the text', () => {
    expect(wrapSelection({ value: 'ein Wort', start: 4, end: 8 }, '**')).toEqual({ value: 'ein **Wort**', start: 6, end: 10 })
  })

  it('wrapSelection without selection inserts a placeholder', () => {
    expect(wrapSelection({ value: '', start: 0, end: 0 }, '*', 'Text')).toEqual({ value: '*Text*', start: 1, end: 5 })
  })

  it('wrapSelection toggles off', () => {
    expect(wrapSelection({ value: 'ein **Wort**', start: 6, end: 10 }, '**')).toEqual({ value: 'ein Wort', start: 4, end: 8 })
  })

  it('toggleLinePrefix bullets every selected line and toggles back', () => {
    const on = toggleLinePrefix({ value: 'A\nB\nC', start: 0, end: 3 }, 'bullet')
    expect(on.value).toBe('- A\n- B\nC')
    expect(toggleLinePrefix(on, 'bullet').value).toBe('A\nB\nC')
  })

  it('numbered lists count up; switching type replaces the marker', () => {
    expect(toggleLinePrefix({ value: 'A\nB', start: 0, end: 3 }, 'numbered').value).toBe('1. A\n2. B')
    expect(toggleLinePrefix({ value: '- A', start: 0, end: 3 }, 'numbered').value).toBe('1. A')
  })

  it('insertLink selects the URL', () => {
    const r = insertLink({ value: 'Brief', start: 0, end: 5 })
    expect(r.value).toBe('[Brief](https://)')
    expect(r.value.slice(r.start, r.end)).toBe('https://')
  })

  it('continueList continues bullets and numbers', () => {
    expect(continueList({ value: '- A', start: 3, end: 3 })).toEqual({ value: '- A\n- ', start: 6, end: 6 })
    expect(continueList({ value: '1. A', start: 4, end: 4 }).value).toBe('1. A\n2. ')
  })

  it('continueList ends the list on an empty item', () => {
    expect(continueList({ value: '- A\n- ', start: 6, end: 6 })).toEqual({ value: '- A\n', start: 4, end: 4 })
  })

  it('continueList ignores normal lines', () => {
    expect(continueList({ value: 'Text', start: 4, end: 4 })).toBeNull()
  })
})

describe('checklists (C1)', () => {
  const TEXT = 'Ziel: Logo\n\n- [ ] Moodboard\n- [x] Skizzen\n- [ ] **Entwurf** senden'

  it('renders checklist items as checkboxes numbered in document order', () => {
    const html = md(TEXT)
    expect(html).toContain('<input type="checkbox" data-check="0">')
    expect(html).toContain('<input type="checkbox" data-check="1" checked>')
    expect(html).toContain('<strong>Entwurf</strong> senden')
    expect(html.match(/data-check=/g)).toHaveLength(3)
  })

  it('mixes with normal bullets in one list', () => {
    const html = md('- Notiz\n- [ ] Schritt')
    expect(html).toBe('<ul><li>Notiz</li><li class="dd-task"><label><input type="checkbox" data-check="0"><span>Schritt</span></label></li></ul>')
  })

  it('escapes item text and keeps empty items accessible', () => {
    expect(md('- [ ] <b>x</b>')).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(md('- [ ]', { emptyItemLabel: 'Punkt' })).toContain('aria-label="Punkt"')
    expect(md('- [ ] a', { emptyItemLabel: 'Punkt' })).not.toContain('aria-label')
  })

  it('"[ ]" without a list marker or space is plain text', () => {
    expect(md('[ ] kein Punkt')).toBe('<p>[ ] kein Punkt</p>')
    expect(md('- [ ]x')).not.toContain('checkbox')
  })

  it('summary skips checklist steps (they are not a description)', () => {
    expect(markdownSummary('- [ ] Moodboard bauen')).toBe('')
    expect(markdownSummary('- [ ] Moodboard bauen\nZiel: neues Logo')).toBe('Ziel: neues Logo')
  })

  it('parseChecklist lists steps with state and line', () => {
    expect(parseChecklist(TEXT)).toEqual([
      { index: 0, text: 'Moodboard', checked: false, line: 2 },
      { index: 1, text: 'Skizzen', checked: true, line: 3 },
      { index: 2, text: '**Entwurf** senden', checked: false, line: 4 },
    ])
    expect(parseChecklist('')).toEqual([])
    expect(parseChecklist(null)).toEqual([])
  })

  it('toggleChecklistItem flips only that item, both ways', () => {
    const once = toggleChecklistItem(TEXT, 0)
    expect(once).toBe(TEXT.replace('- [ ] Moodboard', '- [x] Moodboard'))
    expect(toggleChecklistItem(once, 0)).toBe(TEXT)
    expect(toggleChecklistItem(TEXT, 1)).toContain('- [ ] Skizzen')
    expect(toggleChecklistItem(TEXT, 9)).toBe(TEXT)
  })

  it('checkbox numbers in the HTML match parseChecklist indexes', () => {
    const html = md(TEXT)
    parseChecklist(TEXT).forEach(({ index, checked }) => {
      expect(html.includes(`data-check="${index}"${checked ? ' checked' : '>'}`)).toBe(true)
    })
  })

  it('checklistProgress: null, partial, complete; next step as plain text', () => {
    expect(checklistProgress('nur Text')).toBeNull()
    expect(checklistProgress(TEXT)).toEqual({ done: 1, total: 3, complete: false, next: { index: 0, text: 'Moodboard' } })
    const all = '- [x] a\n- [X] b'
    expect(checklistProgress(all)).toEqual({ done: 2, total: 2, complete: true, next: null })
    expect(checklistProgress('- [x] a\n- [ ] **Fett** b').next).toEqual({ index: 1, text: 'Fett b' })
  })

  it('steps of CSV tasks live in the notes, others in the description', () => {
    expect(checklistFieldOf({ source: 'csv' })).toBe('notes')
    expect(checklistFieldOf({ source: 'manual' })).toBe('description')
    expect(checklistTextOf({ source: 'csv', notes: '- [ ] a', description: '- [ ] BBNet' })).toBe('- [ ] a')
  })

  it('toolbar: checklist prefix on/off and not confused with bullets', () => {
    const on = toggleLinePrefix({ value: 'A\nB', start: 0, end: 3 }, 'check')
    expect(on.value).toBe('- [ ] A\n- [ ] B')
    expect(toggleLinePrefix(on, 'check').value).toBe('A\nB')
    expect(toggleLinePrefix({ value: '- [x] A', start: 0, end: 7 }, 'bullet').value).toBe('- A')
    expect(toggleLinePrefix({ value: '- A', start: 0, end: 3 }, 'check').value).toBe('- [ ] A')
  })

  it('toolbar with the caret only: caret goes to the line end, not a selected line', () => {
    expect(toggleLinePrefix({ value: 'A\n', start: 2, end: 2 }, 'check')).toEqual({ value: 'A\n- [ ] ', start: 8, end: 8 })
    expect(toggleLinePrefix({ value: 'Text', start: 2, end: 2 }, 'bullet')).toEqual({ value: '- Text', start: 6, end: 6 })
  })

  it('Enter in a checklist adds a new unchecked step; an empty step ends the list', () => {
    expect(continueList({ value: '- [x] A', start: 7, end: 7 })).toEqual({ value: '- [x] A\n- [ ] ', start: 14, end: 14 })
    expect(continueList({ value: '- [ ] A\n- [ ] ', start: 14, end: 14 })).toEqual({ value: '- [ ] A\n', start: 8, end: 8 })
    expect(continueList({ value: '- [ ]', start: 5, end: 5 })).toEqual({ value: '', start: 0, end: 0 })
  })
})
