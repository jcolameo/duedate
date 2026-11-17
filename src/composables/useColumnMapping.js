/**
 * useColumnMapping: decides which CSV column holds the title, which the
 * deadline, and so on. It proposes a mapping, lets the user correct it, and
 * once the user confirms, turns the raw CSV rows into tasks.
 *
 * Called by: src/views/DeadlinesView.vue:42 (the mapping confirmation UI with
 * src/components/ColumnMappingConfirm.vue), and inside this folder by
 * useFileImport.js (`needsConfirmation`).
 *
 * In: nothing. Out: the refs `detectedMapping`, `userMapping`, `suggestions`,
 * `missingRequired`, `availableColumns`, `isConfirmed`, the computed values
 * `hasRequiredFields`, `needsConfirmation`, and the actions `analyzeNewCSV`,
 * `updateMapping`, `confirmMapping`, `resetMapping`, `clearSavedMapping`.
 * A mapping is an object like `{ title: 'Aufgabe', deadline: 'Datum' }`:
 * role -> CSV column name.
 *
 * In the background: the confirmed mapping is saved under
 * `duedate.columnMapping.v1`. A `watch` on the raw rows of useCSVImport.js
 * runs at import time and after every new upload, and may write tasks into
 * useTasks.js.
 *
 * Why module level: all refs exist once, so Home, Deadlines and the import
 * dialog see the same mapping instead of two unsynced copies.
 *
 * How to read this file: start with the `watch` at the bottom, it is the
 * entry point. It calls `analyzeNewCSV`, which fills the state. Then read
 * `confirmMapping`, the second way rows become tasks. Importing this file
 * already has effects, because the `watch` runs immediately.
 */
import { ref, computed, watch } from 'vue'
import { detectColumns } from '../utils/columnDetector.js'
import { useCSVImport } from './useCSVImport.js'
import { useTasks } from './useTasks.js'
import { withRole, isSavedMappingUsable } from '../utils/mapping.js'

const STORAGE_KEY = 'duedate.columnMapping.v1'

// Shared state of the mapping step. The short trailing comments on these
// lines are older German notes; in English: what the detector proposed, what
// the user confirmed or changed, all columns with detection info, required
// roles that were not found, whether the user confirmed, all CSV columns (for
// the dropdowns).
// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one copy for the whole app.
const detectedMapping = ref({})       // Was die Engine vorgeschlagen hat
const userMapping = ref({})           // Was der User bestätigt/geändert hat
const suggestions = ref([])           // Alle Spalten + Detection-Info
const missingRequired = ref([])       // Fehlende Pflichtfelder
const isConfirmed = ref(false)        // Hat User bestätigt?
const availableColumns = ref([])      // Alle CSV-Spalten (für Dropdowns)

/**
 * Loads the saved mapping from localStorage.
 *
 * @returns {object|null} role -> column name, or null if none or unreadable
 */
function loadSavedMapping() {
  // Blocked storage or broken JSON: act as if no mapping was saved.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    console.warn('[ColumnMapping] LocalStorage read failed:', e)
    return null
  }
}

/**
 * Saves a mapping in localStorage.
 *
 * @param {object} mapping role -> column name
 * @sideeffect writes `duedate.columnMapping.v1`
 */
function saveMapping(mapping) {
  // If saving fails, the mapping still works now; the user just has to
  // confirm it again after the next upload.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping))
  } catch (e) {
    console.warn('[ColumnMapping] LocalStorage write failed:', e)
  }
}

/**
 * Runs column detection on freshly parsed CSV data and fills the shared state.
 * A saved mapping wins over the detector if it still fits the columns.
 *
 * @param {Array<string>} headers CSV column names
 * @param {Array<Object>} rows parsed rows (the detector looks at the values)
 * @sideeffect sets all refs above; may log that a saved mapping was reused
 */
