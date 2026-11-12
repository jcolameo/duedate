import { describe, it, expect } from 'vitest'
import { pinsOf, withPin, withoutPin, snapMinutes, dateToISO } from '../pins.js'
import { checkSlot } from '../slotCheck.js'
import { generatePlan } from '../scheduler.js'
import { upgradeToV5, createTask } from '../taskModel.js'

// Wednesday 11 Nov 2026, 10:00
const NOW = new Date(2026, 10, 11, 10, 0)
const d = (n) => new Date(2026, 10, 11 + n)
const iso = (n) => dateToISO(d(n))

function task(id, n, extra = {}) {
  return { _id: id, _title: id, _deadlineDate: d(n), _days: n, status: 'open', ...extra }
}
const planning = (map = {}) => (t) => {
  const m = map[t._id] ?? null
  return { estimateMin: m, remainingMin: m, priority: 'medium' }
}
const pin = (id, n, startMin, endMin) => ({ id, date: iso(n), startMin, endMin })

describe('pin helpers', () => {
  it('keeps valid pins sorted and drops broken ones', () => {
    const t = { pinned: [pin('b', 3, 600, 660), { id: 'x' }, pin('a', 1, 600, 660), pin('c', 1, 700, 600), null] }
    expect(pinsOf(t).map(p => p.id)).toEqual(['a', 'b'])
    expect(pinsOf({})).toEqual([])
    expect(pinsOf({ pinned: 'nope' })).toEqual([])
  })
  it('adds, replaces and removes by id', () => {
    let pins = withPin([], pin('a', 1, 600, 660))
    pins = withPin(pins, pin('a', 2, 700, 760))
    expect(pins).toHaveLength(1)
    expect(pins[0].date).toBe(iso(2))
    expect(withoutPin(pins, 'a')).toEqual([])
  })
  it('snaps to 15 minutes', () => {
    expect(snapMinutes(607)).toBe(600)
    expect(snapMinutes(608)).toBe(615)
  })
})

describe('upgradeToV5', () => {
  it('adds pinned: [] and is idempotent', () => {
    const once = upgradeToV5([{ id: '1' }, { id: '2', pinned: [pin('a', 1, 600, 660)] }])
    expect(once[0].pinned).toEqual([])
    expect(once[1].pinned).toHaveLength(1)
    expect(upgradeToV5(once)).toBe(once)
  })
  it('new tasks start without pins', () => {
    expect(createTask({ id: 'x' }).pinned).toEqual([])
  })
})

