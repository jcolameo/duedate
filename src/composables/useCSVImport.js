import { ref } from 'vue'
import Papa from 'papaparse'
import { useLocale } from './useLocale.js'

const { t } = useLocale()

const STORAGE_KEY = 'duedate.tasks.v1'

/**
 * Shared module-level state so imported tasks survive navigation between
 * views (e.g. Deadlines -> Home) and page reloads, not just one component's
 * lifetime — same singleton pattern as useTheme.js.
 */
function loadSavedTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : null
  } catch (e) {
    console.warn('[CSVImport] LocalStorage read failed:', e)
    return null
  }
}

function saveTasks(fileName, rows) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ fileName, rows }))
  } catch (e) {
    console.warn('[CSVImport] LocalStorage write failed:', e)
  }
}

const restored = loadSavedTasks()

const uploadedFile = ref(restored ? { name: restored.fileName } : null)
const isDragging = ref(false)
const tasks = ref(restored ? restored.rows : [])
const columns = ref(tasks.value.length ? Object.keys(tasks.value[0]) : [])
const errorMessage = ref('')

function parseCSV(file) {
  errorMessage.value = ''
  Papa.parse(file, {
    header: true,
    delimiter: ';',
    skipEmptyLines: true,
    complete: (results) => {
      if (results.errors.length > 0) {
        errorMessage.value = t('errors.parseError', { message: results.errors[0].message })
        return
      }
      tasks.value = results.data
      columns.value = results.meta.fields || []
      saveTasks(file.name, results.data)
    },
    error: (err) => {
      errorMessage.value = t('errors.fileReadError', { message: err.message })
    },
  })
}

function handleDragOver(e) {
  e.preventDefault()
  isDragging.value = true
}

function handleDragLeave() {
  isDragging.value = false
}

function handleDrop(e) {
  e.preventDefault()
  isDragging.value = false
  const file = e.dataTransfer.files[0]
  if (file) {
    uploadedFile.value = file
    parseCSV(file)
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0]
  if (file) {
    uploadedFile.value = file
    parseCSV(file)
  }
}

export function useCSVImport() {
  return {
    uploadedFile,
    isDragging,
    tasks,
    columns,
    errorMessage,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  }
}
