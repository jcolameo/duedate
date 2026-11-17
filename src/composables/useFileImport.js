/**
 * useFileImport: one door for "the user gave us a file". It looks at the file
 * type, hands the file to the right reader, and shows a toast that says what
 * happened (with undo).
 *
 * Called by: src/App.vue:22 (file dropped anywhere on the window) and
 * src/components/QuickAdd.vue:41 (file chosen in the "New task" dialog).
 *
 * In: nothing when called. `importFile(file)` takes a browser File.
 * Out: `{ importFile }`. It resolves with `{ status }`, see the list below.
 *
 * In the background: no storage of its own. It drives three shared stores:
 * useCSVImport.js (parse), useColumnMapping.js (detect columns, its `watch`
 * creates the tasks) and useTasks.js (where the tasks end up).
 *
 * Not module level: nothing is stored here; every call works on the shared
 * stores, so all callers see the same result.
 *
 * How to read this file: `importFile` at the bottom picks a reader, then read
 * `importCsv`. The invisible step is between `readCsv` and the task count:
 * the tasks are created by the `watch` in useColumnMapping.js, not here,
 * which is why the code waits two ticks.
 */
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
 *
 * Composable: a plain function that returns reactive state (here only an
 * action). Vue has no special syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ importFile: (file: File) => Promise<{ status: string, count?: number }> }}
 */
export function useFileImport() {
  const { importFile: readCsv, errorMessage } = useCSVImport()
  const { needsConfirmation } = useColumnMapping()
  const { tasks } = useTasks()
  const toast = useToast()
  const { t } = useLocale()

  /**
   * Imports a CSV file and reports the result with a toast.
   *
   * @param {File} file the CSV file
   * @returns {Promise<{ status: string, count?: number }>} see the list above
   * @sideeffect parses the file, may add tasks, shows a toast
   */
  async function importCsv(file) {
    // Snapshot of the task array before the import. It is used twice: to
    // count what is new, and as the undo state.
    const before = tasks.value
    const result = await readCsv(file)
    // Parsing failed (no header, no rows, unreadable file); useCSVImport
    // already put the reason into errorMessage.
    if (!result.ok) {
      toast.show(errorMessage.value, { tone: 'error' })
      return { status: 'error' }
    }
    // The shared watcher turns the rows into tasks on the next ticks
    // nextTick() waits until Vue has run pending watchers and updates. The
    // first tick lets the watch in useColumnMapping.js run, the second lets
    // its follow-up changes settle.
    // HINWEIS: Waiting exactly two ticks is a timing assumption; if the
    // watcher chain gets longer, the count below would be taken too early.
    await nextTick()
    await nextTick()
    // The columns of this file are unknown, so nothing was imported yet; the
    // user has to confirm the mapping on the Deadlines page first.
    if (needsConfirmation.value) {
      toast.show(t('import.checkColumns', { file: file.name }))
      return { status: 'needs-mapping' }
    }
    const known = new Set(before.map(task => task.id))
    const added = tasks.value.filter(task => !known.has(task.id)).length
    // The same file imported twice: mergeImport recognises the tasks and adds
    // nothing.
    if (added === 0) {
      toast.show(t('import.nothingNew', { file: file.name }))
      return { status: 'nothing-new' }
    }
    // HINWEIS: Undo puts back the whole old array, so any task change made
    // between the import and the click on "Undo" is lost as well.
    toast.show(t('import.done', { count: added, file: file.name }), {
      tone: 'success',
      action: { label: t('ui.undo'), onClick: () => { tasks.value = before } },
    })
    return { status: 'imported', count: added }
  }

  // File kind (from utils/fileTypes.js) -> reader function.
  const readers = { csv: importCsv }

  /**
   * Imports any file the user hands over.
   *
   * @param {File} file the file
   * @returns {Promise<{ status: string, count?: number }>} see the list above
   * @sideeffect shows a toast; for CSV see importCsv
   */
  async function importFile(file) {
    const reader = readers[detectFileKind(file)]
    // Excel, PDF, images, …: no reader yet, so we say so instead of failing.
    if (!reader) {
      toast.show(t('import.unsupported', { file: file.name }), { tone: 'error' })
      return { status: 'unsupported' }
    }
    return reader(file)
  }

  return { importFile }
}
