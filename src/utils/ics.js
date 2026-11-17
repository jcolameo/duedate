/**
 * Building the calendar files (.ics) for every export.
 *
 * Two kinds of events come out of here: an all-day event for a deadline and a
 * timed event for a planned work session. Both get a stable UID derived from the
 * task ID. A calendar treats an imported event with a known UID as the same
 * event and updates it instead of adding a duplicate, so exporting twice is safe.
 *
 * The `ics` library is loaded on demand in `buildIcs`, so it stays out of the
 * main bundle.
 */

const UID_DOMAIN = 'duedate.app'

/**
 * Reminders for deadline events (C6).
 *
 * A deadline is an all-day event, so the triggers count from 00:00 local time on
 * the due date: 6 h before is 18:00 the day before, 8 h after is 08:00 on the
 * due date. Relative triggers follow the calendar's local time, also across a
 * daylight saving change.
 *
 * C6b will turn these into settings, with these values as the defaults.
 */
export const DEADLINE_REMINDER_TRIGGERS = Object.freeze([
  Object.freeze({ hours: 6, before: true }),
  Object.freeze({ hours: 8, before: false }),
])

/** [year, month, day] as the ics library wants it. Month is 1-based there. */
function dateParts(d) {
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
}

/**
 * All-day event on the deadline date.
 *
 * @param {object} task - enriched task with `_id`, `_title`, `_deadlineDate`, ...
 * @param {object} [options]
 * @param {string} [options.untitled] - title to use when the task has none
 * @param {boolean} [options.withDescription] - include the description (cut at 500 chars)
 * @param {boolean} [options.withReminders] - add the two DEADLINE_REMINDER_TRIGGERS;
 *   only the Deadlines export uses it, the combined export stays without
 * @returns {object} event object for the ics library
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
    // Fresh trigger objects per event, so no export can change the shared constant.
    event.alarms = DEADLINE_REMINDER_TRIGGERS.map(trigger => ({
      action: 'display',
      description: event.title,
      trigger: { ...trigger },
    }))
  }

  return event
}

/**
 * Timed work session from the plan.
 *
 * The UID carries the session number, so re-exporting a regenerated plan moves
 * the existing calendar entry instead of adding a second one. Session 1 keeps
 * the UID it had before B8, which is why the suffix only starts at 2.
 *
 * @param {object} session - one entry from `plan.sessions`
 * @returns {object} event object for the ics library
 */
export function buildSessionEvent(session) {
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
 * Makes UIDs unique within one file.
 *
 * Two tasks can share an ID today (same title and deadline, see roadmap B1). A
 * repeated UID inside one file would make calendars drop one of the two, so the
 * second occurrence gets a counter appended.
 *
 * @param {object[]} events
 * @returns {object[]} new array, the input is not modified
 */
export function ensureUniqueUids(events) {
  const seen = new Map()
  return events.map((event) => {
    const count = seen.get(event.uid) || 0
    seen.set(event.uid, count + 1)
    return count === 0 ? event : { ...event, uid: event.uid.replace('@', `-${count + 1}@`) }
  })
}

/**
 * Builds the .ics text.
 *
 * @param {object[]} events
 * @returns {Promise<string>} resolves with the file text, rejects with the ics error
 */
export async function buildIcs(events) {
  // Loaded on demand: the library and its dependencies are only needed while
  // exporting, so they stay out of the main bundle.
  const { createEvents } = await import('ics')
  return new Promise((resolve, reject) => {
    createEvents(ensureUniqueUids(events), (error, value) => (error ? reject(error) : resolve(value)))
  })
}

/**
 * Hands the .ics text to the browser as a download.
 *
 * The object URL is revoked right after the click, otherwise the blob stays in
 * memory for the lifetime of the tab.
 *
 * @param {string} text
 * @param {string} filename
 */
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
