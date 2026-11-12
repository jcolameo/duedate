import { useTasks } from './useTasks.js'
import { useToast } from './useToast.js'
import { useLocale } from './useLocale.js'
import { checklistFieldOf, checklistProgress, toggleChecklistItem } from '../utils/checklist.js'

/**
 * User actions on tasks that need feedback (toast + undo), shared by all
 * views so completing a task feels the same everywhere.
 */
export function useTaskActions() {
  const { setStatus, updateTask, getTask } = useTasks()
  const toast = useToast()
  const { t } = useLocale()

  function complete(task) {
    const id = task.id ?? task._id
    setStatus(id, 'done')
    toast.show(t('tasks.completed', { title: task.title || task._title || t('common.untitled') }), {
      tone: 'success',
      action: { label: t('ui.undo'), onClick: () => setStatus(id, 'open') },
    })
  }

  function reopen(task) {
    setStatus(task.id ?? task._id, 'open')
  }

  function toggleDone(task) {
    if (task.status === 'done') reopen(task)
    else complete(task)
  }

  /**
   * After the last step was checked: offer (never force) to complete the task.
   * `markdown` is the text after the change.
   */
  function offerComplete(task, markdown) {
    const progress = checklistProgress(markdown)
    if (!progress?.complete || task.status === 'done') return
    toast.show(t('checklist.allDone', { title: task.title || task._title || t('common.untitled') }), {
      tone: 'success',
      duration: 10000,
      action: { label: t('checklist.completeTask'), onClick: () => complete(task) },
    })
  }

  /** Checks or unchecks one step of a task's checklist (from outside the editor). */
  function toggleStep(task, index) {
    const current = getTask(task.id ?? task._id)
    if (!current) return
    const field = checklistFieldOf(current)
    const next = toggleChecklistItem(current[field], index)
    updateTask(current.id, { [field]: next })
    offerComplete(current, next)
  }

  /** Moves a task to another area; undo restores the previous one. */
  function changeArea(task, area) {
    const id = task.id ?? task._id
    const previous = task.area
    if (area === previous) return
    updateTask(id, { area })
    toast.show(t('areas.changed', { title: task.title || task._title || t('common.untitled'), area: t('areas.' + area) }), {
      action: { label: t('ui.undo'), onClick: () => updateTask(id, { area: previous }) },
    })
  }

  return { complete, reopen, toggleDone, changeArea, toggleStep, offerComplete }
}
