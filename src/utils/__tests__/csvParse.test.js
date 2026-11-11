import { describe, it, expect } from 'vitest'
import Papa from 'papaparse'
import { CSV_PARSE_OPTIONS, normalizeParseResult } from '../csvParse.js'

// Parse a CSV string exactly like the app parses a File
function parse(text) {
  return normalizeParseResult(Papa.parse(text, CSV_PARSE_OPTIONS))
}

describe('CSV parsing', () => {
  it('reads semicolon-separated files (BBNet style, quoted, with BOM)', () => {
    const r = parse('﻿"Fach";"Titel";"Abgabe"\n"Typo";"Plakat";"24. April 2026"\n')
    expect(r.fields).toEqual(['Fach', 'Titel', 'Abgabe'])
    expect(r.rows).toEqual([{ Fach: 'Typo', Titel: 'Plakat', Abgabe: '24. April 2026' }])
    expect(r.fatalError).toBeNull()
  })

  it('reads comma-separated files and keeps commas inside quotes', () => {
    const r = parse('Titel,Abgabe\n"Bericht, Teil 1",24.04.2026\nPoster,25.04.2026')
    expect(r.rows.map(x => x.Titel)).toEqual(['Bericht, Teil 1', 'Poster'])
  })

  it('reads tab-separated files', () => {
    const r = parse('Titel\tAbgabe\nA\t24.04.2026')
    expect(r.rows).toEqual([{ Titel: 'A', Abgabe: '24.04.2026' }])
  })

  it('trims header names', () => {
    expect(parse(' Titel ; Abgabe \nA;1.1.2026').fields).toEqual(['Titel', 'Abgabe'])
  })

  it('skips blank and whitespace-only lines', () => {
    expect(parse('Titel;Abgabe\nA;1.1.2026\n\n   \nB;2.1.2026\n').rows).toHaveLength(2)
  })

  it('skips rows with too many fields and counts them', () => {
    const r = parse('Titel;Abgabe\nA;24.04.2026\nC;1;2;3\nD;26.04.2026')
    expect(r.rows.map(x => x.Titel)).toEqual(['A', 'D'])
    expect(r.skippedRows).toBe(1)
  })

  it('keeps rows with too few fields and fills missing cells with ""', () => {
    const r = parse('Titel;Abgabe;Fach\nA;24.04.2026\n')
    expect(r.rows).toEqual([{ Titel: 'A', Abgabe: '24.04.2026', Fach: '' }])
    expect(r.skippedRows).toBe(0)
  })

  it('gives every row every header key (first row defines the columns)', () => {
    const r = parse('Titel;Abgabe;Fach\nA\nB;1.1.2026;Typo')
    expect(Object.keys(r.rows[0])).toEqual(r.fields)
  })

  it('accepts a single-column file', () => {
    const r = parse('Titel\nA\nB')
    expect(r.rows).toHaveLength(2)
    expect(r.fatalError).toBeNull()
  })

  it('reports an empty file as having no header', () => {
    expect(parse('').fatalError).toBe('noHeader')
  })

  it('reports a header-only file as having no rows', () => {
    expect(parse('Titel;Abgabe\n').fatalError).toBe('noRows')
  })
})
