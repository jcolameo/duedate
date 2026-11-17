/**
 * useICSExport: the "Export to calendar" button on the Deadlines page. It
 * writes all open deadlines as all-day events into an .ics file, with
 * reminders.
 *
 * Called by: src/views/DeadlinesView.vue:63, which passes its
 * `enrichedTasks` computed in.
 *
 * In: `enrichedTasks`, a ref or computed with enriched tasks (fields like
 * `_deadlineDate`, `_isDone` from useTaskEnrichment.js).
 * Out: `{ exportMessage, exportError, exportToICS }`.
 *
 * In the background: no storage. A file download is the only effect.
 *
 * Not module level: the message refs are created per call, so each page has
 * its own messages.
 *
 * How to read this file: one function, `exportToICS`. Compare it with
 * useCombinedExport.js: same structure, but with reminders and descriptions,
 * and deadlines only.
 */
import { ref } from 'vue'
import { useLocale } from './useLocale.js'
import { buildDeadlineEvent, buildIcs, downloadIcs } from '../utils/ics.js'

/**
 * .ics export of all deadlines (all-day events). Uses the normalized task
 * fields from useTaskEnrichment, so it works with any CSV column naming.
 *
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @param {import('vue').Ref<object[]>} enrichedTasks the tasks to export (read as `.value`)
 * @returns {{ exportMessage: import('vue').Ref<string>, exportError: import('vue').Ref<string>, exportToICS: Function }}
 */
export function useICSExport(enrichedTasks) {
  const { t } = useLocale()
  // `ref` is like a field in a React class component's `state`, but you read
  // and write `.value` instead of calling `setState`.
  const exportMessage = ref('')
  const exportError = ref('')

  /**
   * Builds the .ics file and starts the download.
   *
   * @returns {Promise<void>}
   * @sideeffect sets exportMessage or exportError, triggers a file download
   */
  async function exportToICS() {
    exportMessage.value = ''
    exportError.value = ''

    // `.value` is read at click time, so the export always uses the current
    // list, not the one from when the page was set up.
    const validTasks = enrichedTasks.value.filter(task => task._deadlineDate && !task._isDone)
    // Every task is done or has no readable date: nothing to put in a calendar.
    if (validTasks.length === 0) {
      exportError.value = t('errors.noValidTasks')
      return
    }

    const events = validTasks.map(task => buildDeadlineEvent(task, { untitled: t('common.untitled'), withReminders: true }))
    // buildIcs loads the ics library on demand and can reject on invalid
    // event data; the error is shown on the page instead of crashing.
    try {
      downloadIcs(await buildIcs(events), 'deadlines.ics')
      exportMessage.value = t('export.deadlinesExported', { count: events.length })
    } catch (error) {
      exportError.value = t('errors.icsExportError', { message: error.message })
    }
  }

  return { exportMessage, exportError, exportToICS }
}
