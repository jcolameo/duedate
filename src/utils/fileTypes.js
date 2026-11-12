/**
 * Which kind of file did the user give us? One place for the check, so adding
 * a new importer later (Excel, Markdown) means: add a kind here and register
 * it in composables/useFileImport.js.
 */

/** Kinds the app can import right now. */
export const SUPPORTED_KINDS = ['csv']

/** Extension (lower case, without the dot) or ''. */
function extensionOf(name) {
  const m = /\.([a-z0-9]+)$/i.exec(String(name || ''))
  return m ? m[1].toLowerCase() : ''
}

/**
 * 'csv' | 'xlsx' | 'markdown' | 'json' | 'unknown'. The extension decides;
 * the MIME type only helps when the extension is missing or odd.
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

export const isSupported = (file) => SUPPORTED_KINDS.includes(detectFileKind(file))

/** True when a drag carries files (not text or a link). */
export function dragHasFiles(event) {
  return Array.from(event?.dataTransfer?.types || []).includes('Files')
}
