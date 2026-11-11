import { useTasks } from './useTasks.js'
import { useToast } from './useToast.js'
import { useLocale } from './useLocale.js'

/**
 * User actions on tasks that need feedback (toast + undo), shared by all
 * views so completing a task feels the same everywhere.
 */
export function useTaskActions() {
  const { setStatus } = useTasks()
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

  return { complete, reopen, toggleDone }
}