function analyzeNewCSV(headers, rows) {
  const result = detectColumns(headers, rows)
  detectedMapping.value = result.mapping
  suggestions.value = result.suggestions
  missingRequired.value = result.missingRequired
  availableColumns.value = headers

  const saved = loadSavedMapping()
  // The user confirmed a mapping before, and every column it names still
  // exists in this file (same export format as last time): reuse it without
  // asking again.
  if (isSavedMappingUsable(saved, headers)) {
    // Drop empty values that older versions may have saved
    userMapping.value = Object.fromEntries(Object.entries(saved).filter(([, col]) => col))
    isConfirmed.value = true  // Auto-confirm wenn alles bekannt
    console.info('[ColumnMapping] Saved mapping reused')
  } else {
    // New or changed file layout: start from the detector's proposal and let
    // the user confirm it. The trailing note means "user must confirm".
    userMapping.value = { ...result.mapping }
    isConfirmed.value = false  // User muss bestätigen
  }
}

/**
 * User changes one role (dropdown). An empty choice removes the role
 * instead of storing null — see utils/mapping.js.
 *
 * @param {string} role e.g. 'title' or 'deadline'
 * @param {string} column CSV column name, or '' to remove the role
 */
function updateMapping(role, column) {
  userMapping.value = withRole(userMapping.value, role, column)
}

/**
 * The user confirms the mapping: it is saved and the rows become tasks.
 *
 * @sideeffect writes localStorage, sets isConfirmed, imports tasks into useTasks
 */
function confirmMapping() {
  saveMapping(userMapping.value)
  isConfirmed.value = true
  // The confirmed mapping turns the raw rows into tasks (B1)
  // `rawRows` and `applyCsvImport` are defined further down; that is fine,
  // because this function only runs later, on a click.
  applyCsvImport(rawRows.value, userMapping.value)
}

/**
 * Shows the mapping step again (button "Change mapping"). Nothing is deleted.
 *
 * @sideeffect sets isConfirmed to false
 */
function resetMapping() {
  isConfirmed.value = false
}

/**
 * Deletes the saved mapping completely (meant for debugging).
 *
 * @sideeffect removes `duedate.columnMapping.v1`, sets isConfirmed to false
 */
function clearSavedMapping() {
  // HINWEIS: Unlike the other storage calls, removeItem is not in a
  // try/catch; with blocked storage this throws.
  localStorage.removeItem(STORAGE_KEY)
  isConfirmed.value = false
}

// `computed` is like a getter that React would recompute in `render`, but
// Vue caches it until a ref it reads (here `userMapping`) changes.
/**
 * True if the user mapping has both required roles, title and deadline.
 */
const hasRequiredFields = computed(() => {
  return !!(userMapping.value.title && userMapping.value.deadline)
})

/**
 * True if a CSV is loaded but its mapping is not confirmed yet; the UI then
 * shows the confirmation step.
 */
const needsConfirmation = computed(() => {
  return availableColumns.value.length > 0 && !isConfirmed.value
})

// Runs whenever the raw CSV rows change (new upload, or restored from
// localStorage at app start) — regardless of which view is mounted.
// Rows only become tasks on a *new* upload with a reusable mapping, or when
// the user confirms a mapping. Restoring at start does not re-import, so
// changes made in the task store are never overwritten by an old CSV.
const { tasks: rawRows } = useCSVImport()
const { applyCsvImport } = useTasks()
// `watch` is like `componentDidUpdate`, but it names the value it listens to.
// `{ immediate: true }` also runs it once right now, at import time, with
// `oldRows` undefined; that is how a restored CSV is analysed at app start.
watch(rawRows, (rows, oldRows) => {
  // No CSV loaded yet, or a file without data rows: nothing to analyse.
  if (!rows || rows.length === 0) return
  analyzeNewCSV(Object.keys(rows[0]), rows)
  // oldRows is undefined only for the immediate first run (app start).
  const isNewUpload = oldRows !== undefined
  if (isNewUpload && isConfirmed.value) applyCsvImport(rows, userMapping.value)
}, { immediate: true })

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {object} the shared refs, computed values and actions from the file header
 */
export function useColumnMapping() {
  return {
    // State
    detectedMapping,
    userMapping,
    suggestions,
    missingRequired,
    availableColumns,
    isConfirmed,

    // Computed
    hasRequiredFields,
    needsConfirmation,

    // Actions
    analyzeNewCSV,
    updateMapping,
    confirmMapping,
    resetMapping,
    clearSavedMapping,
  }
}
