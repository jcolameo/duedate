import { describe, it, expect } from 'vitest'
import { generatePlan, getWeekDays } from '../scheduler.js'

// Fixed "now": Wednesday 11 Nov 2026, 10:00 local time
const NOW = new Date(2026, 10, 11, 10, 0)

// Minimal enriched task, shaped like the output of useTaskEnrichment
function task(id, deadline, days, extra = {}) {
  return { _id: id, _title: id, _deadlineDate: deadline, _days: days, _isGraded: false, ...extra }
}

function planning(map = {}) {
  return (t) => ({ effort: null, priority: 'medium', ...map[t._id] })
}

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

describe('generatePlan', () => {
  it('schedules a task with default 1h effort on today', () => {
    const plan = generatePlan([task('A', new Date(2026, 10, 13), 2)], planning(), [], NOW)
    expect(plan.sessions).toHaveLength(1)
    expect(plan.sessions[0]).toMatchObject({ taskId: 'A', day: 'Wed', endMin: plan.sessions[0].startMin + 60 })
    expect(plan.unscheduled).toEqual([])
  })

  it('uses the stored effort estimate', () => {
    const plan = generatePlan([task('A', new Date(2026, 10, 13), 2)], planning({ A: { effort: '2h' } }), [], NOW)
    expect(plan.sessions[0].endMin - plan.sessions[0].startMin).toBe(120)
  })

  it('never places a session inside an availability (busy) block', () => {
    const busy = [{ day: 'Wed', startTime: '08:00', endTime: '12:00' }]
    const plan = generatePlan([task('A', new Date(2026, 10, 13), 2)], planning(), busy, NOW)
    expect(plan.sessions[0].day).toBe('Wed')
    expect(plan.sessions[0].startMin).toBeGreaterThanOrEqual(12 * 60)
  })

  it('schedules the more urgent task first', () => {
    const tasks = [task('Later', new Date(2026, 10, 14), 3), task('Sooner', new Date(2026, 10, 12), 1)]
    const plan = generatePlan(tasks, planning(), [], NOW)
    const first = plan.sessions.reduce((a, b) => (a.startMin <= b.startMin ? a : b))
    expect(first.taskId).toBe('Sooner')
  })

  it('breaks urgency ties by priority', () => {
    const d = new Date(2026, 10, 13)
    const tasks = [task('Low', d, 2), task('High', d, 2)]
    const plan = generatePlan(tasks, planning({ Low: { priority: 'low' }, High: { priority: 'high' } }), [], NOW)
    const first = plan.sessions.reduce((a, b) => (a.startMin <= b.startMin ? a : b))
    expect(first.taskId).toBe('High')
  })

  it('still schedules overdue tasks', () => {
    const plan = generatePlan([task('Late', new Date(2026, 10, 5), -6)], planning(), [], NOW)
    expect(plan.sessions).toHaveLength(1)
  })

  it('ignores tasks without a deadline', () => {
    const plan = generatePlan([task('NoDate', null, null)], planning(), [], NOW)
    expect(plan.sessions).toEqual([])
    expect(plan.unscheduled).toEqual([])
  })

  it('never schedules on days before today', () => {
    const plan = generatePlan([task('A', new Date(2026, 10, 15), 4)], planning(), [], NOW)
    expect(['Mon', 'Tue']).not.toContain(plan.sessions[0].day)
  })

  it('reports a task as unscheduled with a reason code when it cannot fit', () => {
    const fullDay = [{ day: 'Wed', startTime: '00:00', endTime: '23:59' }]
    const plan = generatePlan([task('A', new Date(2026, 10, 11), 0)], planning(), fullDay, NOW)
    expect(plan.sessions).toEqual([])
    expect(plan.unscheduled).toEqual([{ taskId: 'A', title: 'A', reason: 'noFreeSlotDefaultEffort' }])
  })

  it('is deterministic: same input, same plan', () => {
    const tasks = [task('A', new Date(2026, 10, 13), 2), task('B', new Date(2026, 10, 12), 1)]
    expect(generatePlan(tasks, planning(), [], NOW)).toEqual(generatePlan(tasks, planning(), [], NOW))
  })

  // --- Added in roadmap step A4 ---

  it('does not schedule today before the current time', () => {
    const plan = generatePlan([task('A', new Date(2026, 10, 13), 2)], planning(), [], NOW)
    expect(plan.sessions[0].startMin).toBeGreaterThanOrEqual(10 * 60)
  })

  it('does not pull far-away deadlines (> 14 days) into this week', () => {
    const plan = generatePlan([task('Far', new Date(2027, 0, 20), 70)], planning(), [], NOW)
    expect(plan.sessions).toEqual([])
  })

  it('rounds the current time up to the next half hour', () => {
    const at1007 = new Date(2026, 10, 11, 10, 7)
    const plan = generatePlan([task('A', new Date(2026, 10, 13), 2)], planning(), [], at1007)
    expect(plan.sessions[0].startTime).toBe('10:30')
  })

  it('moves to tomorrow when today is already over', () => {
    const lateEvening = new Date(2026, 10, 11, 20, 45)
    const plan = generatePlan([task('A', new Date(2026, 10, 13), 2)], planning(), [], lateEvening)
    expect(plan.sessions[0]).toMatchObject({ day: 'Thu', startTime: '08:00' })
  })

  it('still includes a deadline exactly at the horizon (14 days)', () => {
    const plan = generatePlan([task('Edge', new Date(2026, 10, 25), 14)], planning(), [], NOW)
    expect(plan.sessions).toHaveLength(1)
  })

  it('respects a busy block on several days (A6)', () => {
    const job = [{ label: 'Job', days: ['Wed', 'Thu'], startTime: '08:00', endTime: '17:00' }]
    const tasks = [task('A', new Date(2026, 10, 13), 2), task('B', new Date(2026, 10, 13), 2)]
    const plan = generatePlan(tasks, planning(), job, NOW)
    for (const s of plan.sessions.filter(x => ['Wed', 'Thu'].includes(x.day))) {
      expect(s.startMin).toBeGreaterThanOrEqual(17 * 60)
    }
  })

  it('never plans completed tasks (B2)', () => {
    const tasks = [task('Done', new Date(2026, 10, 13), 2, { status: 'done' }), task('Open', new Date(2026, 10, 13), 2)]
    const plan = generatePlan(tasks, planning(), [], NOW)
    expect(plan.sessions.map(s => s.taskId)).toEqual(['Open'])
    expect(plan.unscheduled).toEqual([])
  })
})

