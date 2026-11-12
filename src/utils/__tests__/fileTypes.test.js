import { describe, it, expect } from 'vitest'
import { detectFileKind, isSupported, dragHasFiles, SUPPORTED_KINDS } from '../fileTypes.js'

const f = (name, type = '') => ({ name, type })

describe('detectFileKind', () => {
  it.each([
    ['aufgaben.csv', '', 'csv'], ['Export.CSV', '', 'csv'], ['tabelle.tsv', '', 'csv'], ['x', 'text/csv', 'csv'],
    ['auftraege.xlsx', '', 'xlsx'], ['m.xlsm', '', 'xlsx'], ['x', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'xlsx'],
    ['notizen.md', '', 'markdown'], ['README.markdown', '', 'markdown'],
    ['duedate-backup-2026-11-12.json', '', 'json'], ['x', 'application/json', 'json'],
    ['bild.png', 'image/png', 'unknown'], ['ohne-endung', '', 'unknown'], ['a.csv.zip', 'application/zip', 'unknown'],
  ])('%s (%s) -> %s', (name, type, kind) => expect(detectFileKind(f(name, type))).toBe(kind))

  it('copes with nothing', () => {
    expect(detectFileKind(null)).toBe('unknown')
    expect(detectFileKind({})).toBe('unknown')
  })
})

describe('supported kinds', () => {
  it('CSV works today, the rest is announced but not imported yet', () => {
    expect(SUPPORTED_KINDS).toEqual(['csv'])
    expect(isSupported(f('a.csv'))).toBe(true)
    expect(isSupported(f('a.xlsx'))).toBe(false)
    expect(isSupported(f('a.md'))).toBe(false)
  })
})

describe('dragHasFiles', () => {
  it('only a drag of files counts, not text or links', () => {
    expect(dragHasFiles({ dataTransfer: { types: ['Files'] } })).toBe(true)
    expect(dragHasFiles({ dataTransfer: { types: ['text/plain', 'Files'] } })).toBe(true)
    expect(dragHasFiles({ dataTransfer: { types: ['text/plain'] } })).toBe(false)
    expect(dragHasFiles({})).toBe(false)
  })
})
