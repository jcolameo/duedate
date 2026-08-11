import { ref } from 'vue'
import { createEvents } from 'ics'
import { useLocale } from './useLocale.js'

/**
 * Composable für den kombinierten .ics-Export von My Week:
 * Deadlines (ganztägig) + geplante Arbeits-Sessions (mit Uhrzeit) in einer Datei.
 */
export function useCombinedExport() {
  const { t } = useLocale()
  const exportMessage = ref('')
  const exportError = ref('')

  function exportWeekToICS(enrichedTasks, sessions) {
    exportMessage.value = ''
    exportError.value = ''

    const deadlineTasks = enrichedTasks.filter(task => task._deadlineDate)
    const workSessions = sessions || []

    if (deadlineTasks.length === 0 && workSessions.length === 0) {
      exportError.value = t('errors.nothingToExport')
      return
    }

    const deadlineEvents = deadlineTasks.map((task) => {
      const d = task._deadlineDate
      const category = task._category || ''
      const title = task._title || t('common.untitled')
      const grade = task._isGraded ? ' ⭐' : ''
      const eventTitle = category ? `📚 ${category}: ${title}${grade}` : `📚 ${title}${grade}`

      return {
        title: eventTitle,
        start: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
        duration: { days: 1 },
        categories: ['Hausaufgaben', category].filter(Boolean),
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
      }
    })

    const sessionEvents = workSessions.map((session) => {
      const d = session.date
      return {
        title: `📊 ${session.title}`,
        start: [
          d.getFullYear(), d.getMonth() + 1, d.getDate(),
          Math.floor(session.startMin / 60), session.startMin % 60,
        ],
        duration: { minutes: session.endMin - session.startMin },
        categories: ['Stundenplan'],
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
      }
    })

    const events = [...deadlineEvents, ...sessionEvents]

    createEvents(events, (error, value) => {
      if (error) {
        exportError.value = t('errors.icsExportError', { message: error.message })
        return
      }
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'my-week.ics'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      exportMessage.value = t('export.weekExported', { count: events.length })
    })
  }

  return {
    exportMessage,
    exportError,
    exportWeekToICS,
  }
}
