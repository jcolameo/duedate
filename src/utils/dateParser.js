// ─────────────────────────────────────────────────────
// Datums-Helfer für deutsche Formate
// ─────────────────────────────────────────────────────

const GERMAN_MONTHS = {
  januar: 0, februar: 1, märz: 2, marz: 2, april: 3, mai: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, dezember: 11,
}

/**
 * Parsed deutsche Datumsformate zu Date-Objekten.
 * Unterstützt: "24. April 2026", "24.04.2026"
 * @param {string} str
 * @returns {Date|null}
 */
export function parseGermanDate(str) {
  if (!str) return null
  const cleaned = str.toString().trim().toLowerCase()

  const matchLong = cleaned.match(/^(\d{1,2})\.\s*([a-zäö]+)\s*(\d{4})$/)
  if (matchLong) {
    const [, day, monthName, year] = matchLong
    const month = GERMAN_MONTHS[monthName]
    if (month === undefined) return null
    return new Date(Number(year), month, Number(day))
  }

  const matchShort = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (matchShort) {
    const [, day, month, year] = matchShort
    return new Date(Number(year), Number(month) - 1, Number(day))
  }

  return null
}

/**
 * Tage zwischen heute und Ziel-Datum (negativ = überfällig).
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