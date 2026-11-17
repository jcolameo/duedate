/**
 * SEC-001: link parsing must stay linear.
 *
 * The old regex form backtracked quadratically: 20k characters took 152 ms,
 * 40k took 586 ms and 80k took 2348 ms, which freezes the tab on a hostile
 * description. The fix walks the string once; these tests keep it that way.
 */
import { describe, it, expect } from 'vitest'
import { renderMarkdown, markdownSummary } from '../markdown.js'

function elapsedMs(fn) {
  const t = performance.now()
  fn()
  return performance.now() - t
}

describe('SEC-001: no quadratic regex on long input', () => {
  // Third-party text must render in well under a second. 80k characters is the
  // size where the old regex form clearly blew the budget; after the fix it is
  // about 0.2 ms, so the margin is large enough for slow CI machines.
  const BUDGET_MS = 300
  const hostile = {
    '"[" x 80000': '['.repeat(80000),
    '"[a](" x 80000': '[a]('.repeat(80000),
  }

  it.each(Object.keys(hostile))('renderMarkdown stays fast for %s', (name) => {
    expect(elapsedMs(() => renderMarkdown(hostile[name]))).toBeLessThan(BUDGET_MS)
  })

  it('markdownSummary stays fast (runs for every task on Home)', () => {
    expect(elapsedMs(() => markdownSummary('[a]('.repeat(80000)))).toBeLessThan(BUDGET_MS)
  })

  it('doubling the input does not quadruple the time', () => {
    const small = elapsedMs(() => renderMarkdown('[a]('.repeat(20000)))
    const large = elapsedMs(() => renderMarkdown('[a]('.repeat(80000)))
    // Linear work means 4x the input costs about 4x the time; quadratic would be 16x.
    expect(large).toBeLessThan(Math.max(small, 1) * 8)
  })
})
