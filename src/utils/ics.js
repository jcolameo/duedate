/**
 * Shared calendar (.ics) building for all exports.
 *
 * Every event gets a stable UID derived from the task ID. Calendars treat an
 * imported event with a known UID as the same event (update) instead of
 * adding a duplicate, so exporting and importing again is safe.
 */

const UID_DOMAIN = 'duedate.app'

/**
 * Reminders for deadline events (C6). A deadline is an all-day event, so the
 * triggers count from 00:00 local time on the due date: 6 h before = 18:00 the
 * day before, 8 h after = 08:00 on the due date. Relative triggers follow the
 * calendar's local time, also across daylight saving changes.
 * C6b will turn these into settings with these values as defaults.
 */
export const DEADLINE_REMINDER_TRIGGERS = Object.freeze([
  Object.freeze({ hours: 6, before: true }),
  Object.freeze({ hours: 8, before: false }),
])

function dateParts(d) {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
}

/**
 * All-day event on the deadline date.
 * withReminders: adds the two DEADLINE_REMINDER_TRIGGERS as display alarms
 * (only the Deadlines export uses it; the combined export stays without).
 */
export function buildDeadlineEvent(task, { untitled = '', withDescription = true, withReminders = false } = {}) {
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
  if (withReminders) {
    // Own trigger objects per event, so no export can change the shared constant
    event.alarms = DEADLINE_REMINDER_TRIGGERS.map(trigger => ({
      action: 'display',
      description: event.title,
      trigger: { ...trigger },
    }))
  }
  return event
}

/**
 * Timed work session from the plan. The UID is per task and session number, so
 * re-exporting a regenerated plan moves the existing calendar entry instead of
 * adding a second one.
 */
export function buildSessionEvent(session) {
  // A task can have many sessions (B8). Session number n gets its own UID, so an
  // export after re-planning moves/updates "session 3" instead of piling up
  // duplicates. Session 1 keeps the UID from before B8.
  const suffix = session.n > 1 ? `-${session.n}` : ''
  const part = session.of > 1 ? ` (${session.n}/${session.of})` : ''
  return {
    uid: `session-${session.taskId}${suffix}@${UID_DOMAIN}`,
    title: `📊 ${session.title}${part}`,
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
