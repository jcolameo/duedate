/**
 * areaMeta: color, icon and CSS classes for the three areas of life
 * (Studium blue, Freelance green, Privat yellow). No component, just tables.
 *
 * Used by: AreaSelect.vue and AreaTag.vue in this folder,
 * src/components/AreaFilter.vue:6, src/components/QuickAdd.vue:15,
 * src/components/TaskDetail.vue:14, src/components/WeekGrid.vue:7,
 * src/components/calendar/MonthGrid.vue:9, src/components/calendar/YearGrid.vue:6,
 * src/views/CalendarView.vue:19.
 *
 * In: area keys ('study', 'freelance', 'personal'). Out: Tailwind class
 * strings and icon components. The visible area names come from the locale
 * files, not from here.
 *
 * In the background: nothing. Constants plus two small lookup functions.
 *
 * Why the class names are written out in full: Tailwind finds classes by
 * scanning the source text, so a class built at runtime like
 * `'bg-' + tone + '-soft'` would never be generated.
 *
 * How to read this file: AREA_META first (tone + icon per area), then the
 * class tables, then the two functions at the bottom used by the calendar.
 */
import { PhGraduationCap, PhBriefcase, PhHouse } from '@phosphor-icons/vue'

/** Color (DESIGN.md §4) and icon per area; the label comes from the locale. */
export const AREA_META = {
  study: { tone: 'blue', icon: PhGraduationCap },
  freelance: { tone: 'green', icon: PhBriefcase },
  personal: { tone: 'yellow', icon: PhHouse },
}

/** Pill colors per tone, used by AreaSelect.vue (AreaTag goes through BaseTag). */
export const AREA_TONE_CLASSES = {
  blue: 'bg-blue-soft text-blue-ink',
  green: 'bg-green-soft text-green-ink',
  yellow: 'bg-yellow-soft text-yellow-ink',
}

/**
 * Calendar entries are colored by area (Studium blue, Freelance green,
 * Privat yellow). Full class names, so Tailwind finds them.
 * - session: soft fill with a colored edge (work time)
 * - deadline: solid fill (something is due)
 * - swatch / dot: small marks for legends and the year view
 * - heat: year view cell by how busy a day is, index 0 (nothing, no class)
 *   up to 3 (busiest, solid fill)
 */
export const AREA_EVENT_CLASSES = {
  study: {
    session: 'border-blue-ink bg-blue-soft text-blue-ink',
    deadline: 'bg-blue-ink text-surface',
    swatch: 'bg-blue-ink',
    heat: ['', 'bg-blue-soft text-blue-ink', 'bg-blue-soft text-blue-ink ring-1 ring-inset ring-blue-ink/60', 'bg-blue-ink text-surface font-semibold'],
  },
  freelance: {
    session: 'border-green-ink bg-green-soft text-green-ink',
    deadline: 'bg-green-ink text-surface',
    swatch: 'bg-green-ink',
    heat: ['', 'bg-green-soft text-green-ink', 'bg-green-soft text-green-ink ring-1 ring-inset ring-green-ink/60', 'bg-green-ink text-surface font-semibold'],
  },
  personal: {
    session: 'border-yellow-ink bg-yellow-soft text-yellow-ink',
    deadline: 'bg-yellow-ink text-surface',
    swatch: 'bg-yellow-ink',
    heat: ['', 'bg-yellow-soft text-yellow-ink', 'bg-yellow-soft text-yellow-ink ring-1 ring-inset ring-yellow-ink/60', 'bg-yellow-ink text-surface font-semibold'],
  },
}

/** Overdue deadlines are red whatever the area (red = needs attention, DESIGN.md). */
export const OVERDUE_DEADLINE_CLASS = 'bg-red-ink text-surface'

/**
 * Class for a deadline chip: area color, or red when overdue.
 *
 * @param {{ _statusCode?: string, _area?: string }} task an enriched task
 *   (the `_` fields are added by src/utils/taskModel.js)
 * @returns {string} Tailwind classes for the chip
 */
export function deadlineClass(task) {
  // Overdue wins over the area color, so late work stands out in any area.
  if (task._statusCode === 'overdue') return OVERDUE_DEADLINE_CLASS
  // Unknown or missing area: fall back to the study colors instead of
  // returning undefined, which would leave the chip without any color.
  return (AREA_EVENT_CLASSES[task._area] || AREA_EVENT_CLASSES.study).deadline
}

/**
 * Class for a planned work session in the calendar, by area.
 *
 * @param {{ area?: string }} session a planned session (note: `area`, not `_area`)
 * @returns {string} Tailwind classes for the session block
 */
export function sessionClass(session) {
  // Same fallback as in deadlineClass: unknown area -> study colors.
  return (AREA_EVENT_CLASSES[session.area] || AREA_EVENT_CLASSES.study).session
}
