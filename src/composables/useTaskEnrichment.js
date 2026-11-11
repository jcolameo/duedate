import { computed } from 'vue'
import { useTasks } from './useTasks.js'
import { useLocale } from './useLocale.js'
import { enrichTask, compareByDue } from '../utils/taskModel.js'

/**
 * Tasks from the store with derived fields (_days, _status, …) for views,
 * scheduler and exports, sorted by due date.
 *
 * `_status.code` is locale-independent (use it in logic); `_status.label`
 * is translated display text — never compare against it. Visual styling
 * lives in components/ui/DueBadge.vue.
 */
const { tasks } = useTasks()

export function useTaskEnrichment() {
  const { t } = useLocale()

  const enrichedTasks = computed(() =>
    tasks.value
      .map(enrichTask)
      .map(task => ({ ...task, _status: { code: task._statusCode, label: t('status.' + task._statusCode) } }))
      .sort(compareByDue),
  )

  // Most views only care about what is still to do
  const openTasks = computed(() => enrichedTasks.value.filter(task => !task._isDone))
  const doneTasks = computed(() =>
    enrichedTasks.value
      .filter(task => task._isDone)
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))),
  )
  // Calendar export only includes open tasks with a valid date
  const exportableCount = computed(() => openTasks.value.filter(task => task._deadlineDate).length)

  return { enrichedTasks, openTasks, doneTasks, exportableCount }
}
