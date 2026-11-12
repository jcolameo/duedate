import { PhGraduationCap, PhBriefcase, PhHouse } from '@phosphor-icons/vue'

/** Color (DESIGN.md §4) and icon per area; the label comes from the locale. */
export const AREA_META = {
  study: { tone: 'blue', icon: PhGraduationCap },
  freelance: { tone: 'green', icon: PhBriefcase },
  personal: { tone: 'yellow', icon: PhHouse },
}

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

/** Class for a deadline chip: area color, or red when overdue. */
export function deadlineClass(task) {
  if (task._statusCode === 'overdue') return OVERDUE_DEADLINE_CLASS
  return (AREA_EVENT_CLASSES[task._area] || AREA_EVENT_CLASSES.study).deadline
}

export function sessionClass(session) {
  return (AREA_EVENT_CLASSES[session.area] || AREA_EVENT_CLASSES.study).session
}
