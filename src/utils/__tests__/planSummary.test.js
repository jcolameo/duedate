import { describe, it, expect } from 'vitest'
import { sessionsInWeek, summarizePlan, summarizeByTask, shortDate, daysBetween } from '../planSummary.js'
import { getWeekDays } from '../scheduler.js'
import { normalizeSettings } from '../../composables/usePlannerSettings.js'

const s = (taskId, y, m, d, start, end) => ({ taskId, date: new Date(y, m - 1, d), startMin: start, endMin: end })
const plan = {
  sessions: [
    s('A', 2026, 11, 9, 600, 690),   // Mon of week 46
    s('A', 2026, 11, 15, 600, 660),  // Sun of week 46
    s('A', 2026, 11, 16, 600, 690),  // Mon of week 47
    s('B', 2026, 11, 20, 480, 540),
  ],
}

describe('sessionsInWeek', () => {
  it('keeps only the sessions of that week (Monday to Sunday)', () => {
    const week46 = getWeekDays(new Date(2026, 10, 11))
    expect(sessionsInWeek(plan.sessions, week46).map(x => x.date.getDate())).toEqual([9, 15])
    const week47 = getWeekDays(new Date(2026, 10, 18))
    expect(sessionsInWeek(plan.sessions, week47).map(x => x.date.getDate())).toEqual([16, 20])
  })

  it('a week without sessions is empty', () => {
    expect(sessionsInWeek(plan.sessions, getWeekDays(new Date(2027, 0, 5)))).toEqual([])
  })
})

describe('summaries', () => {
  it('totals', () => {
    expect(summarizePlan(plan)).toMatchObject({ sessions: 4, minutes: 90 + 60 + 90 + 60, tasks: 2 })
    expect(summarizePlan(plan).first).toEqual(new Date(2026, 10, 9))
    expect(summarizePlan(plan).last).toEqual(new Date(2026, 10, 20))
  })

  it('no plan, no numbers', () => {
    expect(summarizePlan(null)).toEqual({ sessions: 0, minutes: 0, tasks: 0, first: null, last: null })
  })

  it('per task', () => {
    const map = summarizeByTask(plan)
    expect(map.get('A')).toEqual({ count: 3, minutes: 240, first: new Date(2026, 10, 9), last: new Date(2026, 10, 16) })
    expect(map.get('B')).toMatchObject({ count: 1, minutes: 60 })
    expect(summarizeByTask(null).size).toBe(0)
  })

  it('short dates and day differences', () => {
    expect(shortDate(new Date(2026, 11, 5))).toBe('5.12.')
    expect(daysBetween(new Date(2026, 10, 11), new Date(2026, 10, 14))).toBe(3)
  })
})

describe('planner settings', () => {
  it('defaults: 1 day buffer, 6 h per day', () => {
    expect(normalizeSettings(null)).toEqual({ bufferDays: 1, maxPerDayHours: 6, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })
  })

  it('keeps valid values and replaces invalid ones', () => {
    expect(normalizeSettings({ bufferDays: 3, maxPerDayHours: 8 })).toEqual({ bufferDays: 3, maxPerDayHours: 8, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })
    expect(normalizeSettings({ workDays: ['Fri', 'Mon', 'Mon', 'xx'] }).workDays).toEqual(['Mon', 'Fri'])
    expect(normalizeSettings({ workDays: [] }).workDays).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(normalizeSettings({ bufferDays: 99, maxPerDayHours: 'x' })).toEqual({ bufferDays: 1, maxPerDayHours: 6, workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] })
  })
})
