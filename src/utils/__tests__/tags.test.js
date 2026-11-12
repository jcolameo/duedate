import { describe, it, expect } from 'vitest'
import { TAG_COLORS, normalizeTagName, findTagByName, nextTagColor, ensureTags, filterByTag, tagsOf } from '../tags.js'
import { createTask, isTouched, mergeImport, rowsToTasks } from '../taskModel.js'

const NOW = new Date('2026-11-12T09:00:00Z')

describe('tags', () => {
  it('has 8 colors', () => expect(TAG_COLORS).toHaveLength(8))

  it.each([['  #Foto ', 'Foto'], ['Kunde A', 'Kunde-A'], ['##x', 'x'], ['', ''], [null, '']])(
    'normalizeTagName(%j) -> %j', (input, out) => expect(normalizeTagName(input)).toBe(out))

  it('cuts long names', () => expect(normalizeTagName('a'.repeat(50))).toHaveLength(30))

  it('finds tags case-insensitively', () => {
    const tags = [{ id: '1', name: 'Fotografie', color: 'blue' }]
    expect(findTagByName(tags, '#fotografie')).toBe(tags[0])
    expect(findTagByName(tags, 'foto')).toBeNull()
    expect(findTagByName(tags, '')).toBeNull()
  })

  it('picks the first unused color, then cycles', () => {
    expect(nextTagColor([])).toBe('gray')
    expect(nextTagColor([{ color: 'gray' }, { color: 'blue' }])).toBe('green')
    expect(nextTagColor(TAG_COLORS.map(color => ({ color })))).toBe('gray')
  })

  it('ensureTags creates missing tags once and reuses existing ones', () => {
    const existing = [{ id: 'a', name: 'foto', color: 'gray' }]
    const { tags, ids } = ensureTags(existing, ['Foto', 'kunde', 'KUNDE', ''], NOW)
    expect(tags.map(t => t.name)).toEqual(['foto', 'kunde'])
    expect(ids).toHaveLength(2)
    expect(ids[0]).toBe('a')
    expect(tags[1].color).toBe('blue')
    expect(existing).toHaveLength(1) // not mutated
  })

  it('filterByTag and tagsOf', () => {
    const tasks = [{ id: 1, tags: ['a'] }, { id: 2, tags: [] }, { id: 3 }]
    expect(filterByTag(tasks, 'a').map(t => t.id)).toEqual([1])
    expect(filterByTag(tasks, 'all')).toBe(tasks)
    const byId = new Map([['a', { id: 'a', name: 'x' }]])
    expect(tagsOf({ tags: ['a', 'gone'] }, byId).map(t => t.name)).toEqual(['x'])
    expect(tagsOf({}, byId)).toEqual([])
  })

  it('new tasks have no tags; tagged CSV tasks are kept on re-import', () => {
    expect(createTask({ id: 'x' }, NOW).tags).toEqual([])
    const [t] = rowsToTasks([{ Titel: 'Plakat', Abgabe: '20.11.2026' }], {}, NOW)
    const tagged = { ...t, tags: ['a'] }
    expect(isTouched(tagged)).toBe(true)
    expect(mergeImport([tagged], rowsToTasks([{ Titel: 'Plakat', Abgabe: '20.11.2026' }], {}, NOW), NOW)[0].tags).toEqual(['a'])
    expect(mergeImport([tagged], [], NOW)).toEqual([tagged])
  })
})
