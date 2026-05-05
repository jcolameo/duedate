/**
 * Column Detector
 * 
 * Analysiert CSV-Daten und schlägt vor, welche Spalte 
 * welche Rolle hat (Titel, Deadline, Fach, etc.).
 */

// Bekannte Spalten-Aliase (mehrsprachig)
const COLUMN_ALIASES = {
  title: ['titel', 'title', 'name', 'aufgabe', 'task', 'thema'],
  deadline: ['abgabe', 'deadline', 'due', 'fällig', 'faellig', 'frist', 'due date', 'enddatum'],
  start: ['start', 'beginn', 'startdatum', 'start date', 'von'],
  category: ['fach', 'category', 'kategorie', 'subject', 'kurs', 'modul', 'class'],
  description: ['beschreibung', 'description', 'details', 'info', 'notiz', 'notes'],
  graded: ['benotet', 'graded', 'note', 'grade', 'bewertet'],
  files: ['datei', 'dateien', 'files', 'file', 'anhang', 'attachment'],
}

function looksLikeDate(value) {
  if (!value || typeof value !== 'string') return false
  const v = value.trim()
  const patterns = [
    /^\d{1,2}\.\s*\w+\s+\d{4}$/,
    /^\d{1,2}\.\d{1,2}\.\d{2,4}$/,
    /^\d{4}-\d{2}-\d{2}$/,
    /^\d{1,2}\/\d{1,2}\/\d{2,4}$/,
  ]
  return patterns.some(p => p.test(v))
}

function looksLikeBoolean(value) {
  if (!value) return false
  const v = String(value).trim().toLowerCase()
  return ['ja', 'nein', 'yes', 'no', 'true', 'false', '1', '0', 'x', ''].includes(v)
}

function normalizeHeader(header) {
  return String(header || '').trim().toLowerCase().replace(/[?!:;.]/g, '')
}

function matchByAlias(header) {
  const normalized = normalizeHeader(header)
  for (const [role, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some(alias => normalized.includes(alias))) {
      return role
    }
  }
  return null
}

function analyzeColumn(columnName, values) {
  const nonEmpty = values.filter(v => v && String(v).trim() !== '')
  const sampleValue = nonEmpty[0] || null

  // 1. Alias match has HIGHEST priority
  const aliasMatch = matchByAlias(columnName)
  if (aliasMatch) {
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
    if (best && !Object.values(mapping).includes(best.column)) {
      mapping[role] = best.column
    }
  }

  const missingRequired = []
  if (!mapping.title) missingRequired.push('title')
  if (!mapping.deadline) missingRequired.push('deadline')

  return { mapping, suggestions, missingRequired }
}

export const _internal = {
  looksLikeDate,
  looksLikeBoolean,
  matchByAlias,
  analyzeColumn,
  normalizeHeader,
}