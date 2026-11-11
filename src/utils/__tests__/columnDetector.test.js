import { describe, it, expect } from 'vitest'
import { detectColumns, _internal } from '../columnDetector.js'

const { looksLikeDate, looksLikeBoolean, matchByAlias, normalizeHeader } = _internal

// Realistic BBNet-style export (semicolon CSV already parsed into objects)
const BBNET_HEADERS = ['Fach', 'Titel', 'Beschreibung', 'Start', 'Abgabe', 'Datei(en) zur Aufgabe', 'Benotet?']
const BBNET_ROWS = [
  { Fach: 'Frontend', Titel: 'Abgabe Projektarbeit', Beschreibung: 'Gemäss Auftrag im Moodle', Start: '1. April 2026', Abgabe: '24. April 2026', 'Datei(en) zur Aufgabe': 'auftrag.pdf', 'Benotet?': 'Ja' },
  { Fach: 'Typografie', Titel: 'Plakat Entwurf', Beschreibung: 'Drei Varianten A3', Start: '3. April 2026', Abgabe: '30. April 2026', 'Datei(en) zur Aufgabe': '', 'Benotet?': 'Nein' },
  { Fach: 'Frontend', Titel: 'Reflexion', Beschreibung: 'Eine Seite', Start: '5. April 2026', Abgabe: '2. Mai 2026', 'Datei(en) zur Aufgabe': '', 'Benotet?': 'Nein' },
]

// Deliberately unfamiliar schema (used during Phase 1.5 testing)
const ALT_HEADERS = ['Spezies', 'Mission', 'Startdatum', 'Deadline', 'Bewertet?']
const MISSIONS = [
  'Kartografie des Nebels Alpha', 'Diplomatische Mission Kronos', 'Wissenschaftlicher Bericht',
  'Reparatur des Warpkerns', 'Erstkontakt vorbereiten', 'Logbuch auswerten', 'Sensoren kalibrieren',
  'Crew-Training planen', 'Vorräte inventarisieren', 'Abschlussbericht schreiben',
]
const ALT_ROWS = MISSIONS.map((m, i) => ({
  Spezies: i % 2 ? 'Klingone' : 'Vulkanier',
  Mission: m,
  Startdatum: `0${(i % 9) + 1}.04.2026`,
  Deadline: `${10 + i}.04.2026`,
  'Bewertet?': i % 3 ? 'Nein' : 'Ja',
}))

describe('helpers', () => {
  it('normalizeHeader lowercases, trims and strips punctuation', () => {
    expect(normalizeHeader('  Benotet? ')).toBe('benotet')
  })

  it('looksLikeDate recognises the supported date shapes', () => {
    expect(looksLikeDate('24. April 2026')).toBe(true)
    expect(looksLikeDate('24.04.2026')).toBe(true)
    expect(looksLikeDate('Abgabe')).toBe(false)
    expect(looksLikeDate('')).toBe(false)
  })

  it('looksLikeBoolean recognises yes/no values in German and English', () => {
    for (const v of ['Ja', 'nein', 'yes', 'NO', 'true', '1', 'x']) expect(looksLikeBoolean(v)).toBe(true)
    expect(looksLikeBoolean('vielleicht')).toBe(false)
  })

  it('matchByAlias maps common German headers to roles', () => {
    expect(matchByAlias('Titel')).toBe('title')
    expect(matchByAlias('Abgabe')).toBe('deadline')
    expect(matchByAlias('Fach')).toBe('category')
    expect(matchByAlias('Beschreibung')).toBe('description')
    expect(matchByAlias('Benotet?')).toBe('graded')
    expect(matchByAlias('Spezies')).toBeNull()
  })
})

describe('detectColumns — BBNet export', () => {
  const result = detectColumns(BBNET_HEADERS, BBNET_ROWS)

  it('finds both required fields', () => {
    expect(result.mapping.title).toBe('Titel')
    expect(result.mapping.deadline).toBe('Abgabe')
    expect(result.missingRequired).toEqual([])
  })

  it('maps the optional fields', () => {
    expect(result.mapping.start).toBe('Start')
    expect(result.mapping.category).toBe('Fach')
    expect(result.mapping.description).toBe('Beschreibung')
    expect(result.mapping.graded).toBe('Benotet?')
  })

  it('never assigns one column to two roles', () => {
    const cols = Object.values(result.mapping)
    expect(new Set(cols).size).toBe(cols.length)
  })

  // Found while writing these tests: "Datei(en) zur Aufgabe" contains "aufgabe",
  // a title alias, so it is classified as a title candidate and the files column
  // is never mapped. Fixed in roadmap step A3.
  it.fails('[A3] maps "Datei(en) zur Aufgabe" to files', () => {
    expect(result.mapping.files).toBe('Datei(en) zur Aufgabe')
  })
})

describe('detectColumns — unfamiliar schema', () => {
  const result = detectColumns(ALT_HEADERS, ALT_ROWS)

  it('finds title and deadline without exact alias matches for the title', () => {
    expect(result.mapping.deadline).toBe('Deadline')
    expect(result.mapping.start).toBe('Startdatum')
    expect(result.mapping.graded).toBe('Bewertet?')
    expect(result.mapping.title).toBe('Mission')
  })

  it('reports nothing missing', () => {
    expect(result.missingRequired).toEqual([])
  })

  it('treats a column with few repeating values as category', () => {
    expect(result.mapping.category).toBe('Spezies')
  })

  // Heuristic limit: with very few rows, two text columns score the same and the
  // first one wins. Acceptable because the user confirms the mapping in the UI.
  it('with only 3 rows, cannot tell title from category (documented limit)', () => {
    const { mapping } = detectColumns(ALT_HEADERS, ALT_ROWS.slice(0, 3))
    expect(mapping.title).toBe('Spezies')
  })
})

describe('detectColumns — edge cases', () => {
  it('reports both required fields as missing for empty input', () => {
    expect(detectColumns([], []).missingRequired).toEqual(['title', 'deadline'])
  })

  it('picks the deadline by alias when there are two date columns', () => {
    const rows = [{ Von: '01.04.2026', Frist: '10.04.2026', Name: 'Aufgabe A' }]
    const { mapping } = detectColumns(['Von', 'Frist', 'Name'], rows)
    expect(mapping.deadline).toBe('Frist')
  })

  it('reports a missing deadline when no column looks like one', () => {
    const rows = [{ Titel: 'A', Notiz: 'x' }]
    expect(detectColumns(['Titel', 'Notiz'], rows).missingRequired).toEqual(['deadline'])
  })
})
