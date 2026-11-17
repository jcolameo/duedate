/**
 * useCSVImport: reads a CSV file into raw table rows. It does not create
 * tasks itself; it only parses the file and keeps the rows.
 *
 * Called by: src/views/DeadlinesView.vue:35 (drop zone and file picker),
 * and inside this folder by useFileImport.js (`importFile`) and
 * useColumnMapping.js (watches `tasks`, see below).
 *
 * In: nothing. Out: `uploadedFile`, `isDragging`, `tasks`, `columns`,
 * `errorMessage`, `importWarning` (refs) and the handlers `handleDragOver`,
 * `handleDragLeave`, `handleDrop`, `handleFileSelect`, `importFile`.
 * Careful with the name: `tasks` here means raw CSV rows (one object per row,
 * keys are the CSV headers), not the task objects from useTasks.js.
 *
 * In the background: the last parsed rows are saved in localStorage under
 * `duedate.tasks.v1` (the pre-B1 key, still written for the column mapping).
 *
 * Why module level: the rows are created once at import, so Deadlines, the
 * import dialog and useColumnMapping share them across page changes.
 *
 * How to read this file: `parseCSV` is the heart. Every entry point
 * (`importFile`, `handleDrop`, `handleFileSelect`) ends there. The invisible
 * link: useColumnMapping.js has a `watch` on `tasks`, so assigning new rows in
 * `parseCSV` is what starts column detection and, later, the task import.
 */
import { ref } from 'vue'
import Papa from 'papaparse'
import { useLocale } from './useLocale.js'
import { CSV_PARSE_OPTIONS, normalizeParseResult } from '../utils/csvParse.js'

// Translation function, taken once at import. It still follows a language
// switch, because t() reads the shared locale ref each time it is called.
const { t } = useLocale()

const STORAGE_KEY = 'duedate.tasks.v1'

/**
 * Shared module-level state so imported tasks survive navigation between
 * views (e.g. Deadlines -> Home) and page reloads, not just one component's
 * lifetime — same singleton pattern as useTheme.js.
 *
 * @returns {{ fileName: string, rows: object[] }|null} the last import, or null
 */
function loadSavedTasks() {
  // Blocked storage or broken JSON: behave as if nothing was imported yet.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    console.warn('[CSVImport] LocalStorage read failed:', e)
    return null
  }
}

/**
 * Saves the parsed rows and the file name.
 *
 * @param {string} fileName name of the imported file
 * @param {object[]} rows parsed CSV rows
 * @sideeffect writes `duedate.tasks.v1`
 */
function saveTasks(fileName, rows) {
  // A large CSV can exceed the storage quota. The rows stay usable for this
  // session; only the reload would lose them.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fileName, rows }))
  } catch (e) {
    console.warn('[CSVImport] LocalStorage write failed:', e)
  }
}

const restored = loadSavedTasks()

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, these refs exist once for
// the whole app, not once per component.
// After a reload only the file name is known, not the File object itself.
const uploadedFile = ref(restored ? { name: restored.fileName } : null)
const isDragging = ref(false)
const tasks = ref(restored ? restored.rows : [])
// Column names come from the keys of the first row (all rows share them).
const columns = ref(tasks.value.length ? Object.keys(tasks.value[0]) : [])
const errorMessage = ref('')
// Non-blocking notice, e.g. "2 rows were skipped"
const importWarning = ref('')

/**
 * Parses a CSV file with PapaParse and stores the result in the refs above.
 * `done({ ok })` is called when parsing has finished (used by the shortcut import).
 *
 * @param {File} file the CSV file
 * @param {(result: { ok: boolean, rows?: number }) => void} [done] called once at the end
 * @sideeffect sets errorMessage, importWarning, tasks, columns; writes localStorage
 */
function parseCSV(file, done = () => {}) {
  errorMessage.value = ''
  importWarning.value = ''
  // Papa.parse works asynchronously and reports back through the `complete`
  // or `error` callback, like a Java listener interface.
  Papa.parse(file, {
    ...CSV_PARSE_OPTIONS,
    complete: (results) => {
      const { rows, fields, skippedRows, fatalError } = normalizeParseResult(results)
      // The file had no header line or no data rows. The old rows stay as
      // they were, so a bad file does not wipe the previous import.
      if (fatalError) {
        errorMessage.value = t(fatalError === 'noHeader' ? 'errors.csvNoHeader' : 'errors.csvNoRows')
        done({ ok: false })
        return
      }
      // Some rows could not be read (wrong number of fields); the rest is
      // still imported and the user gets a hint.
      if (skippedRows > 0) {
        importWarning.value = t('deadlines.rowsSkipped', { count: skippedRows })
      }
      // Assigning `tasks` triggers the watch in useColumnMapping.js.
      tasks.value = rows
      columns.value = fields
      saveTasks(file.name, rows)
      done({ ok: true, rows: rows.length })
    },
    error: (err) => {
      errorMessage.value = t('errors.fileReadError', { message: err.message })
      done({ ok: false })
    },
  })
}

/**
 * Reads a CSV file into the shared import state; resolves with { ok, rows? }.
 *
 * @param {File} file the CSV file
 * @returns {Promise<{ ok: boolean, rows?: number }>} resolves when parsing is done
 */
function importFile(file) {
  uploadedFile.value = file
  // parseCSV uses a callback; wrapping it in a Promise lets callers `await` it.
  return new Promise(resolve => parseCSV(file, resolve))
}

/**
 * Drag over the drop zone: show the highlight.
 *
 * @param {DragEvent} e browser event
 */
function handleDragOver(e) {
  // Without preventDefault the browser would not allow a drop here and would
  // open the file instead.
  e.preventDefault()
  isDragging.value = true
}

/** Drag left the drop zone: remove the highlight. */
function handleDragLeave() {
  isDragging.value = false
}

/**
 * A file was dropped on the drop zone.
 *
 * @param {DragEvent} e browser event
 * @sideeffect starts parsing
 */
function handleDrop(e) {
  e.preventDefault()
  isDragging.value = false
  // Only the first file counts if several were dropped.
  // HINWEIS: The file type is not checked here (unlike useFileImport.js);
  // any dropped file is handed to the CSV parser.
  const file = e.dataTransfer.files[0]
  // Dropping text or a link instead of a file gives no file; then nothing happens.
  if (file) {
    uploadedFile.value = file
    parseCSV(file)
  }
}

/**
 * A file was chosen in the file picker (`<input type="file">`).
 *
 * @param {Event} e change event of the input
 * @sideeffect starts parsing, clears the input
 */
function handleFileSelect(e) {
  const file = e.target.files[0]
  // The user can close the picker without choosing anything.
  if (file) {
    uploadedFile.value = file
    parseCSV(file)
  }
  // Reset so choosing the same file again still fires "change"
  e.target.value = ''
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {object} the shared refs and handlers listed in the file header
 */
export function useCSVImport() {
  return {
    uploadedFile,
    isDragging,
    tasks,
    columns,
    errorMessage,
    importWarning,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
    importFile,
  }
}
