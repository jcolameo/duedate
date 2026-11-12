import { describe, it, expect } from 'vitest'
import { taskProgress, plannedSessions, taskTimeline } from '../taskProgress.js'

const task = (extra = {}) => ({ status: 'open', source: 'manual', description: '', notes: '', estimateMin: null, ...extra })

describe('taskProgress', () => {
  it('progress is the share of checked steps', () => {
    const p = taskProgress(task({ description: '- [x] a\n- [x] b\n- [ ] c\n- [ ] d' }))
    expect(p).toMatchObject({ percent: 50, steps: { done: 2, total: 4 }, isDone: false })
  })

  it('without steps there is nothing to measure: 0 %', () => {
    expect(taskProgress(task())).toMatchObject({ percent: 0, steps: null, estimateMin: null, remainingMin: null, doneMin: null })
  })

  it('a finished task is 100 % whatever its boxes say', () => {
    const p = taskProgress(task({ status: 'done', description: '- [x] a\n- [ ] b', estimateMin: 240 }))
    expect(p).toMatchObject({ percent: 100, remainingMin: 0, doneMin: 240, isDone: true })
  })

  it('the estimate splits into time done and time left by the steps', () => {
    const p = taskProgress(task({ estimateMin: 480, description: '- [x] a\n- [ ] b\n- [ ] c\n- [ ] d' }))
    expect(p).toMatchObject({ percent: 25, estimateMin: 480, remainingMin: 360, doneMin: 120 })
  })

  it('an estimate without steps: nothing done yet', () => {
    expect(taskProgress(task({ estimateMin: 120 }))).toMatchObject({ remainingMin: 120, doneMin: 0 })
  })

  it('steps of BBNet tasks come from the own notes', () => {
    expect(taskProgress(task({ source: 'csv', description: '- [x] BBNet text', notes: '- [x] a\n- [ ] b' })).steps).toEqual({ done: 1, total: 2 })
  })
})

describe('plannedSessions', () => {
  const s = (taskId, day, start = 600) => ({ taskId, date: new Date(2026, 10, day), startMin: start, endMin: start + 90 })
  const plan = { sessions: [s('a', 9), s('b', 10), s('a', 12), s('a', 20), s('b', 21)] }
  const today = new Date(2026, 10, 12, 15, 0)

  it('only the sessions of that task, with total time and range', () => {
    const r = plannedSessions(plan, 'a', today)
    expect(r.sessions).toHaveLength(3)
    expect(r.minutes).toBe(270)
    expect(r.first).toEqual(new Date(2026, 10, 9))
    expect(r.last).toEqual(new Date(2026, 10, 20))
  })

  it('upcoming starts today (not only after now)', () => {
    expect(plannedSessions(plan, 'a', today).upcoming.map(x => x.date.getDate())).toEqual([12, 20])
  })

  it('no plan or unknown task gives nothing', () => {
    expect(plannedSessions(null, 'a', today)).toMatchObject({ sessions: [], upcoming: [], minutes: 0, first: null, last: null })
    expect(plannedSessions(plan, 'zzz', today).sessions).toEqual([])
  })
})

describe('taskTimeline', () => {
  it('reads the dates, completion only for finished tasks', () => {
    const t = taskTimeline({ status: 'done', createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-05T10:00:00Z', completedAt: '2026-11-05T10:00:00Z' })
    expect(t.created).toEqual(new Date('2026-11-01T10:00:00Z'))
    expect(t.completed).toEqual(new Date('2026-11-05T10:00:00Z'))
    expect(taskTimeline({ status: 'open', completedAt: '2026-11-05T10:00:00Z' }).completed).toBeNull()
  })

  it('unusable dates become null', () => {
    expect(taskTimeline({ status: 'open', createdAt: 'x', updatedAt: null })).toEqual({ created: null, updated: null, completed: null })
  })
})
