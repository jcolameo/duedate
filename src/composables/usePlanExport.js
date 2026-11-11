import { ref } from 'vue'
import { useLocale } from './useLocale.js'
import { buildSessionEvent, buildIcs, downloadIcs } from '../utils/ics.js'

/**
 * .ics export of the generated weekly plan (timed work sessions).
 */
export function usePlanExport() {
  const { t } = useLocale()
  const exportMessage = ref('')
  const exportError = ref('')

  async function exportPlanToICS(sessions) {
    exportMessage.value = ''
    exportError.value = ''

    if (!sessions || sessions.length === 0) {
      exportError.value = t('errors.noPlanToExport')
      return
    }

    const events = sessions.map(buildSessionEvent)
    try {
      downloadIcs(await buildIcs(events), 'stundenplan.ics')
      exportMessage.value = t('export.sessionsExported', { count: events.length })
    } catch (error) {
      exportError.value = t('errors.icsExportError', { message: error.message })
    }
  }

  return { exportMessage, exportError, exportPlanToICS }
}
