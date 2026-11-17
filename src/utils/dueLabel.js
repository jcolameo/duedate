/**
 * Wording for deadlines and calendar weeks.
 *
 * The labels are returned as locale keys plus parameters, not as finished text.
 * That keeps the components free of date logic and makes the wording testable
 * without Vue or a browser.
 *
 * Pure functions: no storage, no clock, no Vue.
 */

/**
 * Picks the wording for a deadline that is `days` away.
 *
 * @param {number|null} days - days until the deadline, from `daysUntil()`;
 *   negative means overdue, `null` means the task has no deadline
 * @returns {{ key: string, params: object }} locale key and its parameters
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
 * ISO-8601 calendar week, the numbering used in Switzerland and Germany ("KW 46").
 *
 * Weeks start on Monday and week 1 is the one containing the first Thursday.
 * The trick below is the standard shortcut: move to the Thursday of the current
 * week, then count weeks from 1 January of that Thursday's year.
 *
 * @param {Date} date
 * @returns {number} week number, 1 to 53
 */
export function isoWeek(date) {
  // Work in UTC so a daylight-saving change cannot shift the day by one.
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7 // Sunday is 0 in JS, but 7 in ISO
  d.setUTCDate(d.getUTCDate() + 4 - dayNum) // jump to the Thursday of this week
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7)
}
