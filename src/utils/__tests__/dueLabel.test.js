import { describe, it, expect } from 'vitest'
import { dueLabel, isoWeek } from '../dueLabel.js'

describe('dueLabel', () => {
  it.each([
    [null, 'due.none', {}],
    [0, 'due.today', {}],
    [1, 'due.tomorrow', {}],
    [5, 'due.inDays', { days: 5 }],
    [-1, 'due.overdueOne', {}],
    [-3, 'due.overdueMany', { days: 3 }],
  ])('days=%s -> %s', (days, key, params) => {
    expect(dueLabel(days)).toEqual({ key, params })
  })
})

describe('isoWeek', () => {
  it.each([
    [new Date(2026, 10, 11), 46], // Wed 11 Nov 2026
    [new Date(2026, 0, 1), 1], // Thu 1 Jan 2026 -> week 1
    [new Date(2027, 0, 1), 53], // Fri 1 Jan 2027 -> week 53 of 2026
    [new Date(2026, 11, 28), 53], // Mon 28 Dec 2026
    [new Date(2025, 11, 29), 1], // Mon 29 Dec 2025 -> week 1 of 2026
  ])('%s -> KW %i', (date, week) => {
    expect(isoWeek(date)).toBe(week)
  })
})
