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
 */
export function usePlanEdit() {
  const { getTask, updateTask } = useTasks()
  const { plan } = usePlanState()
  const { blocks } = useAvailability()
  const { plannerOptions } = usePlannerSettings()
  const toast = useToast()
  const { t, locale } = useLocale()

  const sameSession = (a) => (s) => s.taskId === a.taskId && (a.pinId ? s.pinId === a.pinId : !s.pinned && s.n === a.n)

  function setPins(task, pins, message, tone = 'neutral') {
    const before = task.pinned || []
    updateTask(task.id, { pinned: pins })
    toast.show(message, {
      tone,
      duration: 8000,
      action: { label: t('ui.undo'), onClick: () => updateTask(task.id, { pinned: before }) },
    })
  }

  function moveSession(session, date, startMin) {
    const task = getTask(session.taskId)
    if (!task) return { ok: false }
    const length = session.endMin - session.startMin
    const start = snapMinutes(startMin)
    const end = start + length
    if (dateToISO(date) === dateToISO(session.date) && start === session.startMin) return { ok: false }

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

    const pinId = session.pinId || newPinId()
    const pin = { id: pinId, date: dateToISO(date), startMin: start, endMin: end }
    const when = `${date.toLocaleDateString(locale.value === 'de' ? 'de-CH' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'numeric' })} · ${hhmm(start)}–${hhmm(end)}`
    const warn = warnings.map(w => t('planEdit.warn_' + w)).join(' ')
    setPins(task, withPin(pinsOf(task), pin), `${t('planEdit.moved', { when })}${warn ? ' ' + warn : ''}`, warn ? 'error' : 'success')
    return { ok: true, pinId }
  }

  function unpinSession(session) {
    const task = getTask(session.taskId)
    if (!task || !session.pinId) return { ok: false }
    setPins(task, withoutPin(pinsOf(task), session.pinId), t('planEdit.unpinned'))
    return { ok: true }
  }

  return { moveSession, unpinSession }
}

const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
