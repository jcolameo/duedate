import { ref, computed, watch } from 'vue'
import { detectColumns } from '../utils/columnDetector.js'
import { useCSVImport } from './useCSVImport.js'

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
  if (saved && areColumnsCompatible(saved, headers)) {
    userMapping.value = { ...saved }
    isConfirmed.value = true  // Auto-confirm wenn alles bekannt
    console.info('[ColumnMapping] Saved mapping reused')
  } else {
    userMapping.value = { ...result.mapping }
    isConfirmed.value = false  // User muss bestätigen
  }
}

/**
 * Prüft ob gespeichertes Mapping zu aktuellen CSV-Spalten passt
 */
function areColumnsCompatible(savedMapping, currentHeaders) {
  const headerSet = new Set(currentHeaders)
  return Object.values(savedMapping).every(col => headerSet.has(col))
}

/**
 * User ändert ein Mapping (z.B. Dropdown)
 */
function updateMapping(role, column) {
  userMapping.value = { ...userMapping.value, [role]: column }
}

/**
 * User bestätigt Mapping → wird gespeichert
 */
function confirmMapping() {
  saveMapping(userMapping.value)
  isConfirmed.value = true
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

// Läuft automatisch, sobald sich die geteilte Task-Liste ändert (Upload,
// oder aus LocalStorage wiederhergestellt) — unabhängig davon, welche View
// gerade gemounted ist.
const { tasks } = useCSVImport()
watch(tasks, (newTasks) => {
  if (newTasks && newTasks.length > 0) {
    analyzeNewCSV(Object.keys(newTasks[0]), newTasks)
  }
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
