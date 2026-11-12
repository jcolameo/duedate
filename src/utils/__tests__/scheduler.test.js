import { describe, it, expect } from 'vitest'
import { generatePlan, getWeekDays, splitIntoSessions, PLANNER_DEFAULTS, PLANNING_HORIZON_DAYS } from '../scheduler.js'

// Fixed "now": Wednesday 11 Nov 2026, 10:00 local time
const NOW = new Date(2026, 10, 11, 10, 0)
const DAY = 86400000

const date = (y, m, d) => new Date(y, m - 1, d)
const daysFromNow = (n) => new Date(2026, 10, 11 + n)

// Minimal enriched task, shaped like the output of useTaskEnrichment
function task(id, deadline, days, extra = {}) {
  return { _id: id, _title: id, _deadlineDate: deadline, _days: days, _isGraded: false, ...extra }
}
/** Task due `n` days from NOW */
const due = (id, n, extra) => task(id, daysFromNow(n), n, extra)

/** Planning stub: { id: { hours | minutes | priority } } -> estimate and remaining time */
function planning(map = {}) {
  return (t) => {
    const p = map[t._id] || {}
    const minutes = p.minutes ?? (p.hours != null ? p.hours * 60 : null)
    return { estimateMin: minutes, remainingMin: p.remaining ?? minutes, priority: p.priority || 'medium' }
  }
}

const of = (plan, id) => plan.sessions.filter(s => s.taskId === id)
const minutes = (s) => s.endMin - s.startMin
const total = (list) => list.reduce((sum, s) => sum + minutes(s), 0)
const dayIndex = (d) => Math.round((d - date(2026, 11, 11)) / DAY)

