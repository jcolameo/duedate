import { describe, it, expect } from 'vitest'
import { withRole, isSavedMappingUsable } from '../mapping.js'

describe('withRole', () => {
  it('sets a role', () => {
    expect(withRole({ title: 'Titel' }, 'deadline', 'Abgabe')).toEqual({ title: 'Titel', deadline: 'Abgabe' })
  })

  it('removes the role when cleared instead of storing null', () => {
    const next = withRole({ title: 'Titel', files: 'Datei' }, 'files', null)
    expect(next).toEqual({ title: 'Titel' })
    expect('files' in next).toBe(false)
  })

  it('does not mutate the input', () => {
    const input = { title: 'Titel' }
    withRole(input, 'deadline', 'Abgabe')
    expect(input).toEqual({ title: 'Titel' })
  })
})

describe('isSavedMappingUsable', () => {
  const headers = ['Titel', 'Abgabe', 'Fach']

  it('accepts a mapping whose columns all exist', () => {
    expect(isSavedMappingUsable({ title: 'Titel', deadline: 'Abgabe', category: 'Fach' }, headers)).toBe(true)
  })

  it('rejects a mapping that references a missing column', () => {
    expect(isSavedMappingUsable({ title: 'Titel', deadline: 'Due' }, headers)).toBe(false)
  })

  // Regression: an optional field set to "nicht zuweisen" used to be stored as
  // null, which made every later import ask for confirmation again.
  it('ignores empty values saved by older versions', () => {
    expect(isSavedMappingUsable({ title: 'Titel', deadline: 'Abgabe', files: null, graded: '' }, headers)).toBe(true)
  })

  it('requires both title and deadline', () => {
    expect(isSavedMappingUsable({ title: 'Titel' }, headers)).toBe(false)
  })

  it('handles a missing saved mapping', () => {
    expect(isSavedMappingUsable(null, headers)).toBe(false)
  })
})
