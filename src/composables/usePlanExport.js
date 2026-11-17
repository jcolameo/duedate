/**
 * usePlanExport: the "Export plan" button on the Stundenplan page. It writes
 * the planned work sessions as timed events into an .ics calendar file.
 *
 * Called by: src/views/StundenplanView.vue:33.
 *
 * In: nothing when called. `exportPlanToICS(sessions)` takes the sessions of
 * the current plan (`plan.value.sessions` from usePlanState.js).
 * Out: `{ exportMessage, exportError, exportPlanToICS }`.
 *
 * In the background: no storage. A file download is the only effect.
 *
 * Not module level: the message refs are created per call, so each page has
 * its own messages.
 *
 * How to read this file: one function. It is the session-only sibling of
 * useICSExport.js (deadlines) and useCombinedExport.js (both).
 */
import { ref } from 'vue'
import { useLocale } from './useLocale.js'
import { buildSessionEvent, buildIcs, downloadIcs } from '../utils/ics.js'

/**
 * .ics export of the generated weekly plan (timed work sessions).
 *
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ exportMessage: import('vue').Ref<string>, exportError: import('vue').Ref<string>, exportPlanToICS: Function }}
 */
export function usePlanExport() {
  const { t } = useLocale()
  // `ref` is like a field in a React class component's `state`, but you read
  // and write `.value` instead of calling `setState`.
  const exportMessage = ref('')
  const exportError = ref('')

  /**
   * Builds the .ics file from the sessions and starts the download.
   *
   * @param {object[]|null|undefined} sessions the planned work sessions
   * @returns {Promise<void>}
   * @sideeffect sets exportMessage or exportError, triggers a file download
   */
  async function exportPlanToICS(sessions) {
    exportMessage.value = ''
    exportError.value = ''

    // No plan generated yet (null) or a plan without any sessions.
    if (!sessions || sessions.length === 0) {
      exportError.value = t('errors.noPlanToExport')
      return
    }

    const events = sessions.map(buildSessionEvent)
    // buildIcs loads the ics library on demand and can reject on invalid
    // event data; the error is shown on the page instead of crashing.
    try {
      downloadIcs(await buildIcs(events), 'stundenplan.ics')
      exportMessage.value = t('export.sessionsExported', { count: events.length })
    } catch (error) {
      exportError.value = t('errors.icsExportError', { message: error.message })
    }
  }

  return { exportMessage, exportError, exportPlanToICS }
}
