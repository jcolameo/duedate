/**
 * Guesses which CSV column fills which task field.
 *
 * A school platform exports columns with names nobody can predict ("Fällig am",
 * "Abgabedatum", "Due date"). Asking the user to map every column on every
 * import is friction, so this suggests a mapping from the header names and the
 * values, and the user only has to confirm or correct it.
 *
 * Two signals, in this order:
 * 1. The header name, matched against known aliases.
 * 2. The values themselves: dates, yes/no words, few repeated values, long text.
 *
 * Pure functions: no storage, no clock, no Vue.
 */
import { parseGermanDate } from './dateParser.js'

/** Known header aliases, in several languages. */
const COLUMN_ALIASES = {
  title: ['titel', 'title', 'name', 'aufgabe', 'task', 'thema'],
  deadline: ['abgabe', 'deadline', 'due', 'fällig', 'faellig', 'frist', 'due date', 'enddatum'],
  start: ['start', 'beginn', 'startdatum', 'start date', 'von'],
  category: ['fach', 'category', 'kategorie', 'subject', 'kurs', 'modul', 'class'],
  description: ['beschreibung', 'description', 'details', 'info', 'notiz', 'notes'],
  graded: ['benotet', 'graded', 'note', 'grade', 'bewertet'],
  files: ['datei', 'dateien', 'files', 'file', 'anhang', 'attachment'],
}

/**
 * Matching order for the alias lookup.
 *
 * `files` comes first because its aliases are specific ("datei", "anhang"),
 * while a header like "Datei(en) zur Aufgabe" also contains the generic title
 * alias "aufgabe". Without the order, that column would become the title.
 */
const ALIAS_PRIORITY = ['files', 'title', 'deadline', 'start', 'category', 'description', 'graded']

/**
 * True when the value is a date, judged by the real parser.
 *
 * Using `parseGermanDate` instead of a second regex means detection and parsing
 * can never disagree. Before, a column could be detected as a date while every
 * value later parsed to "?".
 */
function looksLikeDate(value) {
  if (!value || typeof value !== 'string') return false
  return parseGermanDate(value) !== null
}

/** True for the words a yes/no column uses, including the empty cell. */
function looksLikeBoolean(value) {
  if (!value) return false
  const v = String(value).trim().toLowerCase()
  return ['ja', 'nein', 'yes', 'no', 'true', 'false', '1', '0', 'x', ''].includes(v)
}

/** Header without punctuation and case, so "Fällig am?" and "fällig am" match. */
function normalizeHeader(header) {
  return String(header || '').trim().toLowerCase().replace(/[?!:;.]/g, '')
}

/**
 * Maps a header to a role by name, or null.
 *
 * An exact match wins over a substring match, so "Note" becomes `graded` and not
 * `title` through the alias "notiz".
 */
function matchByAlias(header) {
  const normalized = normalizeHeader(header)

  for (const role of ALIAS_PRIORITY) {
    if (COLUMN_ALIASES[role].includes(normalized)) return role
  }
  for (const role of ALIAS_PRIORITY) {
    if (COLUMN_ALIASES[role].some(alias => normalized.includes(alias))) return role
  }
  return null
}

/**
 * Suggests a role for one column.
 *
 * The header name is the strongest signal, so it is checked first. Only when the
 * name says nothing do the values decide.
 *
 * @param {string} columnName
 * @param {string[]} values - sample values of that column
 * @returns {{ role: string, confidence: number, sampleValue: string|null }}
 */
