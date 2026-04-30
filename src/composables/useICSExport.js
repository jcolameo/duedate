import { ref } from 'vue'
import { createEvents } from 'ics'

/**
 * Composable für .ics-Kalender-Export.
 * @param {ComputedRef<Array>} enrichedTasks
 */
export function useICSExport(enrichedTasks) {
  const exportMessage = ref('')
  const exportError = ref('')

  function exportToICS() {
    exportMessage.value = ''
    exportError.value = ''

    const validTasks = enrichedTasks.value.filter(t => t._deadlineDate)
    if (validTasks.length === 0) {
      exportError.value = 'Keine Aufgaben mit gültigem Datum gefunden.'
      return
    }

    const events = validTasks.map((task) => {
      const d = task._deadlineDate
      const subject = task['Fach'] || ''
      const title = task['Titel'] || 'Aufgabe'
      const grade = task._isGraded ? ' ⭐' : ''
      const description = task['Beschreibung'] || ''

      return {
        title: `📚 ${subject}: ${title}${grade}`,
        description: description.slice(0, 500),
        start: [d.getFullYear(), d.getMonth() + 1, d.getDate()],
        duration: { days: 1 },
        categories: ['Hausaufgaben', subject].filter(Boolean),
        status: 'CONFIRMED',
        busyStatus: 'BUSY',
      }
    })

    createEvents(events, (error, value) => {
      if (error) {
        exportError.value = `ICS-Export-Fehler: ${error.message}`
        return
      }
      const blob = new Blob([value], { type: 'text/calendar;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = 'deadlines.ics'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      exportMessage.value = `✅ ${events.length} Termine exportiert → deadlines.ics`
    })
  }

  return {
    exportMessage,
    exportError,
    exportToICS,
  }
}