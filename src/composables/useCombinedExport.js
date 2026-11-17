/**
 * useCombinedExport: the "Export week" button on the calendar page. It writes
 * one .ics calendar file with all open deadlines and all planned work
 * sessions, so the user can import both into Google Calendar or Outlook.
 *
 * Called by: src/views/CalendarView.vue:46.
 *
 * In: nothing when called. `exportWeekToICS(enrichedTasks, sessions)` takes
 * the enriched tasks (from useTaskEnrichment / usePlanState) and the plan's
 * sessions. Out: `{ exportMessage, exportError, exportWeekToICS }`; the two
 * refs hold the success or error text that the page shows.
 *
 * In the background: no storage. A file download is the only effect.
 *
 * Not module level: the message refs are created inside the function, so
 * each page that calls this gets its own messages. This is the "normal"
 * composable shape; most other files here share one state instead.
 *
 * How to read this file: it is one function. The event building lives in
 * src/utils/ics.js; this file only picks the tasks, sets the texts and
 * catches errors.
 */
import { ref } from 'vue'
import { useLocale } from './useLocale.js'
import { buildDeadlineEvent, buildSessionEvent, buildIcs, downloadIcs } from '../utils/ics.js'

/**
 * Combined .ics export for My Week: deadlines (all-day) + planned work
 * sessions (timed) in one file. Same UIDs as the separate exports, so mixing
 * exports never creates duplicates in the calendar.
 *
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ exportMessage: import('vue').Ref<string>, exportError: import('vue').Ref<string>, exportWeekToICS: Function }}
 */
export function useCombinedExport() {
  const { t } = useLocale()
  // `ref` is like a field in a React class component's `state`, but you read
  // and write `.value` instead of calling `setState`.
  const exportMessage = ref('')
  const exportError = ref('')

  /**
   * Builds the .ics file and starts the download.
   *
   * @param {object[]} enrichedTasks tasks with derived fields (`_deadlineDate`, `_isDone`)
   * @param {object[]|null} sessions planned work sessions, may be null if no plan exists
   * @returns {Promise<void>}
   * @sideeffect sets exportMessage or exportError, triggers a file download
   */
  async function exportWeekToICS(enrichedTasks, sessions) {
    // Clear the old message first, so a second click never shows a stale one.
    exportMessage.value = ''
    exportError.value = ''

    // Only open tasks with a readable date can become calendar events.
    const deadlineTasks = enrichedTasks.filter(task => task._deadlineDate && !task._isDone)
    const workSessions = sessions || []

    // No deadlines and no plan: an empty calendar file would only confuse.
    if (deadlineTasks.length === 0 && workSessions.length === 0) {
      exportError.value = t('errors.nothingToExport')
      return
    }

    // Combined export historically had no descriptions; kept identical
    const events = [
      ...deadlineTasks.map(task => buildDeadlineEvent(task, { untitled: t('common.untitled'), withDescription: false })),
      ...workSessions.map(buildSessionEvent),
    ]
    // buildIcs loads the ics library lazily and can fail (network, invalid
    // event data); the error is shown on the page instead of crashing.
    try {
      downloadIcs(await buildIcs(events), 'duedate-plan.ics')
      exportMessage.value = t('export.weekExported', { count: events.length })
    } catch (error) {
      exportError.value = t('errors.icsExportError', { message: error.message })
    }
  }

  return { exportMessage, exportError, exportWeekToICS }
}