describe('generatePlan with pinned sessions', () => {
  it('places the pin exactly and plans only the rest', () => {
    const t = task('a', 10, { pinned: [pin('p1', 5, 14 * 60, 15 * 60 + 30)] })
    const plan = generatePlan([t], planning({ a: 240 }), [], NOW)
    const mine = plan.sessions.filter(s => s.taskId === 'a')
    const pinned = mine.filter(s => s.pinned)
    expect(pinned).toHaveLength(1)
    expect(pinned[0]).toMatchObject({ pinId: 'p1', startTime: '14:00', endTime: '15:30' })
    expect(dateToISO(pinned[0].date)).toBe(iso(5))
    const total = mine.reduce((sum, s) => sum + s.endMin - s.startMin, 0)
    expect(total).toBe(240)
    expect(plan.shortfalls).toEqual([])
  })

  it('other sessions keep away from the pinned slot', () => {
    const t = task('a', 3, { pinned: [pin('p1', 1, 8 * 60, 9 * 60 + 30)] })
    const u = task('b', 3)
    const plan = generatePlan([t, u], planning({ a: 90, b: 90 }), [], NOW)
    const overlapping = plan.sessions.filter(s => s.taskId === 'b' && dateToISO(s.date) === iso(1) && s.startMin < 9 * 60 + 30 && 8 * 60 < s.endMin)
    expect(overlapping).toEqual([])
  })

  it('a pin that covers the whole task leaves nothing to plan', () => {
    const t = task('a', 5, { pinned: [pin('p1', 2, 600, 690)] })
    const plan = generatePlan([t], planning({ a: 90 }), [], NOW)
    expect(plan.sessions).toHaveLength(1)
    expect(plan.shortfalls).toEqual([])
  })

  it('ignores pins in the past and pins of finished tasks', () => {
    const past = task('a', 5, { pinned: [pin('old', -1, 600, 660), pin('earlier', 0, 8 * 60, 9 * 60)] })
    const done = task('b', 5, { status: 'done', pinned: [pin('p', 2, 600, 660)] })
    const plan = generatePlan([past, done], planning({ a: 60, b: 60 }), [], NOW)
    expect(plan.sessions.filter(s => s.pinned)).toEqual([])
    expect(plan.sessions.filter(s => s.taskId === 'a').reduce((m, s) => m + s.endMin - s.startMin, 0)).toBe(60)
  })

  it('keeps a pin on a free weekday and beyond the deadline', () => {
    // d(3) is Saturday, deadline d(1)
    const t = task('a', 1, { pinned: [pin('p1', 3, 600, 660)] })
    const plan = generatePlan([t], planning({ a: 60 }), [], NOW, { workDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] })
    expect(plan.sessions.find(s => s.pinned)?.day).toBe('Sat')
  })

  it('numbers sessions across pinned and planned ones', () => {
    const t = task('a', 10, { pinned: [pin('p1', 5, 600, 690)] })
    const plan = generatePlan([t], planning({ a: 270 }), [], NOW)
    const mine = plan.sessions.filter(s => s.taskId === 'a')
    expect(mine.map(s => s.n)).toEqual(mine.map((_, i) => i + 1))
    expect(mine.every(s => s.of === mine.length)).toBe(true)
  })
})

describe('checkSlot', () => {
  const slot = (n, start, end) => ({ date: d(n), startMin: start, endMin: end })
  const ctx = { now: NOW }

  it('rejects the past and times outside the day grid', () => {
    expect(checkSlot(slot(-1, 600, 660), ctx).reject).toBe('past')
    expect(checkSlot(slot(0, 9 * 60, 10 * 60), ctx).reject).toBe('past')
    expect(checkSlot(slot(1, 7 * 60, 8 * 60), ctx).reject).toBe('outside')
    expect(checkSlot(slot(1, 20 * 60, 22 * 60), ctx).reject).toBe('outside')
  })
  it('accepts a free future slot without warnings', () => {
    expect(checkSlot(slot(1, 600, 660), ctx)).toEqual({ reject: null, warnings: [] })
  })
  it('warns about busy times, pinned overlaps, the deadline and the day limit', () => {
    const blocks = [{ label: 'Kurs', days: ['Thu'], startTime: '10:00', endTime: '11:00' }] // d(1) = Thu
    expect(checkSlot(slot(1, 630, 690), { ...ctx, blocks }).warnings).toContain('busy')
    const sessions = [{ date: d(1), startMin: 600, endMin: 660, pinned: true }]
    expect(checkSlot(slot(1, 630, 690), { ...ctx, sessions }).warnings).toContain('overlap')
    expect(checkSlot(slot(1, 630, 690), { ...ctx, sessions: [{ ...sessions[0], pinned: false }] }).warnings).not.toContain('overlap')
    expect(checkSlot(slot(3, 600, 660), { ...ctx, deadline: d(1) }).warnings).toContain('afterDeadline')
    const busyDay = [{ date: d(1), startMin: 480, endMin: 840, pinned: false }]
    expect(checkSlot(slot(1, 900, 960), { ...ctx, sessions: busyDay, maxPerDayMin: 360 }).warnings).toContain('dayLimit')
  })
  it('ignores the session that is being moved', () => {
    const self = { date: d(1), startMin: 600, endMin: 660, pinned: true, id: 'me' }
    expect(checkSlot(slot(1, 600, 660), { ...ctx, sessions: [self], ignore: s => s.id === 'me' }).warnings).toEqual([])
  })
})
