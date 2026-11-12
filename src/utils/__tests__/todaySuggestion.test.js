import { describe, it, expect } from 'vitest'
import {
  TODAY_LIMIT, effectivePriority, rankCandidates, suggestToday, pickReplacement,
  effortMinutes, totalEffort, formatMinutes, normalizeToday, dayProgress,
} from '../todaySuggestion.js'

const task = (id, days, extra = {}) => ({ _id: id, _title: id, _days: days, ...extra })

describe('ranking', () => {
  it('overdue, then urgent, then soon, then later, then no date', () => {
    const list = [task('none', null), task('later', 20), task('soon', 5), task('urgent', 1), task('over', -2)]
    expect(rankCandidates(list).map(t => t._id)).toEqual(['over', 'urgent', 'soon', 'later', 'none'])
  })

  it('a nearer deadline beats a higher priority in a different bucket', () => {
    const list = [task('far-high', 20, { priority: 'high' }), task('near-low', 5, { priority: 'low' })]
    expect(rankCandidates(list)[0]._id).toBe('near-low')
  })

  it('priority decides inside a bucket, then the date', () => {
    const list = [task('b', 5, { priority: 'low' }), task('c', 6), task('a', 6, { priority: 'high' }), task('d', 4)]
    expect(rankCandidates(list).map(t => t._id)).toEqual(['a', 'd', 'c', 'b'])
  })

  it('graded tasks count as high priority unless set explicitly', () => {
    expect(effectivePriority({ graded: true })).toBe('high')
    expect(effectivePriority({ graded: true, priority: 'low' })).toBe('low')
    expect(effectivePriority({})).toBe('medium')
    const list = [task('plain', 10), task('graded', 10, { graded: true })]
    expect(rankCandidates(list)[0]._id).toBe('graded')
  })

  it('is stable (title) and does not mutate the input', () => {
    const list = [task('b', 3), task('a', 3)]
    const copy = [...list]
    expect(rankCandidates(list).map(t => t._id)).toEqual(['a', 'b'])
    expect(list).toEqual(copy)
  })

  it('also works on plain tasks (id/title)', () => {
    expect(rankCandidates([{ id: 'x', title: 'X', _days: 3 }, { id: 'y', title: 'Y', _days: -1 }])[0].id).toBe('y')
  })
})

describe('suggestToday', () => {
  const list = [task('a', -1), task('b', 0), task('c', 2), task('d', 9), task('e', 30)]

  it('returns the best three by default', () => {
    expect(TODAY_LIMIT).toBe(3)
    expect(suggestToday(list).map(t => t._id)).toEqual(['a', 'b', 'c'])
  })

  it('respects limit and exclude', () => {
    expect(suggestToday(list, { limit: 2, exclude: ['a'] }).map(t => t._id)).toEqual(['b', 'c'])
  })

  it('returns fewer when fewer are open, and nothing for an empty list', () => {
    expect(suggestToday([task('only', 1)])).toHaveLength(1)
    expect(suggestToday([])).toEqual([])
  })
})

describe('pickReplacement', () => {
  const list = [task('a', -1), task('b', 0), task('c', 2), task('d', 9)]

  it('takes the best task that is not in today\'s list', () => {
    expect(pickReplacement(list, { exclude: ['a', 'b'] })._id).toBe('c')
  })

  it('skips tasks the user already passed on', () => {
    expect(pickReplacement(list, { exclude: ['a'], skipped: ['b'] })._id).toBe('c')
  })

  it('brings a skipped task back when nothing else is left', () => {
    expect(pickReplacement(list, { exclude: ['a', 'c', 'd'], skipped: ['b'] })._id).toBe('b')
  })

  it('returns null when everything is already in the list', () => {
    expect(pickReplacement(list, { exclude: ['a', 'b', 'c', 'd'] })).toBeNull()
    expect(pickReplacement([])).toBeNull()
  })
})

describe('effort', () => {
  it('uses the remaining time of the estimate', () => {
    expect([effortMinutes({ estimateMin: 30 }), effortMinutes({ estimateMin: 120 }), effortMinutes({ estimateMin: null })]).toEqual([30, 120, null])
    // 4 h with 1 of 2 steps done -> 2 h left
    expect(effortMinutes({ estimateMin: 240, source: 'manual', description: '- [x] a\n- [ ] b' })).toBe(120)
  })

  it('sums up when every task has an estimate', () => {
    expect(totalEffort([{ estimateMin: 60 }, { estimateMin: 30 }])).toEqual({ minutes: 90 })
  })

  it('a big task counts with at most one day of work', () => {
    expect(totalEffort([{ estimateMin: 960 }, { estimateMin: 60 }])).toEqual({ minutes: 240 })
  })

  it('stays silent instead of guessing when one estimate is missing', () => {
    expect(totalEffort([{ estimateMin: 60 }, { estimateMin: null }])).toBeNull()
    expect(totalEffort([])).toBeNull()
  })

  it.each([[30, '30 min'], [60, '1 h'], [90, '1,5 h'], [150, '2,5 h'], [240, '4 h']])('formatMinutes(%i) -> %s', (min, text) => {
    expect(formatMinutes(min)).toBe(text)
  })

  it('uses the given decimal separator', () => expect(formatMinutes(90, '.')).toBe('1.5 h'))
})

describe('normalizeToday', () => {
  it('keeps valid state and removes duplicates', () => {
    expect(normalizeToday({ date: '2026-11-12', ids: ['a', 'a', 'b'], skipped: ['c'] })).toEqual({ date: '2026-11-12', ids: ['a', 'b'], skipped: ['c'] })
  })

  it.each([[null], ['x'], [{}], [{ date: 'heute' }], [{ date: '2026-11-12', ids: 'a', skipped: [1, null] }]])('survives garbage %j', (value) => {
    const r = normalizeToday(value)
    expect(Array.isArray(r.ids) && Array.isArray(r.skipped)).toBe(true)
    expect(r.skipped).toEqual([])
  })
})

describe('dayProgress', () => {
  const open = (steps) => ({ _isDone: false, _checklist: steps ? { done: steps[0], total: steps[1] } : null })
  const done = (steps) => ({ _isDone: true, _checklist: steps ? { done: steps[0], total: steps[1] } : null })

  it('empty day is 0 %', () => expect(dayProgress([])).toEqual({ done: 0, total: 0, percent: 0 }))

  it('tasks without a checklist are one step each', () => {
    expect(dayProgress([done(null), open(null), open(null)])).toEqual({ done: 1, total: 3, percent: 33 })
  })

  it('checklist steps count, and finishing the task is one more step', () => {
    // 3 steps + finish = 4 units, 2 boxes ticked
    expect(dayProgress([open([2, 3])])).toEqual({ done: 2, total: 4, percent: 50 })
    // all boxes ticked but not completed yet: not 100 %
    expect(dayProgress([open([3, 3])]).percent).toBe(75)
  })

  it('bigger tasks weigh more', () => {
    // done task without steps (1/1) + open task with 3 steps, 1 ticked (1/4) -> 2/5
    expect(dayProgress([done(null), open([1, 3])])).toEqual({ done: 2, total: 5, percent: 40 })
  })

  it('a completed task counts fully, whatever its boxes say', () => {
    expect(dayProgress([done([1, 4])])).toEqual({ done: 5, total: 5, percent: 100 })
  })
})
