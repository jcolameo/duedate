import { computed } from 'vue'
import { parseGermanDate, daysUntil } from '../utils/dateParser.js'
import { taskId } from '../utils/taskId.js'

const STATUS_STYLES = {
  red:     'bg-red-500/20 text-red-300 light:text-red-700 border-red-500/40',
  orange:  'bg-orange-500/20 text-orange-300 light:text-orange-700 border-orange-500/40',
  yellow:  'bg-yellow-500/20 text-yellow-300 light:text-yellow-700 border-yellow-500/40',
  emerald: 'bg-emerald-500/20 text-emerald-300 light:text-emerald-700 border-emerald-500/40',
  slate:   'bg-slate-500/20 text-slate-300 light:text-slate-600 border-slate-500/40',
}

function computeStatus(days) {
  if (days === null) return { label: '?', color: 'slate' }
  if (days < 0) return { label: 'OVERDUE', color: 'red' }
  if (days < 3) return { label: 'URGENT', color: 'orange' }
  if (days < 7) return { label: 'SOON', color: 'yellow' }
  return { label: 'OK', color: 'emerald' }
}

/**
 * Sicheres Lesen via Mapping mit Legacy-Fallback
 * Wenn kein Mapping da → fallback auf alte hardcoded Spalten-Namen
 * Damit bricht nichts, falls Mapping leer ist
 */
function readField(task, mapping, role, fallbacks = []) {
  if (mapping && mapping[role] && task[mapping[role]] !== undefined) {
    return task[mapping[role]]
  }
  for (const f of fallbacks) {
    if (task[f] !== undefined) return task[f]
  }
  return ''
}

/**
 * Composable: nimmt rohe Tasks und reichert sie an.
 * @param {Ref<Array>} tasks - reaktive Liste roher CSV-Zeilen
 * @param {Ref<Object>} userMapping - reaktives Spalten-Mapping (optional)
 */
export function useTaskEnrichment(tasks, userMapping = null) {
  const enrichedTasks = computed(() => {
    const mapping = userMapping?.value || {}

    return tasks.value
      .map((task) => {
        // Felder via Mapping lesen (mit Fallback für Legacy)
        const title       = readField(task, mapping, 'title',       ['Titel', 'Title', 'Aufgabe'])
        const deadlineRaw = readField(task, mapping, 'deadline',    ['Abgabe', 'Deadline', 'Due', 'Fällig'])
        const startRaw    = readField(task, mapping, 'start',       ['Start', 'Beginn'])
        const category    = readField(task, mapping, 'category',    ['Fach', 'Category', 'Kategorie'])
        const description = readField(task, mapping, 'description', ['Beschreibung', 'Description'])
        const gradedRaw   = readField(task, mapping, 'graded',      ['Benotet?', 'Benotet', 'Graded'])
        const filesRaw    = readField(task, mapping, 'files',       ['Datei(en) zur Aufgabe', 'Datei', 'Files'])

        const deadlineDate = parseGermanDate(deadlineRaw)
        const days   = daysUntil(deadlineDate)
        const status = computeStatus(days)
        const isGraded = String(gradedRaw || '').toLowerCase().startsWith('j') ||
                         String(gradedRaw || '').toLowerCase() === 'yes' ||
                         String(gradedRaw || '').toLowerCase() === 'true'

        return {
          ...task,
          // Normalisierte Felder (intern, mit Underscore)
          _id: taskId(title, deadlineRaw),
          _title: title,
          _deadline: deadlineRaw,
          _start: startRaw,
          _category: category,
          _description: description,
          _files: filesRaw,
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