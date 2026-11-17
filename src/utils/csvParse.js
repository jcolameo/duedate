/**
 * CSV parsing, kept separate from PapaParse so it can be tested without a File.
 *
 * PapaParse does the splitting. What comes back still needs a decision: which
 * rows can be trusted, which columns exist, and whether the file is usable at
 * all. That decision lives here, as a pure function.
 */

/**
 * Options shared by every import.
 *
 * - `delimiter: ''` lets PapaParse detect `;`, `,` or tab. Swiss exports use `;`.
 * - `skipEmptyLines: 'greedy'` also drops lines with only spaces, which Excel
 *   likes to leave at the end of a sheet.
 * - Header names are trimmed, because trailing spaces break the mapping.
 */
export const CSV_PARSE_OPTIONS = {
  header: true,
  delimiter: '',
  skipEmptyLines: 'greedy',
  transformHeader: (h) => String(h).trim(),
}

/**
 * Errors that make a whole row unreliable: the values would land in the wrong
 * columns, so the row is dropped instead of imported half-wrong.
 */
const ROW_BREAKING = new Set(['TooManyFields', 'MissingQuotes', 'InvalidQuotes'])

/**
 * Turns a PapaParse result into rows the importer can trust.
 *
 * - Rows with too many fields or broken quotes are skipped and counted.
 * - Rows with too few fields are kept; missing cells become ''.
 * - The "could not detect delimiter" notice is ignored: a single-column file is
 *   legitimate and PapaParse reports it as an error.
 * - Every row gets every header key, so `Object.keys(rows[0])` equals `fields`.
 *
 * @param {object} results - raw result from PapaParse
 * @returns {{ rows: object[], fields: string[], skippedRows: number, fatalError: string|null }}
 *   `fatalError` is a code: 'noHeader' | 'noRows', or null when the file is usable
 */
export function normalizeParseResult(results) {
  // `__parsed_extra` is PapaParse's bucket for surplus cells, not a real column.
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
