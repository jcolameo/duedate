/**
 * Pure helpers around PapaParse so CSV handling is testable without a File.
 */

// Shared PapaParse options: auto-detect delimiter (; , tab …), skip blank and
// whitespace-only lines, trim header names.
export const CSV_PARSE_OPTIONS = {
  header: true,
  delimiter: '',
  skipEmptyLines: 'greedy',
  transformHeader: (h) => String(h).trim(),
}

// Error codes that make a row unreliable (values would land in wrong columns)
const ROW_BREAKING = new Set(['TooManyFields', 'MissingQuotes', 'InvalidQuotes'])

/**
 * Turns a PapaParse result into rows we can trust.
 * - Rows with too many fields or broken quotes are skipped and counted.
 * - Rows with too few fields are kept; missing cells become ''.
 * - The "could not detect delimiter" notice (single-column file) is ignored.
 * - Every row gets every header key, so Object.keys(rows[0]) === fields.
 *
 * @returns {{ rows: object[], fields: string[], skippedRows: number, fatalError: string|null }}
 *   fatalError is a code: 'noHeader' | 'noRows'
 */
export function normalizeParseResult(results) {
  const fields = (results?.meta?.fields || []).filter((f) => f !== '' && f !== '__parsed_extra')
  if (fields.length === 0) {
    return { rows: [], fields: [], skippedRows: 0, fatalError: 'noHeader' }
  }

  const brokenRows = new Set(
    (results.errors || [])
      .filter((e) => ROW_BREAKING.has(e.code) && typeof e.row === 'number')
      .map((e) => e.row),
  )

  const rows = []
  ;(results.data || []).forEach((raw, index) => {
    if (brokenRows.has(index)) return
    const row = {}
    for (const f of fields) row[f] = raw[f] === undefined || raw[f] === null ? '' : String(raw[f])
    rows.push(row)
  })

  if (rows.length === 0) {
    return { rows: [], fields, skippedRows: brokenRows.size, fatalError: 'noRows' }
  }
  return { rows, fields, skippedRows: brokenRows.size, fatalError: null }
}
