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
