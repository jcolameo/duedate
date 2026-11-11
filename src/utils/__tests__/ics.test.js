import { describe, it, expect } from 'vitest'
import { buildDeadlineEvent, buildSessionEvent, ensureUniqueUids, buildIcs } from '../ics.js'

const task = {
  _id: 't123',
  _title: 'Plakat',
  _category: 'Typografie',
  _description: 'A3',
  _isGraded: true,
  _deadlineDate: new Date(2026, 10, 20),
}

const session = {
  taskId: 't123',
  title: 'Plakat',
  date: new Date(2026, 10, 12),
  startMin: 10 * 60 + 30,
  endMin: 11 * 60 + 30,
}

describe('ics events', () => {
  it('gives a deadline a stable UID derived from the task ID', () => {
    expect(buildDeadlineEvent(task).uid).toBe('deadline-t123@duedate.app')
    expect(buildDeadlineEvent(task).uid).toBe(buildDeadlineEvent({ ...task }).uid)
  })

  it('builds an all-day deadline with title, category and graded star', () => {
    const e = buildDeadlineEvent(task)
    expect(e.title).toBe('📚 Typografie: Plakat ⭐')
    expect(e.start).toEqual([2026, 11, 20])
    expect(e.duration).toEqual({ days: 1 })
    expect(e.description).toBe('A3')
  })

  it('can omit the description', () => {
    expect(buildDeadlineEvent(task, { withDescription: false }).description).toBeUndefined()
  })

  it('gives a session a per-task UID that does not depend on its time', () => {
    const moved = { ...session, date: new Date(2026, 10, 13), startMin: 14 * 60, endMin: 15 * 60 }
    expect(buildSessionEvent(session).uid).toBe('session-t123@duedate.app')
    expect(buildSessionEvent(moved).uid).toBe(buildSessionEvent(session).uid)
  })

  it('uses different UIDs for a deadline and a session of the same task', () => {
    expect(buildDeadlineEvent(task).uid).not.toBe(buildSessionEvent(session).uid)
  })

  it('builds a timed session with local start and duration', () => {
    const e = buildSessionEvent(session)
    expect(e.start).toEqual([2026, 11, 12, 10, 30])
    expect(e.duration).toEqual({ minutes: 60 })
  })

  it('makes repeated UIDs within one file unique', () => {
    const uids = ensureUniqueUids([{ uid: 'a@x' }, { uid: 'a@x' }, { uid: 'b@x' }]).map(e => e.uid)
    expect(uids).toEqual(['a@x', 'a-2@x', 'b@x'])
  })
})

describe('buildIcs', () => {
  it('writes the stable UIDs into the calendar file', async () => {
    const text = await buildIcs([buildDeadlineEvent(task), buildSessionEvent(session)])
    expect(text).toContain('UID:deadline-t123@duedate.app')
    expect(text).toContain('UID:session-t123@duedate.app')
    expect(text).toContain('BEGIN:VCALENDAR')
  })

  it('produces the same UIDs on a second export', async () => {
    const uids = (txt) => txt.match(/^UID:.*$/gm)
    const first = await buildIcs([buildDeadlineEvent(task)])
    const second = await buildIcs([buildDeadlineEvent(task)])
    expect(uids(first)).toEqual(uids(second))
  })
})
