import { describe, it, expect } from 'vitest'
import { normalizeBlock, normalizeBlocks, expandBlocksByDay, formatDays, sortDays, isValidTimeRange } from '../availability.js'

const de = { Mon: 'Mo', Tue: 'Di', Wed: 'Mi', Thu: 'Do', Fri: 'Fr', Sat: 'Sa', Sun: 'So' }
const label = (d) => de[d]

describe('migration of saved blocks (A6)', () => {
  it('turns a legacy single-day block into a days list', () => {
    expect(normalizeBlock({ id: 'b1', label: 'Gym', day: 'Mon', startTime: '18:00', endTime: '19:00' }))
      .toEqual({ id: 'b1', label: 'Gym', days: ['Mon'], startTime: '18:00', endTime: '19:00' })
  })

  it('keeps already migrated blocks and sorts their days', () => {
    expect(normalizeBlock({ id: 'b2', label: 'Job', days: ['Thu', 'Mon', 'Mon'], startTime: '08:00', endTime: '17:00' }).days)
      .toEqual(['Mon', 'Thu'])
  })

  it('drops blocks without a valid day and garbage entries', () => {
    expect(normalizeBlocks([{ id: 'x', day: 'Funday' }, null, 'oops', { id: 'y', days: [] }])).toEqual([])
  })

  it('handles a non-array value from storage', () => {
    expect(normalizeBlocks({ broken: true })).toEqual([])
  })
})

describe('expandBlocksByDay', () => {
  it('creates one entry per day', () => {
    const out = expandBlocksByDay([{ id: 'b', label: 'Job', days: ['Mon', 'Tue'], startTime: '08:00', endTime: '17:00' }])
    expect(out.map(b => b.day)).toEqual(['Mon', 'Tue'])
    expect(out[0]).toMatchObject({ label: 'Job', startTime: '08:00' })
  })

  it('also accepts legacy blocks', () => {
    expect(expandBlocksByDay([{ id: 'b', label: 'Gym', day: 'Wed', startTime: '18:00', endTime: '19:00' }])[0].day).toBe('Wed')
  })
})

describe('formatDays', () => {
  it.each([
    [['Mon', 'Tue', 'Wed', 'Thu'], 'Mo–Do'],
    [['Mon', 'Wed'], 'Mo, Mi'],
    [['Mon', 'Tue'], 'Mo, Di'],
    [['Mon', 'Tue', 'Wed', 'Fri'], 'Mo–Mi, Fr'],
    [['Sat', 'Sun', 'Mon'], 'Mo, Sa, So'],
    [['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], 'Mo–So'],
    [['Fri'], 'Fr'],
  ])('%j -> %s', (days, text) => {
    expect(formatDays(days, label)).toBe(text)
  })
})

describe('helpers', () => {
  it('sortDays orders Mon→Sun and removes unknown values', () => {
    expect(sortDays(['Sun', 'Mon', 'x'])).toEqual(['Mon', 'Sun'])
  })

  it('isValidTimeRange requires end after start', () => {
    expect(isValidTimeRange('08:00', '17:00')).toBe(true)
    expect(isValidTimeRange('17:00', '08:00')).toBe(false)
    expect(isValidTimeRange('09:00', '09:00')).toBe(false)
    expect(isValidTimeRange('', '10:00')).toBe(false)
  })
})
