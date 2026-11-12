/**
 * Shared calendar (.ics) building for all exports.
 *
 * Every event gets a stable UID derived from the task ID. Calendars treat an
 * imported event with a known UID as the same event (update) instead of
 * adding a duplicate, so exporting and importing again is safe.
 */

const UID_DOMAIN = 'duedate.app'

function dateParts(d) {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
}

/** All-day event on the deadline date. */
export function buildDeadlineEvent(task, { untitled = '', withDescription = true } = {}) {
  const category = task._category || ''
  const title = task._title || untitled
  const grade = task._isGraded ? ' ⭐' : ''
  const event = {
    uid: `deadline-${task._id}@${UID_DOMAIN}`,
    title: category ? `📚 ${category}: ${title}${grade}` : `📚 ${title}${grade}`,
    start: dateParts(task._deadlineDate),
    duration: { days: 1 },
    categories: ['Hausaufgaben', category].filter(Boolean),
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
  }
  if (withDescription && task._description) {
    event.description = String(task._description).slice(0, 500)
  }
  return event
}

/**
 * Timed work session from the weekly plan. The UID is per task (the planner
 * places one session per task), so re-exporting a regenerated plan moves the
 * existing calendar entry instead of adding a second one.
 */
export function buildSessionEvent(session) {
  return {
    uid: `session-${session.taskId}@${UID_DOMAIN}`,
    title: `📊 ${session.title}`,
    start: [...dateParts(session.date), Math.floor(session.startMin / 60), session.startMin % 60],
    duration: { minutes: session.endMin - session.startMin },
    categories: ['Stundenplan'],
    status: 'CONFIRMED',
    busyStatus: 'BUSY',
  }
}

/**
 * Makes UIDs unique within one file. Two tasks can share an ID today
 * (same title + deadline, see roadmap B1); a repeated UID inside one file
 * would make calendars drop one of them.
 */
export function ensureUniqueUids(events) {
  const seen = new Map()
  return events.map((e) => {
    const count = seen.get(e.uid) || 0
    seen.set(e.uid, count + 1)
    return count === 0 ? e : { ...e, uid: e.uid.replace('@', `-${count + 1}@`) }
  })
}

/** Builds the .ics text. Resolves with the string, rejects with the ics error. */
export async function buildIcs(events) {
  // Loaded on demand: the library (with its dependencies) is only needed when
  // exporting, so it stays out of the main bundle
  const { createEvents } = await import('ics')
  return new Promise((resolve, reject) => {
    createEvents(ensureUniqueUids(events), (error, value) => (error ? reject(error) : resolve(value)))
  })
}

/** Triggers a browser download of .ics text. */
export function downloadIcs(text, filename) {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
