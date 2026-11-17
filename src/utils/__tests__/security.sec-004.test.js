/**
 * SEC-004: a backup import writes everything or nothing.
 *
 * Tasks used to be written before the raw CSV rows, so a quota error on the last
 * key left the new tasks in place and the old CSV behind: a half-imported state
 * the user cannot see and cannot undo.
 */
import { describe, it, expect } from 'vitest'
import { parseBackup, applyBackup } from '../backup.js'

const file = (data) => JSON.stringify({ format: 'duedate-backup', version: 1, schema: 5, data })

/** Storage that behaves like localStorage: throws once the quota is exceeded. */
const quotaStorage = (limit) => {
  const m = new Map()
  let used = 0
  return {
    getItem: k => m.get(k) ?? null,
    setItem: (k, v) => {
      const next = used - (m.get(k)?.length || 0) + v.length
      if (next > limit) {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      }
      used = next
      m.set(k, v)
    },
    removeItem: (k) => { used -= m.get(k)?.length || 0; m.delete(k) },
    m,
  }
}

const LIMIT = 5 * 1024 * 1024

/** A small task list plus CSV rows large enough to blow the quota on the last key. */
const oversized = () => ({
  tasks: [{ id: 'a', title: 'wichtig' }],
  csv: { rows: Array.from({ length: 40000 }, (_, i) => ({ Titel: `Zeile ${i}`, Beschreibung: 'y'.repeat(200) })) },
})

describe('SEC-004: an oversized backup does not leave half-imported data', () => {
  it('a quota error writes nothing at all', () => {
    const r = parseBackup(file(oversized()))
    const s = quotaStorage(LIMIT)
    let thrown = null
    try { applyBackup(r.backup, s) } catch (error) { thrown = error }
    expect(thrown).not.toBeNull()
    expect(s.m.get('duedate.taskStore.v1')).toBeUndefined()
  })

  it('keeps the previous data when the import fails', () => {
    const s = quotaStorage(LIMIT)
    s.setItem('duedate.taskStore.v1', JSON.stringify({ tasks: [{ id: 'old', title: 'alt' }] }))
    s.setItem('duedate.tags.v1', JSON.stringify({ tags: [{ id: 'x', name: 'alt', color: 'gray' }] }))
    const r = parseBackup(file(oversized()))
    expect(() => applyBackup(r.backup, s)).toThrow()
    expect(JSON.parse(s.m.get('duedate.taskStore.v1')).tasks[0].id).toBe('old')
    expect(JSON.parse(s.m.get('duedate.tags.v1')).tags[0].id).toBe('x')
  })

  it('a backup that fits is still written completely', () => {
    const r = parseBackup(file({ tasks: [{ id: 'a', title: 't' }], tags: [{ id: 'x', name: 'n', color: 'blue' }] }))
    const s = quotaStorage(LIMIT)
    applyBackup(r.backup, s)
    expect(JSON.parse(s.m.get('duedate.taskStore.v1')).tasks[0].id).toBe('a')
    expect(JSON.parse(s.m.get('duedate.tags.v1')).tags[0].color).toBe('blue')
  })
})
