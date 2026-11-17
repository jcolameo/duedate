/**
 * Which kind of file did the user hand us?
 *
 * One place for that question, so adding a new importer later (Excel, Markdown)
 * means: add a kind here and register it in `composables/useFileImport.js`.
 *
 * Pure functions: no storage, no Vue, no reading of the file itself.
 */

/** Kinds the app can import right now. */
export const SUPPORTED_KINDS = ['csv']

/**
 * Extension in lower case, without the dot, or '' when there is none.
 *
 * A regex instead of `split('.')` because a name may contain dots
 * ("noten.2026.csv") and may have none at all.
 */
function extensionOf(name) {
  const match = /\.([a-z0-9]+)$/i.exec(String(name || ''))
  return match ? match[1].toLowerCase() : ''
}

/**
 * Guesses the kind of file from its name, with the MIME type as a fallback.
 *
 * The extension is the reliable part: browsers report an empty or wrong type for
 * drag-and-drop often enough. The type only helps when the extension is missing
 * or unusual.
 *
 * @param {{ name?: string, type?: string }} file - a File, or anything with those fields
 * @returns {'csv'|'xlsx'|'markdown'|'json'|'unknown'}
 */
export function detectFileKind(file) {
  const ext = extensionOf(file?.name)
  const type = String(file?.type || '').toLowerCase()
  if (ext === 'csv' || ext === 'tsv' || type === 'text/csv') return 'csv'
  if (ext === 'xlsx' || ext === 'xlsm' || type.includes('spreadsheetml')) return 'xlsx'
  if (ext === 'md' || ext === 'markdown' || type === 'text/markdown') return 'markdown'
  if (ext === 'json' || type === 'application/json') return 'json'
  return 'unknown'
}

/** True when the app can import this file today. */
export const isSupported = (file) => SUPPORTED_KINDS.includes(detectFileKind(file))

/**
 * True when a drag carries files rather than text or a link.
 *
 * Dragging a link or selected text into the drop zone must not start an import,
 * so the drop handler asks this first.
 */
export function dragHasFiles(event) {
  return Array.from(event?.dataTransfer?.types || []).includes('Files')
}
