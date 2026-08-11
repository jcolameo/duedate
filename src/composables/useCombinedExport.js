import { ref } from 'vue'
import { createEvents } from 'ics'

/**
 * Composable für den kombinierten .ics-Export von My Week:
 * Deadlines (ganztägig) + geplante Arbeits-Sessions (mit Uhrzeit) in einer Datei.
 */
export function useCombinedExport() {
  const exportMessage = ref('')
  const exportError = ref('')

  function exportWeekToICS(enrichedTasks, sessions) {
    exportMessage.value = ''
    exportError.value = ''

    const deadlineTasks = enrichedTasks.filter(t => t._deadlineDate)
    const workSessions = sessions || []

    if (deadlineTasks.length === 0 && workSessions.length === 0) {
      exportError.value = 'Nichts zum Exportieren vorhanden.'
      return
    }

    const deadlineEvents = deadlineTasks.map((task) => {
      const d = task._deadlineDate
      const category = task._category || ''
      const title = task._title || 'Aufgabe'
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
        exportError.value = `ICS-Export-Fehler: ${error.message}`
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

      exportMessage.value = `✅ ${events.length} Termine exportiert → my-week.ics`
    })
  }

  return {
    exportMessage,
    exportError,
    exportWeekToICS,
  }
}
