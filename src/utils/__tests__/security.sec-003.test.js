/**
 * SEC-003: a tag color from a backup file must come from the known palette.
 *
 * The color ends up in a CSS class lookup, so an arbitrary value from outside
 * has no business reaching it. Unknown values fall back to `gray`.
 */
import { describe, it, expect } from 'vitest'
import { parseBackup, applyBackup } from '../backup.js'
import { TAG_COLORS } from '../tags.js'

const file = (data) => JSON.stringify({ format: 'duedate-backup', version: 1, schema: 5, data })

const memoryStorage = () => {
  const m = new Map()
  return { getItem: k => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: k => m.delete(k), m }
}

/** Imports the backup and returns the stored tags. */
function importedTags(tags) {
  const r = parseBackup(file({ tasks: [{ id: 'a', title: 't' }], tags }))
  const s = memoryStorage()
  applyBackup(r.backup, s)
  return JSON.parse(s.m.get('duedate.tags.v1')).tags
}

describe('SEC-003: tag colors are checked against the palette', () => {
  it.each(['__proto__', 'constructor', 'red', '', 'GRAY', 'gray; background:url(x)'])(
    'falls back to gray for %s',
    (color) => {
      expect(importedTags([{ id: 'x', name: 'n', color }])[0].color).toBe('gray')
    },
  )

  it.each(TAG_COLORS)('keeps the known color %s', (color) => {
    expect(importedTags([{ id: 'x', name: 'n', color }])[0].color).toBe(color)
  })

  it('falls back to gray when the color is missing', () => {
    expect(importedTags([{ id: 'x', name: 'n' }])[0].color).toBe('gray')
  })
})
