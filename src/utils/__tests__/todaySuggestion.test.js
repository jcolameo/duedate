import { describe, it, expect } from 'vitest'
import {
  TODAY_LIMIT, effectivePriority, rankCandidates, suggestToday, pickReplacement,
  effortMinutes, totalEffort, formatMinutes, normalizeToday,
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
  it('maps effort values to minutes', () => {
    expect([effortMinutes({ effort: '30m' }), effortMinutes({ effort: '2h' }), effortMinutes({ effort: null })]).toEqual([30, 120, null])
  })

  it('sums up when every task has an effort', () => {
    expect(totalEffort([{ effort: '1h' }, { effort: '30m' }])).toEqual({ minutes: 90, atLeast: false })
  })

  it('3h+ turns the total into a minimum', () => {
    expect(totalEffort([{ effort: '3h+' }, { effort: '1h' }])).toEqual({ minutes: 240, atLeast: true })
  })

  it('stays silent instead of guessing when one effort is missing', () => {
    expect(totalEffort([{ effort: '1h' }, { effort: null }])).toBeNull()
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
