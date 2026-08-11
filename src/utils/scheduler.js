export const WORK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
export const DAY_START_MIN = 8 * 60   // 08:00
export const DAY_END_MIN = 21 * 60    // 21:00

const EFFORT_MINUTES = { '30m': 30, '1h': 60, '2h': 120, '3h+': 180 }
const PRIORITY_RANK = { high: 0, medium: 1, low: 2 }

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toMinutes(hhmm) {
  const [h, m] = String(hhmm || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

function toTimeLabel(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * The current Mon–Sun week as [{label, date}], independent of plan
 * generation — used to render the week's grid structure and deadline
 * markers even before a plan has been generated.
 */
export function getWeekDays(today = new Date()) {
  const todayStart = startOfDay(today)
  const jsDay = todayStart.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay
  const monday = addDays(todayStart, mondayOffset)
  return WORK_DAYS.map((label, i) => ({ label, date: addDays(monday, i) }))
}

/**
 * Finds the first free slot of `durationMin` within the working day,
 * given a list of already-busy [start, end] intervals (minutes from midnight).
 */
function findFreeSlot(durationMin, busyIntervals) {
  const sorted = [...busyIntervals].sort((a, b) => a[0] - b[0])
  let cursor = DAY_START_MIN
  for (const [busyStart, busyEnd] of sorted) {
    if (busyStart - cursor >= durationMin) {
      return [cursor, cursor + durationMin]
    }
    cursor = Math.max(cursor, busyEnd)
  }
  if (DAY_END_MIN - cursor >= durationMin) {
    return [cursor, cursor + durationMin]
  }
  return null
}

/**
 * Deterministic, local-only weekly plan generator. No AI, no network —
 * same inputs always produce the same output. Schedules eligible tasks
 * (valid deadline, sorted by urgency then priority) into the first free
 * slot before their deadline, working around availability blocks and
 * previously-placed sessions.
 *
 * @param {Array} enrichedTasks - from useTaskEnrichment
 * @param {(task) => {effort: string|null, priority: string}} getPlanningFor - from useTaskPlanning
 * @param {Array<{day: string, startTime: string, endTime: string}>} availabilityBlocks - from useAvailability
 * @param {Date} today
 */
export function generatePlan(enrichedTasks, getPlanningFor, availabilityBlocks, today = new Date()) {
  const todayStart = startOfDay(today)
  const days = getWeekDays(today)

  const busyByDay = {}
  for (const day of days) busyByDay[day.label] = []
  for (const block of availabilityBlocks) {
    if (busyByDay[block.day]) {
      busyByDay[block.day].push([toMinutes(block.startTime), toMinutes(block.endTime)])
    }
  }

  const eligible = enrichedTasks
    .filter(t => t._deadlineDate)
    .map(t => ({ task: t, planning: getPlanningFor(t) }))
    .sort((a, b) => {
      const daysA = a.task._days ?? Infinity
      const daysB = b.task._days ?? Infinity
      if (daysA !== daysB) return daysA - daysB
      return PRIORITY_RANK[a.planning.priority] - PRIORITY_RANK[b.planning.priority]
    })

  const sessions = []
  const unscheduled = []

  for (const { task, planning } of eligible) {
    const durationMin = EFFORT_MINUTES[planning.effort] || EFFORT_MINUTES['1h']
    const isOverdue = task._days !== null && task._days < 0
    let placed = false

    for (const day of days) {
      if (day.date < todayStart) continue
      if (!isOverdue && day.date > startOfDay(task._deadlineDate)) break

      const slot = findFreeSlot(durationMin, busyByDay[day.label])
      if (slot) {
        sessions.push({
          taskId: task._id,
          title: task._title || 'Aufgabe',
          day: day.label,
          startMin: slot[0],
          endMin: slot[1],
          startTime: toTimeLabel(slot[0]),
          endTime: toTimeLabel(slot[1]),
          date: day.date,
        })
        busyByDay[day.label].push(slot)
        placed = true
        break
      }
    }

    if (!placed) {
      unscheduled.push({
        taskId: task._id,
        title: task._title || 'Aufgabe',
        reason: planning.effort ? 'no free slot before deadline' : 'no free slot before deadline (using 1h default estimate)',
      })
    }
  }

  return { days, sessions, unscheduled }
}