function analyzeColumn(columnName, values) {
  const nonEmpty = values.filter(v => v && String(v).trim() !== '')
  const sampleValue = nonEmpty[0] || null

  const aliasMatch = matchByAlias(columnName)
  if (aliasMatch) {
    // A date column whose values really are dates is more certain than one that
    // only carries a promising name.
    if ((aliasMatch === 'deadline' || aliasMatch === 'start') && nonEmpty.length > 0) {
      const dateRatio = nonEmpty.filter(looksLikeDate).length / nonEmpty.length
      if (dateRatio > 0.5) {
        return { role: aliasMatch, confidence: 0.98, sampleValue }
      }
    }
    return { role: aliasMatch, confidence: 0.95, sampleValue }
  }

  if (nonEmpty.length === 0) {
    return { role: 'unknown', confidence: 0, sampleValue }
  }

  const dateRatio = nonEmpty.filter(looksLikeDate).length / nonEmpty.length
  if (dateRatio > 0.7) {
    return { role: 'date', confidence: dateRatio, sampleValue }
  }

  const boolRatio = nonEmpty.filter(looksLikeBoolean).length / nonEmpty.length
  if (boolRatio > 0.8) {
    return { role: 'graded', confidence: boolRatio * 0.7, sampleValue }
  }

  // Few distinct values across many rows means a category ("Mathe", "Deutsch").
  const uniqueValues = new Set(nonEmpty.map(v => String(v).trim()))
  const uniqueRatio = uniqueValues.size / nonEmpty.length
  if (uniqueRatio < 0.3 && uniqueValues.size > 1 && uniqueValues.size < 20) {
    return { role: 'category', confidence: 0.6, sampleValue }
  }

  const avgLength = nonEmpty.reduce((sum, v) => sum + String(v).length, 0) / nonEmpty.length
  if (avgLength > 30) {
    return { role: 'description', confidence: 0.5, sampleValue }
  }
  if (avgLength > 5) {
    return { role: 'title', confidence: 0.4, sampleValue }
  }

  return { role: 'unknown', confidence: 0.1, sampleValue }
}

/**
 * Suggests a mapping for a whole CSV.
 *
 * Only the first 20 rows are looked at: enough to judge a column, cheap on a
 * file with thousands of rows.
 *
 * @param {string[]} headers
 * @param {object[]} rows
 * @returns {{ mapping: Record<string, string>, suggestions: object[],
 *   missingRequired: string[] }} `missingRequired` lists 'title' and/or 'deadline'
 *   when no column could be found for them
 */
export function detectColumns(headers, rows) {
  if (!headers || headers.length === 0) {
    return { mapping: {}, suggestions: [], missingRequired: ['title', 'deadline'] }
  }

  const sampleSize = Math.min(20, rows.length)
  const samples = headers.map(header => {
    const values = []
    for (let i = 0; i < sampleSize; i++) {
      values.push(rows[i]?.[header])
    }
    return { header, values }
  })

  const suggestions = samples.map(({ header, values }) => {
    const analysis = analyzeColumn(header, values)
    return { column: header, ...analysis }
  })

  const mapping = {}

  // Two date columns are the normal case: start and deadline. Which is which is
  // decided by the header name when possible, otherwise by order.
  const dateColumns = suggestions
    .filter(s => s.role === 'date')
    .sort((a, b) => b.confidence - a.confidence)

  if (dateColumns.length === 1) {
    mapping.deadline = dateColumns[0].column
  } else if (dateColumns.length >= 2) {
    const deadlineByAlias = dateColumns.find(s =>
      ['abgabe', 'deadline', 'due', 'fällig', 'frist'].some(a =>
        normalizeHeader(s.column).includes(a)
      )
    )
    if (deadlineByAlias) {
      mapping.deadline = deadlineByAlias.column
      const remaining = dateColumns.find(s => s.column !== deadlineByAlias.column)
      if (remaining) mapping.start = remaining.column
    } else {
      mapping.start = dateColumns[0].column
      mapping.deadline = dateColumns[1].column
    }
  }

  for (const role of ['title', 'deadline', 'start', 'category', 'description', 'graded', 'files']) {
    if (mapping[role]) continue
    const best = suggestions
      .filter(s => s.role === role)
      .sort((a, b) => b.confidence - a.confidence)[0]
    // A column may only fill one role.
    if (best && !Object.values(mapping).includes(best.column)) {
      mapping[role] = best.column
    }
  }

  const missingRequired = []
  if (!mapping.title) missingRequired.push('title')
  if (!mapping.deadline) missingRequired.push('deadline')

  return { mapping, suggestions, missingRequired }
}

/** Exposed for tests, so each step can be checked on its own. */
export const _internal = {
  looksLikeDate,
  looksLikeBoolean,
  matchByAlias,
  analyzeColumn,
  normalizeHeader,
}
