import { ref } from 'vue'
import { createEvents } from 'ics'

/**
 * Composable für .ics-Export des generierten Wochenplans.
 * Nutzt die von generatePlan() erzeugten Sessions (Titel, Tag, Start/Ende).
 */
export function usePlanExport() {
  const exportMessage = ref('')
  const exportError = ref('')

  function exportPlanToICS(sessions) {
    exportMessage.value = ''
    exportError.value = ''

    if (!sessions || sessions.length === 0) {
      exportError.value = 'Kein Plan zum Exportieren vorhanden.'
      return
    }

    const events = sessions.map((session) => {
      const d = session.date
      const durationMin = session.endMin - session.startMin
      return {
        title: `📊 ${session.title}`,
        start: [
          d.getFullYear(), d.getMonth() + 1, d.getDate(),
          Math.floor(session.startMin / 60), session.startMin % 60,
        ],
        duration: { minutes: durationMin },
        categories: ['Stundenplan'],
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
      link.download = 'stundenplan.ics'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      exportMessage.value = `✅ ${events.length} Sessions exportiert → stundenplan.ics`
    })
  }

  return {
    exportMessage,
    exportError,
    exportPlanToICS,
  }
}
