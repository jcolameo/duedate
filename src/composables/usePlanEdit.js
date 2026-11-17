/**
 * usePlanEdit: lets the user change the generated plan by hand. Dragging a
 * work session to another time "pins" it there; un-pinning gives the slot
 * back to the automatic planner. Every change shows a toast with undo.
 *
 * Called by: src/views/CalendarView.vue:38 (drag in the week grid, "release
 * all"), src/views/StundenplanView.vue:35, src/components/TaskDetail.vue:65
 * (move or un-pin from the task panel).
 *
 * In: nothing. Out: `{ moveSession, unpinSession, unpinAll, pinnedAhead }`.
 * A pin is `{ id, date: 'YYYY-MM-DD', startMin, endMin }` (minutes since
 * midnight) and is stored in the task's `pinned` array.
 *
 * In the background: no storage of its own. Pins are written through
 * `updateTask` into useTasks.js, which saves them; that change also makes
 * usePlanState.js re-plan, so the calendar updates by itself.
 *
 * Not module level: everything here works on shared stores (tasks, plan,
 * busy blocks, settings), so per-call state is not needed.
 *
 * How to read this file: `moveSession` first (check the slot, then pin),
 * then `setPins`, the shared "save + toast + undo" helper. `unpinAll` and
 * `pinnedAhead` belong to the "release all pins" button. `hhmm` is at the
 * very bottom.
 */
import { computed } from 'vue'
import { useTasks } from './useTasks.js'
import { usePlanState } from './usePlanState.js'
import { useAvailability } from './useAvailability.js'
import { usePlannerSettings } from './usePlannerSettings.js'
import { useToast } from './useToast.js'
import { useLocale } from './useLocale.js'
import { fromISODate } from '../utils/taskModel.js'
import { pinsOf, withPin, withoutPin, snapMinutes, newPinId, dateToISO } from '../utils/pins.js'
import { checkSlot } from '../utils/slotCheck.js'

/**
 * Editing the plan by hand (B12): moving a work session pins it to the new
 * slot (stored on the task), un-pinning hands it back to the planner. Both
 * show a toast with "Rückgängig".
 *
 * moveSession resolves with { ok, pinId? }; a rejected move (past, outside the
 * day) explains why and changes nothing. A move into a conflict (busy time,
 * after the deadline, …) is allowed but the toast says so.
 *
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ moveSession: Function, unpinSession: Function, unpinAll: Function,
 *   pinnedAhead: import('vue').ComputedRef<number> }}
 */
