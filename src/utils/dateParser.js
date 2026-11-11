// ─────────────────────────────────────────────────────
// Date helpers for German / Swiss formats
// ─────────────────────────────────────────────────────

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

// Optional leading weekday, e.g. "Fr, 24. April 2026" or "Freitag 24.04.2026"
const WEEKDAY_PREFIX = /^(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so)\.?,?\s+/
// Optional trailing time, e.g. "24.04.2026 23:59" — the time is ignored
const TIME_SUFFIX = '(?:,?\\s+\\d{1,2}:\\d{2}(?::\\d{2})?)?'

const ISO = new RegExp(`^(\\d{4})-(\\d{1,2})-(\\d{1,2})(?:t\\d{1,2}:\\d{2}.*|${TIME_SUFFIX})$`)
const NUMERIC = new RegExp(`^(\\d{1,2})[./](\\d{1,2})[./](\\d{4}|\\d{2})${TIME_SUFFIX}$`)
const LONG = new RegExp(`^(\\d{1,2})\\.\\s*([a-zäöü]+)\\.?\\s*(\\d{4}|\\d{2})${TIME_SUFFIX}$`)

/**
 * Builds a local date and rejects impossible ones (31.02. would otherwise
 * silently roll over to 3 March). Two-digit years are read as 20xx.
 */
function makeDate(year, monthIndex, day) {
  const y = year < 100 ? 2000 + year : year
  const d = new Date(y, monthIndex, day)
  if (d.getFullYear() !== y || d.getMonth() !== monthIndex || d.getDate() !== day) return null
  return d
}

/**
 * Parses German/Swiss date strings into a local Date (midnight), or null.
 * Supported: "24. April 2026", "24. Apr. 26", "24.04.2026", "24.4.26",
 * "24/04/2026", "2026-04-24" (ISO), each optionally with a leading weekday
 * ("Fr, …") and/or a trailing time ("… 23:59"). Slash dates are day-first
 * (Swiss convention); "4/24/2026" is therefore rejected, not guessed.
 * @param {string} str
 * @returns {Date|null}
 */
export function parseGermanDate(str) {
  if (str === null || str === undefined) return null
  const cleaned = String(str).trim().toLowerCase().replace(WEEKDAY_PREFIX, '')
  if (!cleaned) return null

  let m = cleaned.match(ISO)
  if (m) return makeDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]))

  m = cleaned.match(NUMERIC)
  if (m) return makeDate(Number(m[3]), Number(m[2]) - 1, Number(m[1]))

  m = cleaned.match(LONG)
  if (m) {
    const month = GERMAN_MONTHS[m[2]]
    if (month === undefined) return null
    return makeDate(Number(m[3]), month, Number(m[1]))
  }

  return null
}

/**
 * Days between today and the target date (negative = overdue).
 * @param {Date|null} date
 * @returns {number|null}
 */
export function daysUntil(date) {
  if (!date) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / (1000 * 60 * 60 * 24))
}
