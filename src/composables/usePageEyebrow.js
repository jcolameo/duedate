import { computed } from 'vue'
import { useLocale } from './useLocale.js'
import { WORK_DAYS } from '../utils/scheduler.js'
import { isoWeek } from '../utils/dueLabel.js'

/**
 * Mono context line above page titles, e.g. "Mi 11.11. · KW 46".
 * Reactive to the locale; the date is taken when the page is set up.
 */
export function usePageEyebrow(date = new Date()) {
  const { t } = useLocale()
  return computed(() => {
    const dayCode = WORK_DAYS[(date.getDay() + 6) % 7]
    const dd = String(date.getDate()).padStart(2, '0')
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    return `${t('common.days.' + dayCode)} ${dd}.${mm}. · ${t('common.week', { week: isoWeek(date) })}`
  })
}
