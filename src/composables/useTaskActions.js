/**
 * useTaskActions: the task actions that need feedback for the user:
 * complete, reopen, tick a checklist step, change the area. Each one shows a
 * toast, most with an undo button.
 *
 * Called by: src/views/HomeView.vue:45, src/views/DeadlinesView.vue:45,
 * src/components/TaskDetail.vue:38.
 *
 * In: nothing. Out: `{ complete, reopen, toggleDone, changeArea, toggleStep,
 * offerComplete }`. Every action takes a task object. It may be a raw task
 * from useTasks.js (`id`, `title`) or an enriched one from
 * useTaskEnrichment.js (`_id`, `_title`); hence the `task.id ?? task._id`
 * pattern below.
 *
 * In the background: no storage of its own. Changes go through useTasks.js,
 * which saves them.
 *
 * Not module level: no state, only functions on the shared stores. That is
 * why completing a task feels the same in every view.
 *
 * How to read this file: `complete` first, then `offerComplete` and
 * `toggleStep`, which work together: ticking the last step offers to complete
 * the task.
 */
import { useTasks } from './useTasks.js'
import { useToast } from './useToast.js'
import { useLocale } from './useLocale.js'
import { checklistFieldOf, checklistProgress, toggleChecklistItem } from '../utils/checklist.js'

/**
 * User actions on tasks that need feedback (toast + undo), shared by all
 * views so completing a task feels the same everywhere.
 *
 * Composable: a plain function that returns reactive state (here only
 * actions). Vue has no special syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ complete: Function, reopen: Function, toggleDone: Function,
 *   changeArea: Function, toggleStep: Function, offerComplete: Function }}
 */
export function useTaskActions() {
  const { setStatus, updateTask, getTask } = useTasks()
  const toast = useToast()
  const { t } = useLocale()

  /**
   * Marks a task done and offers undo.
   *
   * @param {object} task raw or enriched task
   * @sideeffect sets the status in the store, shows a toast
   */
  function complete(task) {
    // `??` takes the right side only if the left is null or undefined.
    const id = task.id ?? task._id
    setStatus(id, 'done')
    toast.show(t('tasks.completed', { title: task.title || task._title || t('common.untitled') }), {
      tone: 'success',
      action: { label: t('ui.undo'), onClick: () => setStatus(id, 'open') },
    })
  }

  /**
   * Marks a task open again (no toast).
   *
   * @param {object} task raw or enriched task
   * @sideeffect sets the status in the store
   */
  function reopen(task) {
    setStatus(task.id ?? task._id, 'open')
  }

  /**
   * The checkbox next to a task: done -> open, open -> done.
   *
   * @param {object} task raw or enriched task
   */
  function toggleDone(task) {
    if (task.status === 'done') reopen(task)
    else complete(task)
  }

  /**
   * After the last step was checked: offer (never force) to complete the task.
   * `markdown` is the text after the change.
   *
   * @param {object} task the task the checklist belongs to
   * @param {string} markdown the checklist text after the change
   * @sideeffect may show a toast
   */
  function offerComplete(task, markdown) {
    const progress = checklistProgress(markdown)
    // No checklist, steps still open, or the task is already done: no offer.
    if (!progress?.complete || task.status === 'done') return
    toast.show(t('checklist.allDone', { title: task.title || task._title || t('common.untitled') }), {
      tone: 'success',
      duration: 10000,
      action: { label: t('checklist.completeTask'), onClick: () => complete(task) },
    })
  }

  /**
   * Checks or unchecks one step of a task's checklist (from outside the editor).
   *
   * @param {object} task raw or enriched task
   * @param {number} index position of the step in the checklist
   * @sideeffect updates the task in the store, may show a toast
   */
  function toggleStep(task, index) {
    // Read the task fresh from the store, because the passed object may be an
    // enriched copy that is already out of date.
    const current = getTask(task.id ?? task._id)
    if (!current) return
    // The checklist lives in the description or in the notes field, depending
    // on the task; checklistFieldOf tells which one.
    const field = checklistFieldOf(current)
    const next = toggleChecklistItem(current[field], index)
    // `[field]` as a key means: use the value of `field` as the property name.
    updateTask(current.id, { [field]: next })
    offerComplete(current, next)
  }

  /**
   * Moves a task to another area; undo restores the previous one.
   *
   * @param {object} task raw or enriched task
   * @param {string} area the new area code
   * @sideeffect updates the task in the store, shows a toast
   */
  function changeArea(task, area) {
    const id = task.id ?? task._id
    const previous = task.area
    // The same area was chosen again: no change, no toast.
    if (area === previous) return
    updateTask(id, { area })
    toast.show(t('areas.changed', { title: task.title || task._title || t('common.untitled'), area: t('areas.' + area) }), {
      action: { label: t('ui.undo'), onClick: () => updateTask(id, { area: previous }) },
    })
  }

  return { complete, reopen, toggleDone, changeArea, toggleStep, offerComplete }
}
