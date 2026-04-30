import { ref } from 'vue'
import Papa from 'papaparse'

/**
 * Composable für CSV-Upload via Drag&Drop oder File-Input.
 * Liefert reaktive States + Handler.
 */
export function useCSVImport() {
  const uploadedFile = ref(null)
  const isDragging = ref(false)
  const tasks = ref([])
  const columns = ref([])
  const errorMessage = ref('')

  function parseCSV(file) {
    errorMessage.value = ''
    Papa.parse(file, {
      header: true,
      delimiter: ';',
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          errorMessage.value = `Parse-Fehler: ${results.errors[0].message}`
          return
        }
        tasks.value = results.data
        columns.value = results.meta.fields || []
      },
      error: (err) => {
        errorMessage.value = `Datei konnte nicht gelesen werden: ${err.message}`
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