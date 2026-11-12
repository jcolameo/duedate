import { describe, it, expect } from 'vitest'
import {
  addDays, addMonths, startOfWeek, shiftAnchor, monthGrid, compactMonthGrid, buildDayMap, loadLevel,
  rangeLabel, moveByKey, isSameDay, CALENDAR_VIEWS,
} from '../calendar.js'

const d = (y, m, day) => new Date(y, m - 1, day)

describe('date arithmetic', () => {
  it('addMonths keeps the day and clamps at the end of short months', () => {
    expect(addMonths(d(2026, 11, 12), 1)).toEqual(d(2026, 12, 12))
    expect(addMonths(d(2026, 1, 31), 1)).toEqual(d(2026, 2, 28))
    expect(addMonths(d(2028, 1, 31), 1)).toEqual(d(2028, 2, 29)) // leap year
    expect(addMonths(d(2026, 12, 15), 1)).toEqual(d(2027, 1, 15))
    expect(addMonths(d(2026, 3, 10), -3)).toEqual(d(2025, 12, 10))
  })

  it('addDays crosses month and year borders', () => {
    expect(addDays(d(2026, 12, 31), 1)).toEqual(d(2027, 1, 1))
    expect(addDays(d(2026, 3, 1), -1)).toEqual(d(2026, 2, 28))
  })

  it('weeks start on Monday, also when the date is a Sunday', () => {
    expect(startOfWeek(d(2026, 11, 12))).toEqual(d(2026, 11, 9)) // Thursday
    expect(startOfWeek(d(2026, 11, 9))).toEqual(d(2026, 11, 9))  // Monday
    expect(startOfWeek(d(2026, 11, 15))).toEqual(d(2026, 11, 9)) // Sunday
  })

  it('isSameDay ignores the time', () => {
    expect(isSameDay(new Date(2026, 10, 12, 8), new Date(2026, 10, 12, 23))).toBe(true)
    expect(isSameDay(d(2026, 11, 12), d(2026, 11, 13))).toBe(false)
  })
})

describe('shiftAnchor', () => {
  const a = d(2026, 11, 12)
  it.each([
    ['day', 1, d(2026, 11, 13)], ['day', -1, d(2026, 11, 11)],
    ['week', 1, d(2026, 11, 19)], ['week', -1, d(2026, 11, 5)],
    ['month', 1, d(2026, 12, 12)], ['month', -1, d(2026, 10, 12)],
    ['year', 1, d(2027, 11, 12)], ['year', -1, d(2025, 11, 12)],
  ])('%s %i', (view, step, expected) => expect(shiftAnchor(view, a, step)).toEqual(expected))

  it('has four views', () => expect(CALENDAR_VIEWS).toEqual(['day', 'week', 'month', 'year']))
})

describe('monthGrid', () => {
  it('always has 6 weeks of 7 days, starting on a Monday', () => {
    for (const month of [1, 2, 6, 11, 12]) {
      const grid = monthGrid(d(2026, month, 15))
      expect(grid).toHaveLength(6)
      expect(grid.every(week => week.length === 7)).toBe(true)
      expect(grid[0][0].date.getDay()).toBe(1)
    }
  })

  it('November 2026 starts on a Sunday: the first row begins on Monday 26 Oct', () => {
    const grid = monthGrid(d(2026, 11, 12))
    expect(grid[0][0].date).toEqual(d(2026, 10, 26))
    expect(grid[0][6]).toMatchObject({ date: d(2026, 11, 1), inMonth: true })
    expect(grid[0][5].inMonth).toBe(false)
  })

  it('contains every day of the month once and the days are consecutive', () => {
    const flat = monthGrid(d(2026, 2, 1)).flat()
    expect(flat.filter(c => c.inMonth)).toHaveLength(28)
    flat.slice(1).forEach((c, i) => expect(c.date).toEqual(addDays(flat[i].date, 1)))
  })

  it('compactMonthGrid drops rows without days of the month (4-6 rows)', () => {
    expect(compactMonthGrid(2026, 1).length).toBeGreaterThanOrEqual(4)
    expect(compactMonthGrid(2026, 1).length).toBeLessThanOrEqual(6)
    expect(compactMonthGrid(2027, 1).every(w => w.some(c => c.inMonth))).toBe(true)
    // Feb 2027 starts on a Monday and has 28 days: exactly 4 rows
    expect(compactMonthGrid(2027, 1)).toHaveLength(4)
  })
})

describe('buildDayMap', () => {
  const task = (id, y, m, day, extra = {}) => ({ _id: id, _deadlineDate: d(y, m, day), _isDone: false, ...extra })
  const session = (taskId, y, m, day, start, end) => ({ taskId, date: d(y, m, day), startMin: start, endMin: end })

  it('groups deadlines and sessions by day and adds up the planned minutes', () => {
    const map = buildDayMap(
      [task('a', 2026, 11, 20), task('b', 2026, 11, 20), task('c', 2026, 11, 21)],
      [session('a', 2026, 11, 20, 600, 690), session('b', 2026, 11, 20, 700, 760), session('a', 2026, 11, 22, 480, 540)],
    )
    expect(map.get('2026-11-20').deadlines.map(t => t._id)).toEqual(['a', 'b'])
    expect(map.get('2026-11-20').minutes).toBe(150)
    expect(map.get('2026-11-21')).toMatchObject({ minutes: 0 })
    expect(map.get('2026-11-22').sessions).toHaveLength(1)
    expect(map.has('2026-11-23')).toBe(false)
  })

  it('skips done tasks and tasks without a date', () => {
    const map = buildDayMap([task('x', 2026, 11, 20, { _isDone: true }), { _id: 'n', _deadlineDate: null }], [])
    expect(map.size).toBe(0)
  })
})

describe('loadLevel', () => {
  it.each([[0, 0], [30, 1], [90, 1], [91, 2], [240, 2], [241, 3], [600, 3]])('%i min -> level %i', (min, level) => {
    expect(loadLevel(min)).toBe(level)
  })
})

describe('rangeLabel', () => {
  const a = d(2026, 11, 12)
  it('day, week, month, year', () => {
    expect(rangeLabel('day', a, 'de-CH')).toMatch(/Donnerstag.*12\.?\s*November 2026/)
    expect(rangeLabel('week', a, 'de-CH')).toMatch(/9\.?\s*[–-]\s*15\.?\s*November 2026/)
    expect(rangeLabel('month', a, 'de-CH')).toBe('November 2026')
    expect(rangeLabel('year', a, 'de-CH')).toBe('2026')
  })

  it('a week across two months names both', () => {
    expect(rangeLabel('week', d(2026, 11, 30), 'de-CH')).toMatch(/30\.?\s*November.*6\.?\s*Dezember 2026/)
  })

  it('works in English too', () => {
    expect(rangeLabel('month', a, 'en-GB')).toBe('November 2026')
  })
})

describe('moveByKey', () => {
  const a = d(2026, 11, 12) // Thursday
  it.each([
    ['ArrowLeft', d(2026, 11, 11)], ['ArrowRight', d(2026, 11, 13)], ['ArrowUp', d(2026, 11, 5)], ['ArrowDown', d(2026, 11, 19)],
    ['Home', d(2026, 11, 9)], ['End', d(2026, 11, 15)], ['PageUp', d(2026, 10, 12)], ['PageDown', d(2026, 12, 12)],
  ])('%s', (key, expected) => expect(moveByKey(a, key)).toEqual(expected))

  it('other keys do nothing', () => {
    expect(moveByKey(a, 'a')).toBeNull()
    expect(moveByKey(a, 'Enter')).toBeNull()
  })
})
