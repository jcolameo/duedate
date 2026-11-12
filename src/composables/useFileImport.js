import { nextTick } from 'vue'
import { useCSVImport } from './useCSVImport.js'
import { useColumnMapping } from './useColumnMapping.js'
import { useTasks } from './useTasks.js'
import { useToast } from './useToast.js'
import { useLocale } from './useLocale.js'
import { detectFileKind } from '../utils/fileTypes.js'

/**
 * One entry point for "the user gave us a file" (New task dialog, drop on the
 * window). It picks the importer by file type and tells the user what
 * happened. Today only CSV: it uses the same pipeline as the Deadlines page
 * (parse -> column detection -> task store), so both always behave the same.
 *
 * New file types: add a case in `readers` (Excel and Markdown are planned).
 *
 * importFile resolves with { status } where status is
 *   'imported'      tasks were added (toast with undo is shown)
 *   'nothing-new'   the file only contained tasks that already exist
 *   'needs-mapping' the columns must be confirmed first: the caller opens Deadlines
 *   'unsupported'   a type we cannot read yet
 *   'error'         the file could not be read
 */
export function useFileImport() {
  const { importFile: readCsv, errorMessage } = useCSVImport()
  const { needsConfirmation } = useColumnMapping()
  const { tasks } = useTasks()
  const toast = useToast()
  const { t } = useLocale()

  async function importCsv(file) {
    const before = tasks.value
    const result = await readCsv(file)
    if (!result.ok) {
      toast.show(errorMessage.value, { tone: 'error' })
      return { status: 'error' }
    }
    // The shared watcher turns the rows into tasks on the next ticks
    await nextTick()
    await nextTick()
    if (needsConfirmation.value) {
      toast.show(t('import.checkColumns', { file: file.name }))
      return { status: 'needs-mapping' }
    }
    const known = new Set(before.map(task => task.id))
    const added = tasks.value.filter(task => !known.has(task.id)).length
    if (added === 0) {
      toast.show(t('import.nothingNew', { file: file.name }))
      return { status: 'nothing-new' }
    }
    toast.show(t('import.done', { count: added, file: file.name }), {
      tone: 'success',
      action: { label: t('ui.undo'), onClick: () => { tasks.value = before } },
    })
    return { status: 'imported', count: added }
  }

  const readers = { csv: importCsv }

  async function importFile(file) {
    const reader = readers[detectFileKind(file)]
    if (!reader) {
      toast.show(t('import.unsupported', { file: file.name }), { tone: 'error' })
      return { status: 'unsupported' }
    }
    return reader(file)
  }

  return { importFile }
}
