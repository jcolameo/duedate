/**
 * SEC-002: task fields from a backup file must have the expected type.
 *
 * Only `id` and `title` used to be checked, so a numeric `due` passed the import
 * and threw later in `enrichTask`, which took down the whole task list instead of
 * showing a readable import error.
 */
import { describe, it, expect } from 'vitest'
import { parseBackup } from '../backup.js'

const file = (data) => JSON.stringify({ format: 'duedate-backup', version: 1, schema: 5, data })

describe('SEC-002: task fields are type-checked on import', () => {
  it('rejects tasks whose fields have the wrong type', () => {
    const r = parseBackup(file({ tasks: [{ id: 'a', title: 't', status: { x: 1 }, description: { x: 1 }, due: 123 }] }))
    expect(r.error).toBeDefined()
  })

  it('a numeric due date never reaches the task enrichment', () => {
    const r = parseBackup(file({ tasks: [{ id: 'a', title: 't', due: 123 }] }))
    expect(r.error?.code).toBe('invalid_tasks')
  })

  it.each([
    ['status', { x: 1 }],
    ['description', { x: 1 }],
    ['due', 123],
    ['dueRaw', 123],
    ['estimateMin', 'abc'],
    ['priority', 3],
    ['graded', 'yes'],
    ['steps', 'a,b'],
    ['tags', 'a,b'],
    ['pinned', { a: 1 }],
    ['notes', []],
  ])('rejects a task whose %s has the wrong type', (field, value) => {
    const r = parseBackup(file({ tasks: [{ id: 'a', title: 't', [field]: value }] }))
    expect(r.error?.code).toBe('invalid_tasks')
  })

  it.each([
    ['status', 'done'],
    ['due', '2026-11-20'],
    ['estimateMin', 90],
    ['graded', true],
    ['steps', []],
    ['tags', ['t1']],
    ['pinned', ['a']],
    ['notes', 'text'],
    ['priority', 'high'],
  ])('accepts a task whose %s has the right type', (field, value) => {
    const r = parseBackup(file({ tasks: [{ id: 'a', title: 't', [field]: value }] }))
    expect(r.error).toBeUndefined()
  })

  it('accepts a task that leaves optional fields out', () => {
    const r = parseBackup(file({ tasks: [{ id: 'a', title: 't' }] }))
    expect(r.error).toBeUndefined()
  })
})
