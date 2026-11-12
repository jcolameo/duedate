import { describe, it, expect } from 'vitest'
import { parseQuickAdd } from '../quickAddParser.js'

// Thursday, 12 November 2026
const NOW = new Date(2026, 10, 12, 9, 30)
const p = (s) => parseQuickAdd(s, NOW)

describe('parseQuickAdd', () => {
  it('plain text is just the title', () => {
    expect(p('Offerte schreiben')).toEqual({ title: 'Offerte schreiben', due: null, area: null, priority: null, tags: [] })
  })

  it('trims and collapses whitespace', () => {
    expect(p('  Mail   an   Kunde  ').title).toBe('Mail an Kunde')
  })

  it('empty input gives an empty title', () => {
    expect(p('')).toEqual({ title: '', due: null, area: null, priority: null, tags: [] })
    expect(p(null).title).toBe('')
  })

  it.each([
    ['heute', '2026-11-12'], ['morgen', '2026-11-13'], ['übermorgen', '2026-11-14'],
    ['today', '2026-11-12'], ['tomorrow', '2026-11-13'], ['Morgen', '2026-11-13'],
  ])('relative "%s" -> %s', (word, due) => {
    expect(p(`Lesen ${word}`)).toMatchObject({ title: 'Lesen', due })
  })

  it.each([
    ['freitag', '2026-11-13'], ['montag', '2026-11-16'], ['Sonntag', '2026-11-15'],
    ['donnerstag', '2026-11-19'], // same weekday -> next week
  ])('weekday "%s" -> %s', (word, due) => {
    expect(p(`Abgabe ${word}`).due).toBe(due)
  })

  it('short weekday as last word', () => {
    expect(p('Portfolio abgeben fr')).toMatchObject({ title: 'Portfolio abgeben', due: '2026-11-13' })
  })

  it('English short weekday', () => {
    expect(p('Offer fri')).toMatchObject({ title: 'Offer', due: '2026-11-13' })
  })

  it('short weekday words inside the title stay text', () => {
    expect(p('So geht das')).toMatchObject({ title: 'So geht das', due: null })
    expect(p('Do it now')).toMatchObject({ title: 'Do it now', due: null })
  })

  it('"bis" / "am" before a date is removed too', () => {
    expect(p('Offerte bis fr #freelance')).toMatchObject({ title: 'Offerte', due: '2026-11-13', area: 'freelance' })
    expect(p('Training am mo')).toMatchObject({ title: 'Training', due: '2026-11-16' })
  })

  it('"bis" without a date stays in the title', () => {
    expect(p('Lesen bis Kapitel 3').title).toBe('Lesen bis Kapitel 3')
  })

  it.each([
    ['24.11.', '2026-11-24'],
    ['24.4.', '2027-04-24'], // already past this year -> next year
    ['12.11.', '2026-11-12'], // today still counts
    ['24.4.27', '2027-04-24'],
    ['24.04.2027', '2027-04-24'],
    ['2027-04-24', '2027-04-24'],
  ])('numeric date %s -> %s', (word, due) => {
    expect(p(`Abgabe ${word}`).due).toBe(due)
  })

  it.each([
    ['15.12', '2026-12-15'], ['am 3.12', '2026-12-03'], ['15/12', '2026-12-15'],
    ['15. Dezember', '2026-12-15'], ['15 dez', '2026-12-15'], ['3. Feb.', '2027-02-03'],
    ['15. Dezember 2027', '2027-12-15'], ['bis 1. März', '2027-03-01'],
  ])('also understands %s -> %s', (text, due) => {
    expect(p(`Abgabe ${text}`)).toMatchObject({ title: 'Abgabe', due })
  })

  it('invalid dates and version numbers stay in the title', () => {
    expect(p('Release 31.2.').due).toBeNull()
    expect(p('Update auf 2.0').title).toBe('Update auf 2.0')
  })

  it('a number followed by a month name is always read as a date', () => {
    expect(p('Kapitel 3 Mai lesen')).toMatchObject({ title: 'Kapitel lesen', due: '2027-05-03' })
  })

  it.each([
    ['#studium', 'study'], ['#s', 'study'], ['#study', 'study'],
    ['#freelance', 'freelance'], ['#f', 'freelance'], ['#FL', 'freelance'],
    ['#privat', 'personal'], ['#p', 'personal'], ['#personal', 'personal'],
  ])('area %s -> %s', (tag, area) => {
    expect(p(`Aufgabe ${tag}`)).toMatchObject({ title: 'Aufgabe', area })
  })

  it('other #words become user tags (B5c)', () => {
    expect(p('Post #instagram')).toMatchObject({ title: 'Post', area: null, tags: ['instagram'] })
    expect(p('Shooting #Fotografie #f #kunde-a')).toMatchObject({ title: 'Shooting', area: 'freelance', tags: ['Fotografie', 'kunde-a'] })
  })

  it('duplicate tags count once, a lone # stays text', () => {
    expect(p('A #foto #Foto').tags).toEqual(['foto'])
    expect(p('Nummer # 5')).toMatchObject({ title: 'Nummer # 5', tags: [] })
  })

  it('only the first area and date count', () => {
    const r = p('A #f #p morgen freitag')
    expect(r).toMatchObject({ area: 'freelance', due: '2026-11-13', title: 'A #p freitag' })
  })

  it('"!" means high priority, "!" inside words does not', () => {
    expect(p('Steuern !')).toMatchObject({ title: 'Steuern', priority: 'high' })
    expect(p('!! Steuern')).toMatchObject({ title: 'Steuern', priority: 'high' })
    expect(p('Wow! Super')).toMatchObject({ title: 'Wow! Super', priority: null })
  })

  it('the roadmap example', () => {
    expect(p('Portfolio abgeben fr #studium !')).toEqual({
      title: 'Portfolio abgeben', due: '2026-11-13', area: 'study', priority: 'high', tags: [],
    })
  })

  it('tokens can be anywhere', () => {
    expect(p('#f morgen Offerte Müller')).toMatchObject({ title: 'Offerte Müller', due: '2026-11-13', area: 'freelance' })
  })
})
