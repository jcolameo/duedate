import { ref, computed, watch } from 'vue'
import { detectColumns } from '../utils/columnDetector.js'
import { useCSVImport } from './useCSVImport.js'
import { useTasks } from './useTasks.js'
import { withRole, isSavedMappingUsable } from '../utils/mapping.js'

const STORAGE_KEY = 'duedate.columnMapping.v1'

/**
 * Composable für Column-Mapping-Management (shared module-level state,
 * same singleton pattern as useCSVImport.js, so Home and Deadlines see the
 * same resolved mapping instead of two independent, unsynced copies)
 *
 * Job:
 *  - Detection ausführen wenn CSV reinkommt
 *  - State halten (mapping, suggestions, isConfirmed)
 *  - User-Korrekturen in LocalStorage speichern
 *  - Beim nächsten CSV-Upload: gespeichertes Mapping bevorzugen
 */
const detectedMapping = ref({})       // Was die Engine vorgeschlagen hat
const userMapping = ref({})           // Was der User bestätigt/geändert hat
const suggestions = ref([])           // Alle Spalten + Detection-Info
const missingRequired = ref([])       // Fehlende Pflichtfelder
const isConfirmed = ref(false)        // Hat User bestätigt?
const availableColumns = ref([])      // Alle CSV-Spalten (für Dropdowns)

/**
 * Lädt gespeichertes Mapping aus LocalStorage
 */
function loadSavedMapping() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    console.warn('[ColumnMapping] LocalStorage read failed:', e)
    return null
  }
}

/**
 * Speichert Mapping in LocalStorage
 */
function saveMapping(mapping) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mapping))
  } catch (e) {
    console.warn('[ColumnMapping] LocalStorage write failed:', e)
  }
}

/**
 * Hauptfunktion: Wird aufgerufen wenn neue CSV geparsed wurde
 *
 * @param {Array<string>} headers - CSV-Spaltennamen
 * @param {Array<Object>} rows - Geparste Zeilen
 */
function analyzeNewCSV(headers, rows) {
  // 1. Engine-Detection
  const result = detectColumns(headers, rows)
  detectedMapping.value = result.mapping
  suggestions.value = result.suggestions
  missingRequired.value = result.missingRequired
  availableColumns.value = headers

  // 2. Gespeichertes Mapping laden — nur wenn Spalten passen
  const saved = loadSavedMapping()
  if (isSavedMappingUsable(saved, headers)) {
    // Drop empty values that older versions may have saved
    userMapping.value = Object.fromEntries(Object.entries(saved).filter(([, col]) => col))
    isConfirmed.value = true  // Auto-confirm wenn alles bekannt
    console.info('[ColumnMapping] Saved mapping reused')
  } else {
    userMapping.value = { ...result.mapping }
    isConfirmed.value = false  // User muss bestätigen
  }
}

/**
 * User changes one role (dropdown). An empty choice removes the role
 * instead of storing null — see utils/mapping.js.
 */
function updateMapping(role, column) {
  userMapping.value = withRole(userMapping.value, role, column)
}

/**
 * User bestätigt Mapping → wird gespeichert
 */
function confirmMapping() {
  saveMapping(userMapping.value)
  isConfirmed.value = true
  // The confirmed mapping turns the raw rows into tasks (B1)
  applyCsvImport(rawRows.value, userMapping.value)
}

/**
 * Reset (z.B. bei "Mapping ändern" Button)
 */
function resetMapping() {
  isConfirmed.value = false
}

/**
 * Komplettes Löschen (für Debugging)
 */
function clearSavedMapping() {
  localStorage.removeItem(STORAGE_KEY)
  isConfirmed.value = false
}

/**
 * Computed: Hat User-Mapping alle Pflichtfelder?
 */
const hasRequiredFields = computed(() => {
  return !!(userMapping.value.title && userMapping.value.deadline)
})

/**
 * Computed: Soll UI-Confirmation gezeigt werden?
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
watch(rawRows, (rows, oldRows) => {
  if (!rows || rows.length === 0) return
  analyzeNewCSV(Object.keys(rows[0]), rows)
  const isNewUpload = oldRows !== undefined
  if (isNewUpload && isConfirmed.value) applyCsvImport(rows, userMapping.value)
}, { immediate: true })

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
