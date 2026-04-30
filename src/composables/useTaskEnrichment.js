import { computed } from 'vue'
import { parseGermanDate, daysUntil } from '../utils/dateParser.js'

const STATUS_STYLES = {
  red:     'bg-red-500/20 text-red-300 border-red-500/40',
  orange:  'bg-orange-500/20 text-orange-300 border-orange-500/40',
  yellow:  'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  slate:   'bg-slate-500/20 text-slate-300 border-slate-500/40',
}

function computeStatus(days) {
  if (days === null) return { label: '?', color: 'slate' }
  if (days < 0) return { label: 'OVERDUE', color: 'red' }
  if (days < 3) return { label: 'URGENT', color: 'orange' }
  if (days < 7) return { label: 'SOON', color: 'yellow' }
  return { label: 'OK', color: 'emerald' }
}

/**
 * Composable: nimmt rohe Tasks und reichert sie an.
 * @param {Ref<Array>} tasks - reaktive Liste roher CSV-Zeilen
 */
export function useTaskEnrichment(tasks) {
  const enrichedTasks = computed(() => {
    return tasks.value
      .map((task) => {
        const deadlineRaw = task['Abgabe'] || task['Deadline'] || task['Due'] || ''
        const deadlineDate = parseGermanDate(deadlineRaw)
        const days = daysUntil(deadlineDate)
        const status = computeStatus(days)
        const isGraded = (task['Benotet?'] || task['Benotet'] || '')
          .toString().toLowerCase().startsWith('j')
        return {
          ...task,
          _deadlineDate: deadlineDate,
          _days: days,
          _status: status,
          _isGraded: isGraded,
        }
      })
      .sort((a, b) => {
        if (a._days === null) return 1
        if (b._days === null) return -1
        return a._days - b._days
      })
  })

  const exportableCount = computed(() =>
    enrichedTasks.value.filter(t => t._deadlineDate).length
  )

  return {
    enrichedTasks,
    exportableCount,
    STATUS_STYLES,
  }
}