export function usePlanEdit() {
  const { tasks, getTask, updateTask } = useTasks()
  const { plan } = usePlanState()
  const { blocks } = useAvailability()
  const { plannerOptions } = usePlannerSettings()
  const toast = useToast()
  const { t, locale } = useLocale()

  // Returns a test function "is session s the same as session a?". The slot
  // check uses it to ignore the session that is being moved, so it does not
  // collide with itself. A pinned session is identified by its pin id, an
  // automatic one by task id plus its running number `n`.
  const sameSession = (a) => (s) => s.taskId === a.taskId && (a.pinId ? s.pinId === a.pinId : !s.pinned && s.n === a.n)

  /**
   * Saves a new pin list on the task and shows a toast whose undo restores
   * the old list.
   *
   * @param {object} task the task from the store
   * @param {object[]} pins the new pin list
   * @param {string} message toast text
   * @param {'neutral'|'success'|'error'} [tone='neutral'] toast colour
   * @sideeffect updates the task, shows a toast
   */
  function setPins(task, pins, message, tone = 'neutral') {
    // Taken before the update, so undo can put back exactly this list.
    const before = task.pinned || []
    updateTask(task.id, { pinned: pins })
    toast.show(message, {
      tone,
      duration: 8000,
      action: { label: t('ui.undo'), onClick: () => updateTask(task.id, { pinned: before }) },
    })
  }

  /**
   * Moves a work session to a new day and start time and pins it there.
   *
   * @param {{ taskId: string, date: Date, startMin: number, endMin: number, pinId?: string }} session
   *   the session that was dragged
   * @param {Date} date target day
   * @param {number} startMin target start in minutes since midnight (snapped to the grid)
   * @returns {{ ok: boolean, pinId?: string }} ok is false if nothing changed
   * @sideeffect updates the task's pins, shows a toast
   */
  function moveSession(session, date, startMin) {
    const task = getTask(session.taskId)
    // The task was deleted in the meantime (e.g. in another view).
    if (!task) return { ok: false }
    const length = session.endMin - session.startMin
    const start = snapMinutes(startMin)
    const end = start + length
    // Dropped on the exact same spot: no pin, no toast.
    if (dateToISO(date) === dateToISO(session.date) && start === session.startMin) return { ok: false }

    // `reject` is a hard no (past, outside the planning day), `warnings` are
    // soft conflicts the user may accept (busy time, after the deadline, …).
    const { reject, warnings } = checkSlot(
      { date, startMin: start, endMin: end },
      {
        deadline: fromISODate(task.due),
        blocks: blocks.value,
        sessions: plan.value?.sessions || [],
        ignore: sameSession(session),
        maxPerDayMin: plannerOptions.value.maxPerDayMin,
      },
    )
    if (reject) {
      toast.show(t('planEdit.reject_' + reject), { tone: 'error' })
      return { ok: false }
    }

    // Moving an already pinned session keeps its id, so the pin is replaced
    // instead of duplicated.
    const pinId = session.pinId || newPinId()
    const pin = { id: pinId, date: dateToISO(date), startMin: start, endMin: end }
    // e.g. "Mi, 11.11. · 14:00–15:30" (German) or "Wed 11/11 · 14:00–15:30" (English)
    const when = `${date.toLocaleDateString(locale.value === 'de' ? 'de-CH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'numeric' })} · ${hhmm(start)}–${hhmm(end)}`
    const warn = warnings.map(w => t('planEdit.warn_' + w)).join(' ')
    // With a warning the toast uses the error tone, which also keeps it on
    // screen until the user closes it (see useToast.js).
    setPins(task, withPin(pinsOf(task), pin), `${t('planEdit.moved', { when })}${warn ? ' ' + warn : ''}`, warn ? 'error' : 'success')
    return { ok: true, pinId }
  }

  /**
   * Removes one pin, so the planner may place this session freely again.
   *
   * @param {{ taskId: string, pinId?: string }} session the pinned session
   * @returns {{ ok: boolean }} false if the task is gone or the session was not pinned
   * @sideeffect updates the task's pins, shows a toast
   */
  function unpinSession(session) {
    const task = getTask(session.taskId)
    // An automatic session has no pinId, so there is nothing to release.
    if (!task || !session.pinId) return { ok: false }
    setPins(task, withoutPin(pinsOf(task), session.pinId), t('planEdit.unpinned'))
    return { ok: true }
  }

  /**
   * Releases every pinned work time that is still ahead; one undo restores all.
   * Pins in the past stay, they document what was done.
   *
   * @returns {{ ok: boolean, count: number }} how many pins were released
   * @sideeffect updates several tasks, shows one toast
   */
  function unpinAll() {
    const now = new Date()
    // ISO dates ('2026-11-17') compare correctly as plain strings.
    const today = dateToISO(now)
    // Snapshot of every affected task's pin list, taken before any change;
    // the undo button restores exactly these lists.
    // HINWEIS: Done tasks are included here, but `pinnedAhead` below skips
    // them, so the toast count can be higher than the number on the button.
    const before = tasks.value.filter(task => pinsOf(task).some(p => p.date >= today)).map(task => ({ id: task.id, pinned: task.pinned }))
    if (before.length === 0) return { ok: false, count: 0 }
    let count = 0
    for (const { id } of before) {
      const task = getTask(id)
      const keep = pinsOf(task).filter(p => p.date < today)
      count += pinsOf(task).length - keep.length
      updateTask(id, { pinned: keep })
    }
    toast.show(t('planEdit.unpinnedAll', { count }), {
      duration: 8000,
      action: { label: t('ui.undo'), onClick: () => before.forEach(({ id, pinned }) => updateTask(id, { pinned })) },
    })
    return { ok: true, count }
  }

  // `computed` is like a getter that React would recompute in `render`, but
  // Vue caches it until a dependency (here `tasks`) changes.
  // HINWEIS: `today` is taken inside the computed but is not reactive; past
  // midnight the count stays stale until a task changes.
  /** How many pinned work times are still ahead (for enabling the button). */
  const pinnedAhead = computed(() => {
    const today = dateToISO(new Date())
    // Sum over all open tasks of their pins from today on; done tasks count 0.
    return tasks.value.reduce((sum, task) => sum + (task.status === 'done' ? 0 : pinsOf(task).filter(p => p.date >= today).length), 0)
  })

  return { moveSession, unpinSession, unpinAll, pinnedAhead }
}

/**
 * Minutes since midnight as "HH:MM", e.g. 870 -> "14:30".
 * Defined after the composable; that works because it is only called later,
 * from inside moveSession.
 *
 * @param {number} min minutes since midnight
 * @returns {string} time with leading zeros
 */
const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
