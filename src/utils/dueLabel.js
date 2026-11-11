/**
 * Human due-date wording as a locale key + params, so components stay simple
 * and the logic is testable without Vue. "heute", "morgen", "in 4 Tagen",
 * "1 Tag überfällig", "3 Tage überfällig", "kein Datum".
 * @param {number|null} days - from daysUntil()
 * @returns {{ key: string, params: object }}
 */
export function dueLabel(days) {
  if (days === null || days === undefined) return { key: 'due.none', params: {} }
  if (days === 0) return { key: 'due.today', params: {} }
  if (days === 1) return { key: 'due.tomorrow', params: {} }
  if (days === -1) return { key: 'due.overdueOne', params: {} }
  if (days < 0) return { key: 'due.overdueMany', params: { days: Math.abs(days) } }
  return { key: 'due.inDays', params: { days } }
}

/**
 * ISO-8601 calendar week (Monday start, week 1 contains the first Thursday),
 * as used in Switzerland and Germany ("KW 46").
 * @param {Date} date
 * @returns {number}
 */
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}
