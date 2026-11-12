import { ref } from 'vue'
import { useLocale } from './useLocale.js'
import { buildDeadlineEvent, buildIcs, downloadIcs } from '../utils/ics.js'

/**
 * .ics export of all deadlines (all-day events). Uses the normalized task
 * fields from useTaskEnrichment, so it works with any CSV column naming.
 */
export function useICSExport(enrichedTasks) {
  const { t } = useLocale()
  const exportMessage = ref('')
  const exportError = ref('')

  async function exportToICS() {
    exportMessage.value = ''
    exportError.value = ''

    const validTasks = enrichedTasks.value.filter(task => task._deadlineDate && !task._isDone)
    if (validTasks.length === 0) {
      exportError.value = t('errors.noValidTasks')
      return
    }

    const events = validTasks.map(task => buildDeadlineEvent(task, { untitled: t('common.untitled') }))
    try {
      downloadIcs(await buildIcs(events), 'deadlines.ics')
      exportMessage.value = t('export.deadlinesExported', { count: events.length })
    } catch (error) {
      exportError.value = t('errors.icsExportError', { message: error.message })
    }
  }

  return { exportMessage, exportError, exportToICS }
}
