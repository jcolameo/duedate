/**
 * Date parsing for German and Swiss formats.
 *
 * School platforms and CSV exports write dates in many shapes: "24. April 2026",
 * "24.04.2026", "24/04/2026", sometimes with a weekday in front and a time
 * behind. All of them end up as a local Date at midnight, or as null.
 *
 * Pure functions: no storage, no clock, no Vue.
 */

/** Month names and the abbreviations that actually appear in exports. */
const GERMAN_MONTHS = {
  januar: 0, jan: 0,
  februar: 1, feb: 1,
  märz: 2, maerz: 2, marz: 2, mär: 2, mrz: 2,
  april: 3, apr: 3,
  mai: 4,
  juni: 5, jun: 5,
  juli: 6, jul: 6,
  august: 7, aug: 7,
  september: 8, sept: 8, sep: 8,
  oktober: 9, okt: 9,
  november: 10, nov: 10,
  dezember: 11, dez: 11,
}

/** Optional leading weekday, e.g. "Fr, 24. April 2026" or "Freitag 24.04.2026". */
const WEEKDAY_PREFIX = /^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)\.?,?\s+/

/** Optional trailing time, e.g. "24.04.2026 23:59". The time is ignored, not stored. */
const TIME_SUFFIX = '(?:,?\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?'

const ISO = new RegExp(`^(\\d{4})-(\\d{1,2})-(\\d{1,2})(?:t\\d{1,2}:\\d{2}.*|${TIME_SUFFIX})$`)
const NUMERIC = new RegExp(`^(\\d{1,2})[./](\\d{1,2})[./](\\d{4}|\\d{2})${TIME_SUFFIX}$`)
const LONG = new RegExp(`^(\\d{1,2})\\.\\s*([a-zäöü]+)\\.?\\s*(\\d{4}|\\d{2})${TIME_SUFFIX}$`)

/**
 * Builds a local date and rejects impossible ones.
 *
 * `new Date(2026, 1, 31)` would silently roll over to 3 March, so the parts are
 * read back and compared. Two-digit years are read as 20xx.
 *
 * @returns {Date|null}
 */
function makeDate(year, monthIndex, day) {
  const fullYear = year < 100 ? 2000 + year : year
  const date = new Date(fullYear, monthIndex, day)
  if (date.getFullYear() !== fullYear || date.getMonth() !== monthIndex || date.getDate() !== day) return null
  return date
}

/**
 * Parses a German or Swiss date string into a local Date at midnight.
 *
 * Accepted: "24. April 2026", "24. Apr. 26", "24.04.2026", "24.4.26",
 * "24/04/2026", "2026-04-24" (ISO), each optionally with a leading weekday
 * ("Fr, ...") and a trailing time ("... 23:59").
 *
 * Slash and dot dates are day-first, the Swiss convention. "4/24/2026" is
 * therefore rejected instead of guessed: a wrong guess would silently move a
 * deadline by months.
 *
 * @param {string} str
 * @returns {Date|null} null when the text is not a date
 */
export function parseGermanDate(str) {
  if (str === null || str === undefined) return null
  const cleaned = String(str).trim().toLowerCase().replace(WEEKDAY_PREFIX, '')
  if (!cleaned) return null

  let match = cleaned.match(ISO)
  if (match) return makeDate(Number(match[1]), Number(match[2]) - 1, Number(match[3]))

  match = cleaned.match(NUMERIC)
  if (match) return makeDate(Number(match[3]), Number(match[2]) - 1, Number(match[1]))

  match = cleaned.match(LONG)
  if (match) {
    const month = GERMAN_MONTHS[match[2]]
    if (month === undefined) return null
    return makeDate(Number(match[3]), month, Number(match[1]))
  }

  return null
}

/**
 * Days between today and the target date. Negative means overdue.
 *
 * Both sides are moved to midnight first, so a deadline later today still
 * counts as 0 and not as -1.
 *
 * @param {Date|null} date
 * @returns {number|null} null without a date
 */
export function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}
