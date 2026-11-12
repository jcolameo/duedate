import { ref } from 'vue'
import { useLocale } from './useLocale.js'
import { buildDeadlineEvent, buildSessionEvent, buildIcs, downloadIcs } from '../utils/ics.js'

/**
 * Combined .ics export for My Week: deadlines (all-day) + planned work
 * sessions (timed) in one file. Same UIDs as the separate exports, so mixing
 * exports never creates duplicates in the calendar.
 */
export function useCombinedExport() {
  const { t } = useLocale()
  const exportMessage = ref('')
  const exportError = ref('')

  async function exportWeekToICS(enrichedTasks, sessions) {
    exportMessage.value = ''
    exportError.value = ''

    const deadlineTasks = enrichedTasks.filter(task => task._deadlineDate && !task._isDone)
    const workSessions = sessions || []

    if (deadlineTasks.length === 0 && workSessions.length === 0) {
      exportError.value = t('errors.nothingToExport')
      return
    }

    // Combined export historically had no descriptions; kept identical
    const events = [
      ...deadlineTasks.map(task => buildDeadlineEvent(task, { untitled: t('common.untitled'), withDescription: false })),
      ...workSessions.map(buildSessionEvent),
    ]
    try {
      downloadIcs(await buildIcs(events), 'my-week.ics')
      exportMessage.value = t('export.weekExported', { count: events.length })
    } catch (error) {
      exportError.value = t('errors.icsExportError', { message: error.message })
    }
  }

  return { exportMessage, exportError, exportWeekToICS }
}
