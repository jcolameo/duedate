/**
 * Quick capture syntax (B4): "Portfolio abgeben fr #studium !"
 *
 * - Date: heute, morgen, übermorgen (today/tomorrow), weekday names
 *   ("freitag", or "fr" as the last word / after "bis"/"am"), "24.4.", "24.4",
 *   "24.4.27", "24.04.2027", "2027-04-24", "24. April", "24 apr 2027". A weekday means the next one;
 *   on that weekday itself it means one week ahead ("heute" is for today).
 *   "bis"/"am"/"until"/"on" right before a date is dropped as well.
 *   Dates without a year that are already past mean next year.
 * - Area: #studium/#study, #freelance/#fl, #privat/#personal, any prefix (#s, #f, #p).
 * - Priority: a standalone "!" (or "!!", "!!!") = high.
 * - Tags (B5c): any other #word becomes a user tag ("#fotografie").
 * Everything else is the title.
 *
 * Returns { title, due: 'YYYY-MM-DD'|null, area: string|null, priority: 'high'|null, tags: string[] }.
 */
import { toISODate } from './taskModel.js'

const AREA_WORDS = {
  study: ['studium', 'study', 'schule'],
  freelance: ['freelance', 'fl', 'job', 'kunde'],
  personal: ['privat', 'personal', 'persönlich'],
}

// JS getDay(): 0 = Sunday
const WEEKDAYS_LONG = {
  sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
}
// Short forms collide with real words ("so", "do", "mi"), so they only count
// as the last word or after a date preposition
const WEEKDAYS_SHORT = {
  so: 0, mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6,
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}
const RELATIVE = { heute: 0, today: 0, morgen: 1, tomorrow: 1, übermorgen: 2, uebermorgen: 2 }
const PREPOSITIONS = new Set(['bis', 'am', 'until', 'on', 'by'])
const MONTHS = {
  januar: 0, jan: 0, februar: 1, feb: 1, märz: 2, maerz: 2, mär: 2, mrz: 2, april: 3, apr: 3,
  mai: 4, juni: 5, jun: 5, juli: 6, jul: 6, august: 7, aug: 7, september: 8, sept: 8, sep: 8,
  oktober: 9, okt: 9, november: 10, nov: 10, dezember: 11, dez: 11,
  january: 0, february: 1, march: 2, mar: 2, may: 4, june: 5, july: 6, october: 9, oct: 9, december: 11, dec: 11,
}

/** Day + month without year: this year, or next year if already past. */
function upcomingDate(today, month, day) {
  const thisYear = validDate(today.getFullYear(), month, day)
  if (!thisYear) return validDate(today.getFullYear() + 1, month, day)
  return thisYear < today ? validDate(today.getFullYear() + 1, month, day) : thisYear
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  d.setDate(d.getDate() + n)
  return d
}

function validDate(y, m, d) {
  const date = new Date(y, m, d)
  return date.getFullYear() === y && date.getMonth() === m && date.getDate() === d ? date : null
}

function areaFor(tag) {
  const t = tag.toLowerCase()
  if (!t) return null
  for (const [area, words] of Object.entries(AREA_WORDS)) {
    if (words.some(w => w.startsWith(t))) return area
  }
  return null
}

/** One word -> Date or null. `allowShort` enables "fr", "mo" … */
function dateFor(word, today, allowShort) {
  const w = word.toLowerCase().replace(/[.,]$/, '')
  if (w in RELATIVE) return addDays(today, RELATIVE[w])
  const weekday = w in WEEKDAYS_LONG ? WEEKDAYS_LONG[w] : allowShort && w in WEEKDAYS_SHORT ? WEEKDAYS_SHORT[w] : null
  if (weekday !== null) {
    const diff = (weekday - today.getDay() + 7) % 7 || 7
    return addDays(today, diff)
  }
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(word)
  if (m) return validDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  // "15.12.", "15.12", "15.12.26", "15.12.2026" (also with "/")
  m = /^(\d{1,2})[./](\d{1,2})(?:[./](\d{2}|\d{4})?)?$/.exec(word)
  if (m) {
    const day = Number(m[1])
    const month = Number(m[2]) - 1
    if (m[3]) {
      const y = Number(m[3])
      return validDate(y < 100 ? 2000 + y : y, month, day)
    }
    return upcomingDate(today, month, day)
  }
  return null
}

export function parseQuickAdd(input, now = new Date()) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const words = String(input || '').trim().split(/\s+/).filter(Boolean)
  const result = { title: '', due: null, area: null, priority: null, tags: [] }
  const keep = new Array(words.length).fill(true)

  // Index of the last word that is not a #tag or "!" (for short weekdays)
  let lastPlain = -1
  words.forEach((w, i) => { if (!w.startsWith('#') && !/^!+$/.test(w)) lastPlain = i })

  let consumedUntil = -1
  words.forEach((word, i) => {
    if (/^!{1,3}$/.test(word)) {
      result.priority = 'high'
      keep[i] = false
      return
    }
    if (word.startsWith('#')) {
      const name = word.slice(1)
      const area = areaFor(name)
      if (area) {
        // Only the first area counts; a second one stays visible in the title
        if (!result.area) { result.area = area; keep[i] = false }
        return
      }
      if (/^[\p{L}\p{N}][\p{L}\p{N}_-]*$/u.test(name)) {
        const lower = name.toLowerCase()
        if (!result.tags.some(t => t.toLowerCase() === lower)) result.tags.push(name)
        keep[i] = false
      }
      return
    }
    if (result.due) return
    // "15. Dezember" / "15 dez" / "15. Dez. 2027": day + month name (+ year)
    const dayMatch = /^(\d{1,2})\.?$/.exec(word)
    const monthWord = (words[i + 1] || '').toLowerCase().replace(/\.$/, '')
    if (dayMatch && monthWord in MONTHS) {
      const yearWord = /^(\d{4})$/.exec(words[i + 2] || '')
      const date = yearWord
        ? validDate(Number(yearWord[1]), MONTHS[monthWord], Number(dayMatch[1]))
        : upcomingDate(today, MONTHS[monthWord], Number(dayMatch[1]))
      if (date) {
        result.due = toISODate(date)
        keep[i] = false
        keep[i + 1] = false
        if (yearWord) keep[i + 2] = false
        const prevWord = i > 0 ? words[i - 1].toLowerCase() : ''
        if (PREPOSITIONS.has(prevWord)) keep[i - 1] = false
        consumedUntil = yearWord ? i + 2 : i + 1
        return
      }
    }
    if (i <= consumedUntil) return
    const prev = i > 0 && keep[i - 1] ? words[i - 1].toLowerCase() : ''
    const afterPreposition = PREPOSITIONS.has(prev)
    const date = dateFor(word, today, i === lastPlain || afterPreposition)
    if (date) {
      result.due = toISODate(date)
      keep[i] = false
      if (afterPreposition) keep[i - 1] = false
    }
  })

  result.title = words.filter((_, i) => keep[i]).join(' ')
  return result
}
