import { describe, it, expect } from 'vitest'
import { AREAS, normalizeArea, normalizeAreaFilter, filterByArea, countByArea } from '../areas.js'
import { createTask, enrichTask, isTouched, mergeImport, rowsToTasks } from '../taskModel.js'

const NOW = new Date('2026-11-12T09:00:00Z')
const tasks = [
  { id: 'a', area: 'study' },
  { id: 'b', area: 'freelance' },
  { id: 'c', area: 'personal' },
  { id: 'd', area: 'freelance' },
  { id: 'e' }, // pre-B3 data without area
]

describe('areas', () => {
  it('has the three areas in display order', () => {
    expect(AREAS).toEqual(['study', 'freelance', 'personal'])
  })

  it.each([['study', 'study'], ['freelance', 'freelance'], [undefined, 'study'], ['work', 'study'], [null, 'study']])(
    'normalizeArea(%s) -> %s', (input, out) => expect(normalizeArea(input)).toBe(out))

  it('unknown filter values mean "all"', () => {
    expect(normalizeAreaFilter('personal')).toBe('personal')
    expect(normalizeAreaFilter('nope')).toBe('all')
    expect(normalizeAreaFilter(null)).toBe('all')
  })

  it('filterByArea keeps order and treats missing area as study', () => {
    expect(filterByArea(tasks, 'all')).toBe(tasks)
    expect(filterByArea(tasks, 'freelance').map(t => t.id)).toEqual(['b', 'd'])
    expect(filterByArea(tasks, 'study').map(t => t.id)).toEqual(['a', 'e'])
    expect(filterByArea(tasks, 'garbage')).toBe(tasks)
  })

  it('countByArea counts every task once', () => {
    expect(countByArea(tasks)).toEqual({ all: 5, study: 2, freelance: 2, personal: 1 })
    expect(countByArea([])).toEqual({ all: 0, study: 0, freelance: 0, personal: 0 })
  })
})

describe('areas in the task model', () => {
  it('CSV imports land in study', () => {
    const [t] = rowsToTasks([{ Titel: 'Plakat', Abgabe: '20.11.2026' }], {}, NOW)
    expect(t.area).toBe('study')
  })

  it('enrichTask exposes a normalized _area', () => {
    expect(enrichTask(createTask({ id: 'x', area: 'personal' }, NOW))._area).toBe('personal')
    expect(enrichTask({ ...createTask({ id: 'y' }, NOW), area: undefined })._area).toBe('study')
  })

  it('a moved CSV task keeps its area on re-import and is never dropped', () => {
    const [t] = rowsToTasks([{ Titel: 'Offerte', Abgabe: '1.12.2026' }], {}, NOW)
    const moved = { ...t, area: 'freelance' }
    expect(isTouched(moved)).toBe(true)
    expect(mergeImport([moved], rowsToTasks([{ Titel: 'Offerte', Abgabe: '1.12.2026' }], {}, NOW), NOW)[0].area).toBe('freelance')
    expect(mergeImport([moved], [], NOW)).toEqual([moved])
  })
})
