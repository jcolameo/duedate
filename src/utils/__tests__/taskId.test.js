import { describe, it, expect } from 'vitest'
import { taskId } from '../taskId.js'

describe('taskId', () => {
  it('is deterministic for the same title and deadline', () => {
    expect(taskId('Portfolio', '24. April 2026')).toBe(taskId('Portfolio', '24. April 2026'))
  })

  it('differs when title or deadline differ', () => {
    const base = taskId('Portfolio', '24. April 2026')
    expect(taskId('Portfolio v2', '24. April 2026')).not.toBe(base)
    expect(taskId('Portfolio', '25. April 2026')).not.toBe(base)
  })

  it('handles missing values', () => {
    expect(taskId(undefined, undefined)).toMatch(/^t-?\d+$/)
    expect(taskId('', '')).toBe(taskId(undefined, null))
  })

  it('always starts with "t"', () => {
    expect(taskId('Abgabe', '1.1.2026')).toMatch(/^t/)
  })

  // Known limitation, solved by real task entities in roadmap step B1:
  // two different CSV rows with identical title + deadline share one ID.
  it('collides for identical title + deadline (documented limitation, see B1)', () => {
    expect(taskId('Lesen', '1.5.2026')).toBe(taskId('Lesen', '1.5.2026'))
  })
})
