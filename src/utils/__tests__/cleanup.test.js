import { describe, it, expect } from 'vitest'
import { selectCleanup, CLEANUP_MONTHS } from '../cleanup.js'

const NOW = new Date(2026, 10, 12, 12, 0)
const done = (id, completedAt, extra = {}) => ({ id, status: 'done', completedAt, source: 'manual', ...extra })
const iso = (y, m, d) => new Date(y, m - 1, d, 12).toISOString()

describe('selectCleanup', () => {
  const tasks = [
    done('old-manual', iso(2026, 3, 1)),
    done('old-csv', iso(2026, 2, 1), { source: 'csv' }),
    done('recent', iso(2026, 10, 1)),
    done('border-in', iso(2026, 5, 11)),   // just over 6 months ago
    done('border-out', iso(2026, 5, 13)),  // just under 6 months ago
    { id: 'open-old', status: 'open', completedAt: null, createdAt: iso(2025, 1, 1), source: 'manual' },
  ]

  it('removes own finished tasks older than the period, nothing else', () => {
    const { remove } = selectCleanup(tasks, 6, NOW)
    expect(remove.map(t => t.id).sort()).toEqual(['border-in', 'old-manual'])
  })

  it('keeps BBNet tasks and reports them separately (they would come back with the next import)', () => {
    const { remove, keepCsv } = selectCleanup(tasks, 6, NOW)
    expect(remove.some(t => t.source === 'csv')).toBe(false)
    expect(keepCsv.map(t => t.id)).toEqual(['old-csv'])
  })

  it('never touches open tasks, however old', () => {
    const { remove, keepCsv } = selectCleanup(tasks, 3, NOW)
    expect([...remove, ...keepCsv].some(t => t.id === 'open-old')).toBe(false)
  })

  it('a longer period removes less', () => {
    const counts = CLEANUP_MONTHS.map(m => selectCleanup(tasks, m, NOW).remove.length)
    expect(counts).toEqual([...counts].sort((a, b) => b - a))
    expect(selectCleanup(tasks, 12, NOW).remove).toEqual([])
  })

  it('falls back to the last change when completedAt is missing, and skips unusable dates', () => {
    const list = [
      { id: 'a', status: 'done', completedAt: null, updatedAt: iso(2025, 1, 1), source: 'manual' },
      { id: 'b', status: 'done', completedAt: null, updatedAt: 'kaputt', source: 'manual' },
    ]
    expect(selectCleanup(list, 6, NOW).remove.map(t => t.id)).toEqual(['a'])
  })

  it('an empty list is fine and the input is not changed', () => {
    expect(selectCleanup([], 6, NOW)).toEqual({ remove: [], keepCsv: [] })
    const copy = JSON.stringify(tasks)
    selectCleanup(tasks, 6, NOW)
    expect(JSON.stringify(tasks)).toBe(copy)
  })
})
