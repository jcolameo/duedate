/**
 * usePageEyebrow: the small context line above a page title, for example
 * "Mi 11.11. · KW 46" (weekday, date, calendar week).
 *
 * Called by: src/views/HomeView.vue:49.
 *
 * In: an optional Date (default: now). Out: a computed string.
 *
 * In the background: nothing is stored. The text follows a language switch
 * because it calls `t()`.
 *
 * Not module level: each call builds its own computed for its own date.
 *
 * How to read this file: one function. The date is fixed when the page is
 * set up; only the language is reactive.
 */
import { computed } from 'vue'
import { useLocale } from './useLocale.js'
import { WORK_DAYS } from '../utils/scheduler.js'
import { isoWeek } from '../utils/dueLabel.js'

/**
 * Mono context line above page titles, e.g. "Mi 11.11. · KW 46".
 * Reactive to the locale; the date is taken when the page is set up.
 *
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @param {Date} [date=new Date()] the day to describe
 * @returns {import('vue').ComputedRef<string>} the formatted line
 */
export function usePageEyebrow(date = new Date()) {
  const { t } = useLocale()
  // `computed` is like a getter that React would recompute in `render`, but
  // Vue caches it until a dependency changes; here that is only `locale`,
  // read inside t().
  // HINWEIS: The date is not reactive; a page left open over midnight keeps
  // showing yesterday until it is set up again.
  return computed(() => {
    // JavaScript counts Sunday as 0, WORK_DAYS starts with Monday. Adding 6
    // and taking mod 7 turns Sunday 0 into 6 and Monday 1 into 0.
    const dayCode = WORK_DAYS[(date.getDay() + 6) % 7]
    const dd = String(date.getDate()).padStart(2, '0')
    // getMonth() is 0-based (January = 0).
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `${t('common.days.' + dayCode)} ${dd}.${mm}. · ${t('common.week', { week: isoWeek(date) })}`
  })
}
