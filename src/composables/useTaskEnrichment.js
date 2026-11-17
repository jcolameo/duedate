/**
 * useTaskEnrichment: takes the stored tasks and adds computed fields that the
 * views need, such as days left (`_days`), a status with a translated label
 * (`_status`) and a parsed deadline (`_deadlineDate`). Sorted by due date.
 * The leading underscore marks "derived, not stored".
 *
 * Called by: src/views/HomeView.vue:38, src/views/DeadlinesView.vue:44,
 * src/views/StundenplanView.vue:30, and inside this folder by usePlanState.js
 * (whose `enrichedTasks` CalendarView.vue:37 uses).
 *
 * In: nothing. Out: `{ enrichedTasks, openTasks, doneTasks, exportableCount }`,
 * all computed values that update by themselves when a task changes.
 *
 * In the background: nothing is stored; it only reads useTasks.js and the
 * language from useLocale.js.
 *
 * Half module level: `tasks` is taken once at import (the shared store), but
 * the computed values are created per call, so each view gets its own cached
 * copy of the same derived list.
 *
 * How to read this file: `enrichedTasks` is the base; the three below are
 * filters of it. The actual field logic is `enrichTask` in
 * src/utils/taskModel.js.
 */
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

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ enrichedTasks: import('vue').ComputedRef<object[]>, openTasks: import('vue').ComputedRef<object[]>,
 *   doneTasks: import('vue').ComputedRef<object[]>, exportableCount: import('vue').ComputedRef<number> }}
 */
export function useTaskEnrichment() {
  const { t } = useLocale()

  // `computed` is like a getter that React would recompute in `render`, but
  // Vue caches it until a dependency changes: here the tasks or the language
  // (t() reads the locale). map() creates a new array, so sort() does not
  // reorder the store itself.
  const enrichedTasks = computed(() =>
    tasks.value
      .map(enrichTask)
      .map(task => ({ ...task, _status: { code: task._statusCode, label: t('status.' + task._statusCode) } }))
      .sort(compareByDue),
  )

  // Most views only care about what is still to do
  const openTasks = computed(() => enrichedTasks.value.filter(task => !task._isDone))
  // Newest completion first. ISO dates sort correctly as strings.
  // HINWEIS: A done task without `completedAt` becomes the string
  // "undefined", which sorts before every date and lands at the top.
  const doneTasks = computed(() =>
    enrichedTasks.value
      .filter(task => task._isDone)
      .sort((a, b) => String(b.completedAt).localeCompare(String(a.completedAt))),
  )
  // Calendar export only includes open tasks with a valid date
  const exportableCount = computed(() => openTasks.value.filter(task => task._deadlineDate).length)

  return { enrichedTasks, openTasks, doneTasks, exportableCount }
}
