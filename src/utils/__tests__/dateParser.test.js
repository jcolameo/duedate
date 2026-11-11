import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseGermanDate, daysUntil } from '../dateParser.js'

// Compare calendar dates without caring about time/timezone details
function ymd(date) {
  return date ? [date.getFullYear(), date.getMonth() + 1, date.getDate()] : null
}

describe('parseGermanDate', () => {
  it('parses long German format "24. April 2026"', () => {
    expect(ymd(parseGermanDate('24. April 2026'))).toEqual([2026, 4, 24])
  })

  it('parses long format without space after the dot', () => {
    expect(ymd(parseGermanDate('3.März 2026'))).toEqual([2026, 3, 3])
  })

  it('accepts "Marz" without umlaut', () => {
    expect(ymd(parseGermanDate('3. Marz 2026'))).toEqual([2026, 3, 3])
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(ymd(parseGermanDate('  1. DEZEMBER 2026 '))).toEqual([2026, 12, 1])
  })

  it('parses numeric format "24.04.2026"', () => {
    expect(ymd(parseGermanDate('24.04.2026'))).toEqual([2026, 4, 24])
  })

  it('parses single-digit numeric format "1.5.2026"', () => {
    expect(ymd(parseGermanDate('1.5.2026'))).toEqual([2026, 5, 1])
  })

  it('returns null for empty, null and undefined', () => {
    expect(parseGermanDate('')).toBeNull()
    expect(parseGermanDate(null)).toBeNull()
    expect(parseGermanDate(undefined)).toBeNull()
  })

  it('returns null for unknown month names and garbage', () => {
    expect(parseGermanDate('24. Foo 2026')).toBeNull()
    expect(parseGermanDate('morgen')).toBeNull()
  })

  // --- Formats and validation added in roadmap step A3 ---

  it('parses ISO format "2026-04-24"', () => {
    expect(ymd(parseGermanDate('2026-04-24'))).toEqual([2026, 4, 24])
  })

  it('parses two-digit year "24.04.26"', () => {
    expect(ymd(parseGermanDate('24.04.26'))).toEqual([2026, 4, 24])
  })

  it('parses slash format "24/04/2026"', () => {
    expect(ymd(parseGermanDate('24/04/2026'))).toEqual([2026, 4, 24])
  })

  it('rejects impossible dates like 31.02.2026 instead of rolling over', () => {
    expect(parseGermanDate('31.02.2026')).toBeNull()
  })

  it('knows leap years', () => {
    expect(ymd(parseGermanDate('29.02.2028'))).toEqual([2028, 2, 29])
    expect(parseGermanDate('29.02.2027')).toBeNull()
  })

  it('rejects invalid months and days', () => {
    expect(parseGermanDate('12.13.2026')).toBeNull()
    expect(parseGermanDate('00.05.2026')).toBeNull()
    expect(parseGermanDate('2026-02-30')).toBeNull()
  })

  it('reads slash dates day-first and rejects US month-first dates', () => {
    expect(ymd(parseGermanDate('05/04/2026'))).toEqual([2026, 4, 5])
    expect(parseGermanDate('4/24/2026')).toBeNull()
  })

  it('parses abbreviated month names, with or without a dot', () => {
    expect(ymd(parseGermanDate('24. Apr 2026'))).toEqual([2026, 4, 24])
    expect(ymd(parseGermanDate('24. Apr. 2026'))).toEqual([2026, 4, 24])
    expect(ymd(parseGermanDate('1. Okt. 26'))).toEqual([2026, 10, 1])
    expect(ymd(parseGermanDate('3. Mär 2026'))).toEqual([2026, 3, 3])
  })

  it('ignores a leading weekday', () => {
    expect(ymd(parseGermanDate('Fr, 24. April 2026'))).toEqual([2026, 4, 24])
    expect(ymd(parseGermanDate('Freitag 24.04.2026'))).toEqual([2026, 4, 24])
  })

  it('ignores a trailing time', () => {
    expect(ymd(parseGermanDate('24.04.2026 23:59'))).toEqual([2026, 4, 24])
    expect(ymd(parseGermanDate('24. April 2026, 08:00'))).toEqual([2026, 4, 24])
    expect(ymd(parseGermanDate('2026-04-24T23:59:00'))).toEqual([2026, 4, 24])
  })

  it('returns local midnight (no UTC shift)', () => {
    const d = parseGermanDate('2026-04-24')
    expect([d.getHours(), d.getMinutes()]).toEqual([0, 0])
  })
})

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 11, 15, 30)) // Wed 11 Nov 2026, 15:30
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 for today regardless of time of day', () => {
    expect(daysUntil(new Date(2026, 10, 11, 23, 59))).toBe(0)
  })

  it('returns positive days for the future', () => {
    expect(daysUntil(new Date(2026, 10, 14))).toBe(3)
  })

  it('returns negative days for the past', () => {
    expect(daysUntil(new Date(2026, 10, 9))).toBe(-2)
  })

  it('counts across a DST change correctly (Oct -> Nov)', () => {
    vi.setSystemTime(new Date(2026, 9, 20, 12, 0))
    expect(daysUntil(new Date(2026, 10, 3))).toBe(14)
  })

  it('returns null for missing dates', () => {
    expect(daysUntil(null)).toBeNull()
  })
})