describe('getWeekDays', () => {
  it('returns Mon–Sun of the current week', () => {
    const days = getWeekDays(NOW)
    expect(days.map(d => d.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(days[0].date).toEqual(new Date(2026, 10, 9))
    expect(days[6].date).toEqual(new Date(2026, 10, 15))
  })

  it('treats Sunday as the last day of the week, not the first', () => {
    const days = getWeekDays(new Date(2026, 10, 15, 12, 0)) // Sunday
    expect(days[0].date).toEqual(new Date(2026, 10, 9))
  })
})

describe('splitIntoSessions', () => {
  it.each([
    [30, [30]], [60, [60]], [90, [90]], [120, [60, 60]], [150, [90, 60]], [180, [90, 90]],
    [210, [90, 90, 30]], [45, [60]], [100, [60, 60]],
  ])('%i min -> %j', (min, parts) => expect(splitIntoSessions(min)).toEqual(parts))

  it('12 h becomes eight sessions of 90 min', () => {
    expect(splitIntoSessions(720)).toEqual(Array(8).fill(90))
  })

  it('nothing to do gives no sessions', () => {
    expect(splitIntoSessions(0)).toEqual([])
  })

  it('never makes a session longer than the limit, and keeps the total (rounded up to 30)', () => {
    for (let m = 30; m <= 1200; m += 30) {
      const parts = splitIntoSessions(m)
      expect(Math.max(...parts)).toBeLessThanOrEqual(90)
      expect(parts.reduce((a, b) => a + b, 0)).toBe(m)
    }
  })
})

describe('big tasks are spread over the weeks (B8 acceptance)', () => {
  const plan = generatePlan([due('Big', 28)], planning({ Big: { hours: 12 } }), [], NOW)
  const sessions = of(plan, 'Big')

  it('12 h becomes eight sessions of 90 min', () => {
    expect(sessions).toHaveLength(8)
    expect(sessions.every(s => minutes(s) === 90)).toBe(true)
    expect(total(sessions)).toBe(720)
  })

  it('the last session is at least one day before the deadline', () => {
    const last = sessions[sessions.length - 1].date
    expect(dayIndex(last)).toBeLessThanOrEqual(28 - 1)
  })

  it('starts early and covers several weeks instead of one block', () => {
    expect(dayIndex(sessions[0].date)).toBe(0)
    const weeks = new Set(sessions.map(s => Math.floor(dayIndex(s.date) / 7)))
    expect(weeks.size).toBeGreaterThanOrEqual(3)
  })

  it('never puts two sessions on one day when there is plenty of room', () => {
    expect(new Set(sessions.map(s => dayIndex(s.date))).size).toBe(8)
  })

  it('spreads evenly: the gaps between sessions differ by at most one day', () => {
    const days = sessions.map(s => dayIndex(s.date))
    const gaps = days.slice(1).map((d, i) => d - days[i])
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThanOrEqual(1)
  })

  it('labels the sessions n of m in chronological order', () => {
    expect(sessions.map(s => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(sessions.every(s => s.of === 8)).toBe(true)
  })

  it('reports no shortfall', () => {
    expect(plan.shortfalls).toEqual([])
  })
})

describe('buffer before the deadline', () => {
  const tasks = () => [due('A', 3)]
  const lastDay = (plan) => Math.max(...plan.sessions.map(s => dayIndex(s.date)))

  it('finishes one day before the deadline by default', () => {
    const plan = generatePlan(tasks(), planning({ A: { hours: 8 } }), [], NOW)
    expect(lastDay(plan)).toBeLessThanOrEqual(2)
  })

  it('the buffer can be set (no buffer: up to the deadline day itself)', () => {
    const none = generatePlan(tasks(), planning({ A: { hours: 8 } }), [], NOW, { bufferDays: 0 })
    const three = generatePlan(tasks(), planning({ A: { hours: 8 } }), [], NOW, { bufferDays: 3 })
    expect(lastDay(none)).toBeLessThanOrEqual(3)
    expect(lastDay(three)).toBe(0) // only today is left
  })

  it('a deadline too close for a buffer still gets planned (today / tomorrow)', () => {
    const today = generatePlan([due('T', 0)], planning({ T: { hours: 1 } }), [], NOW)
    expect(of(today, 'T')).toHaveLength(1)
    const tomorrow = generatePlan([due('M', 1)], planning({ M: { hours: 1 } }), [], NOW)
    expect(dayIndex(of(tomorrow, 'M')[0].date)).toBe(0) // buffer pushes it to today
  })
})

describe('limits per day', () => {
  it('at most 3 h of one task per day, and at most 90 min per session', () => {
    const plan = generatePlan([due('A', 3)], planning({ A: { hours: 12 } }), [], NOW)
    const perDay = {}
    for (const s of plan.sessions) perDay[dayIndex(s.date)] = (perDay[dayIndex(s.date)] || 0) + minutes(s)
    expect(Math.max(...Object.values(perDay))).toBeLessThanOrEqual(180)
    expect(Math.max(...plan.sessions.map(minutes))).toBeLessThanOrEqual(90)
  })

  it('at most 6 h of planned work per day over all tasks', () => {
    const tasks = [due('A', 2), due('B', 2), due('C', 2)]
    const plan = generatePlan(tasks, planning({ A: { hours: 6 }, B: { hours: 6 }, C: { hours: 6 } }), [], NOW)
    const perDay = {}
    for (const s of plan.sessions) perDay[dayIndex(s.date)] = (perDay[dayIndex(s.date)] || 0) + minutes(s)
    expect(Math.max(...Object.values(perDay))).toBeLessThanOrEqual(PLANNER_DEFAULTS.maxPerDayMin)
  })

  it('the daily maximum can be raised', () => {
    const tasks = [due('A', 2), due('B', 2)]
    const p = planning({ A: { hours: 3 }, B: { hours: 3 } })
    const normal = generatePlan(tasks, p, [], NOW)
    const more = generatePlan(tasks, p, [], NOW, { maxPerDayMin: 600 })
    expect(more.sessions.filter(s => dayIndex(s.date) === 0).length).toBeGreaterThanOrEqual(normal.sessions.filter(s => dayIndex(s.date) === 0).length)
  })
})

describe('honest shortfalls', () => {
  it('says how much is missing instead of squeezing it in', () => {
    // 12 h due tomorrow, buffer 1 day: only today is left, at most 3 h of one task per day
    const plan = generatePlan([due('Huge', 1)], planning({ Huge: { hours: 12 } }), [], NOW)
    expect(total(of(plan, 'Huge'))).toBe(180)
    expect(plan.shortfalls).toEqual([expect.objectContaining({
      taskId: 'Huge', missingMin: 540, plannedMin: 180, neededMin: 720, overdue: false, defaultEstimate: false,
    })])
    expect(plan.shortfalls[0].deadline).toEqual(daysFromNow(1))
  })

  it('a day that is completely busy leaves the task unplaced', () => {
    const fullDay = [{ day: 'Wed', startTime: '00:00', endTime: '23:59' }]
    const plan = generatePlan([due('A', 0)], planning({ A: { hours: 1 } }), fullDay, NOW)
    expect(plan.sessions).toEqual([])
    expect(plan.shortfalls[0]).toMatchObject({ taskId: 'A', missingMin: 60, plannedMin: 0 })
  })

  it('marks tasks that were planned with the default estimate', () => {
    const fullDay = [{ day: 'Wed', startTime: '00:00', endTime: '23:59' }]
    const plan = generatePlan([due('A', 0)], planning(), fullDay, NOW)
    expect(plan.shortfalls[0]).toMatchObject({ missingMin: PLANNER_DEFAULTS.defaultEstimateMin, defaultEstimate: true })
  })

  it('a shortened piece is still used when a full session does not fit', () => {
    // only 10:00-11:00 is free today: a 90 min session does not fit, 60 min does
    const busy = [{ day: 'Wed', startTime: '11:00', endTime: '23:59' }]
    const plan = generatePlan([due('A', 1)], planning({ A: { minutes: 90 } }), busy, NOW)
    expect(total(of(plan, 'A'))).toBe(60)
    expect(plan.shortfalls[0]).toMatchObject({ missingMin: 30, plannedMin: 60 })
  })
})

describe('rolling plan', () => {
  it('time already done (checklist, later: tracked time) is deducted', () => {
    const full = generatePlan([due('A', 14)], planning({ A: { hours: 8 } }), [], NOW)
    const half = generatePlan([due('A', 14)], planning({ A: { hours: 8, remaining: 240 } }), [], NOW)
    expect(total(of(full, 'A'))).toBe(480)
    expect(total(of(half, 'A'))).toBe(240)
  })

  it('nothing left to do means nothing to plan', () => {
    const plan = generatePlan([due('A', 14)], planning({ A: { hours: 8, remaining: 0 } }), [], NOW)
    expect(plan.sessions).toEqual([])
    expect(plan.shortfalls).toEqual([])
  })

  it('a later "today" never plans in the past and keeps the same deadline', () => {
    const later = new Date(2026, 10, 18, 9, 0) // one week later
    const plan = generatePlan([due('A', 14)], planning({ A: { hours: 8 } }), [], later)
    expect(plan.sessions.every(s => s.date >= date(2026, 11, 18))).toBe(true)
    expect(Math.max(...plan.sessions.map(s => s.date)) <= date(2026, 11, 24)).toBe(true)
    expect(total(plan.sessions)).toBe(480)
  })

  it('the plan reaches beyond this week and the horizon is reported', () => {
    const plan = generatePlan([due('A', 40)], planning({ A: { hours: 3 } }), [], NOW)
    expect(plan.horizonEnd).toEqual(daysFromNow(39))
    expect(Math.max(...plan.sessions.map(s => dayIndex(s.date)))).toBeGreaterThan(6)
  })

  it('looks ahead at most 26 weeks', () => {
    const plan = generatePlan([due('Far', 400)], planning({ Far: { hours: 4 } }), [], NOW)
    expect(Math.max(...plan.sessions.map(s => dayIndex(s.date)))).toBeLessThanOrEqual(PLANNING_HORIZON_DAYS)
    expect(total(plan.sessions)).toBe(240)
  })
})

describe('order and conflicts', () => {
  it('schedules the more urgent task first', () => {
    const tasks = [due('Later', 3), due('Sooner', 1)]
    const plan = generatePlan(tasks, planning({ Later: { hours: 1 }, Sooner: { hours: 1 } }), [], NOW)
    const first = plan.sessions.reduce((a, b) => (a.date - b.date || a.startMin - b.startMin) <= 0 ? a : b)
    expect(first.taskId).toBe('Sooner')
  })

  it('breaks urgency ties by priority', () => {
    const tasks = [due('Low', 2), due('High', 2)]
    const plan = generatePlan(tasks, planning({ Low: { hours: 1, priority: 'low' }, High: { hours: 1, priority: 'high' } }), [], NOW)
    const first = plan.sessions.reduce((a, b) => (a.date - b.date || a.startMin - b.startMin) <= 0 ? a : b)
    expect(first.taskId).toBe('High')
  })

  it('overdue tasks are placed as early as possible', () => {
    const plan = generatePlan([task('Late', date(2026, 11, 5), -6)], planning({ Late: { hours: 3 } }), [], NOW)
    expect(plan.sessions.length).toBeGreaterThan(0)
    expect(dayIndex(plan.sessions[0].date)).toBe(0)
    expect(plan.shortfalls).toEqual([])
  })

  it('never places a session inside an availability (busy) block', () => {
    const busy = [{ day: 'Wed', startTime: '08:00', endTime: '12:00' }]
    const plan = generatePlan([due('A', 2)], planning({ A: { hours: 1 } }), busy, NOW)
    expect(plan.sessions[0].day).toBe('Wed')
    expect(plan.sessions[0].startMin).toBeGreaterThanOrEqual(12 * 60)
  })

  it('respects a recurring busy block on several days and on later weeks (A6)', () => {
    const job = [{ label: 'Job', days: ['Mon', 'Tue', 'Wed', 'Thu'], startTime: '08:00', endTime: '17:00' }]
    const plan = generatePlan([due('A', 21)], planning({ A: { hours: 12 } }), job, NOW)
    for (const s of plan.sessions.filter(x => ['Mon', 'Tue', 'Wed', 'Thu'].includes(x.day))) {
      expect(s.startMin).toBeGreaterThanOrEqual(17 * 60)
    }
  })

  it('a fully busy target day moves the session to the nearest free day', () => {
    const wholeWeekdays = [{ day: 'Wed', startTime: '00:00', endTime: '23:59' }]
    const plan = generatePlan([due('A', 7)], planning({ A: { hours: 1.5 } }), wholeWeekdays, NOW)
    expect(plan.sessions).toHaveLength(1)
    expect(plan.sessions[0].day).not.toBe('Wed')
    expect(dayIndex(plan.sessions[0].date)).toBeLessThanOrEqual(1) // next free day, not the end of the span
  })

  it('sessions of different tasks never overlap', () => {
    const tasks = [due('A', 4), due('B', 4), due('C', 4)]
    const plan = generatePlan(tasks, planning({ A: { hours: 5 }, B: { hours: 5 }, C: { hours: 5 } }), [], NOW)
    const byDay = {}
    for (const s of plan.sessions) (byDay[dayIndex(s.date)] ||= []).push(s)
    for (const list of Object.values(byDay)) {
      const sorted = [...list].sort((a, b) => a.startMin - b.startMin)
      sorted.slice(1).forEach((s, i) => expect(s.startMin).toBeGreaterThanOrEqual(sorted[i].endMin))
    }
  })

  it('stays inside the working day', () => {
    const plan = generatePlan([due('A', 10)], planning({ A: { hours: 20 } }), [], NOW)
    for (const s of plan.sessions) {
      expect(s.startMin).toBeGreaterThanOrEqual(8 * 60)
      expect(s.endMin).toBeLessThanOrEqual(21 * 60)
    }
  })
})

describe('rules that stayed', () => {
  it('ignores tasks without a deadline and completed tasks (B2)', () => {
    const tasks = [task('NoDate', null, null), due('Done', 2, { status: 'done' }), due('Open', 2)]
    const plan = generatePlan(tasks, planning({ Open: { hours: 1 } }), [], NOW)
    expect(plan.sessions.map(s => s.taskId)).toEqual(['Open'])
    expect(plan.shortfalls).toEqual([])
  })

  it('sessions carry the area of their task (for the calendar colors)', () => {
    const tasks = [due('S', 3, { _area: 'study' }), due('F', 3, { _area: 'freelance' }), due('P', 3, { _area: 'personal' }), due('N', 3)]
    const plan = generatePlan(tasks, planning({ S: { hours: 1 }, F: { hours: 1 }, P: { hours: 1 }, N: { hours: 1 } }), [], NOW)
    const area = (id) => plan.sessions.find(s => s.taskId === id).area
    expect([area('S'), area('F'), area('P'), area('N')]).toEqual(['study', 'freelance', 'personal', 'study'])
  })

  it('plans a task without an estimate with the default (1 h)', () => {
    const plan = generatePlan([due('A', 3)], planning(), [], NOW)
    expect(total(plan.sessions)).toBe(PLANNER_DEFAULTS.defaultEstimateMin)
  })

  it('does not schedule today before the current time, and rounds up to the next half hour', () => {
    const at1007 = new Date(2026, 10, 11, 10, 7)
    const plan = generatePlan([due('A', 2)], planning({ A: { hours: 1 } }), [], at1007)
    expect(plan.sessions[0].startTime).toBe('10:30')
  })

  it('moves to tomorrow when today is already over', () => {
    const lateEvening = new Date(2026, 10, 11, 20, 45)
    const plan = generatePlan([due('A', 4)], planning({ A: { hours: 1 } }), [], lateEvening)
    expect(dayIndex(plan.sessions[0].date)).toBeGreaterThanOrEqual(1)
    expect(plan.sessions[0].startTime).toBe('08:00')
  })

  it('never schedules on days before today', () => {
    const plan = generatePlan([due('A', 4)], planning({ A: { hours: 4 } }), [], NOW)
    expect(plan.sessions.every(s => dayIndex(s.date) >= 0)).toBe(true)
  })

  it('is deterministic: same input, same plan', () => {
    const tasks = [due('A', 10), due('B', 4), due('C', 20)]
    const p = planning({ A: { hours: 8 }, B: { hours: 3 }, C: { hours: 16 } })
    expect(generatePlan(tasks, p, [], NOW)).toEqual(generatePlan(tasks, p, [], NOW))
  })

  it('does not change the input tasks', () => {
    const tasks = [due('A', 10)]
    const copy = JSON.stringify(tasks)
    generatePlan(tasks, planning({ A: { hours: 4 } }), [], NOW)
    expect(JSON.stringify(tasks)).toBe(copy)
  })

  it('always returns the current week for the grid', () => {
    expect(generatePlan([], planning(), [], NOW).days).toEqual(getWeekDays(NOW))
  })
})

describe('generatePlan: working days (B11)', () => {
  const WEEKDAYS_ONLY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  // Wed 11 Nov 2026 + 3 = Sat 14 Nov, +4 = Sun 15 Nov

  it('puts no session on a free weekday', () => {
    const plan = generatePlan([due('a', 20)], planning({ a: { hours: 12 } }), [], NOW, { workDays: WEEKDAYS_ONLY })
    expect(plan.sessions.length).toBeGreaterThan(0)
    for (const s of plan.sessions) expect(['Sat', 'Sun']).not.toContain(s.day)
  })

  it('still uses every day by default', () => {
    const plan = generatePlan([due('a', 20)], planning({ a: { hours: 12 } }), [], NOW)
    expect(plan.sessions.some(s => ['Sat', 'Sun'].includes(s.day))).toBe(true)
  })

  it('moves work from a free deadline day to the days before it', () => {
    // Due Sunday 15 Nov, no buffer: the work lands on Friday or earlier
    const plan = generatePlan([due('a', 4)], planning({ a: { hours: 1 } }), [], NOW, { workDays: WEEKDAYS_ONLY, bufferDays: 0 })
    expect(of(plan, 'a')).toHaveLength(1)
    expect(of(plan, 'a')[0].date.getDay()).not.toBe(0)
    expect(of(plan, 'a')[0].date.getDay()).not.toBe(6)
    expect(plan.shortfalls).toEqual([])
  })

  it('reports a shortfall when no working day is left before the deadline', () => {
    // Due Fri 13 Nov, only Monday is a working day: no day left before the deadline
    const plan = generatePlan([due('a', 2)], planning({ a: { hours: 1 } }), [], NOW, { workDays: ['Mon'], bufferDays: 0 })
    expect(plan.sessions).toHaveLength(0)
    expect(plan.shortfalls).toHaveLength(1)
    expect(plan.shortfalls[0].missingMin).toBe(60)
  })

  it('spreads sessions over the working days only', () => {
    const plan = generatePlan([due('a', 15)], planning({ a: { hours: 6 } }), [], NOW, { workDays: ['Mon', 'Wed'], bufferDays: 0 })
    expect(plan.shortfalls).toEqual([])
    for (const s of plan.sessions) expect(['Mon', 'Wed']).toContain(s.day)
  })
})
