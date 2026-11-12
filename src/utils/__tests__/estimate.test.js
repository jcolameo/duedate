import { describe, it, expect } from 'vitest'
import { parseEstimate, estimateToInput, remainingMinutes, ESTIMATE_PRESETS_H } from '../estimate.js'

describe('parseEstimate', () => {
  it.each([
    ['6', 360], ['6,5', 390], ['6.5', 390], ['2 h', 120], ['2h', 120], ['1,5 std', 90],
    ['90 min', 90], ['45m', 60], ['20 min', 30], // minutes round up to 30
    ['0,2', 30], ['  8  ', 480], ['16', 960],
  ])('%j -> %i minutes', (text, minutes) => expect(parseEstimate(text)).toEqual({ value: minutes }))

  it('empty means no estimate', () => {
    expect(parseEstimate('')).toEqual({ value: null })
    expect(parseEstimate('   ')).toEqual({ value: null })
    expect(parseEstimate(null)).toEqual({ value: null })
  })

  it.each([['abc'], ['0'], ['-2'], ['2 tage'], ['1000'], ['2,5,5'], ['h']])('%j is an error', (text) => {
    expect(parseEstimate(text)).toEqual({ error: true })
  })
})

describe('estimateToInput', () => {
  it('writes hours the way the user would type them', () => {
    expect([estimateToInput(120), estimateToInput(90), estimateToInput(30), estimateToInput(null)]).toEqual(['2', '1,5', '0,5', ''])
    expect(estimateToInput(90, '.')).toBe('1.5')
  })

  it('parsing what was written gives the same value back', () => {
    for (const min of [30, 90, 120, 390, 960]) expect(parseEstimate(estimateToInput(min)).value).toBe(min)
  })
})

describe('remainingMinutes', () => {
  it('is the estimate without a checklist, and null without an estimate', () => {
    expect(remainingMinutes({ estimateMin: 480 })).toBe(480)
    expect(remainingMinutes({ estimateMin: null })).toBeNull()
  })

  it('deducts the share of finished steps, rounded up to 30 minutes', () => {
    const task = (description) => ({ estimateMin: 480, source: 'manual', description })
    expect(remainingMinutes(task('- [x] a\n- [x] b\n- [ ] c\n- [ ] d'))).toBe(240)
    expect(remainingMinutes(task('- [x] a\n- [ ] b\n- [ ] c'))).toBe(330) // 5,33 h -> 5,5 h
    expect(remainingMinutes(task('- [x] a\n- [x] b'))).toBe(0)
  })

  it('CSV tasks keep their steps in the notes', () => {
    expect(remainingMinutes({ estimateMin: 120, source: 'csv', description: '- [x] aus BBNet', notes: '- [x] a\n- [ ] b' })).toBe(60)
  })
})

describe('presets', () => {
  it('are 2, 4, 8 and 16 hours', () => expect(ESTIMATE_PRESETS_H).toEqual([2, 4, 8, 16]))
})
