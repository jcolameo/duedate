/**
 * tagColors: the eight colors a user tag can have, as Tailwind classes.
 * No component, just two tables with the same keys.
 *
 * Used by: TagChip.vue in this folder (TAG_COLOR_CLASSES) and
 * src/components/TagMenu.vue:8 (both tables: chip preview and color picker).
 *
 * In: a color key stored on the tag ('gray', 'blue' ... 'teal'). Out: class
 * strings. The tokens behind the classes are defined in src/style.css.
 *
 * In the background: nothing. Plain constants.
 *
 * Why the class names are written out in full: Tailwind finds classes by
 * scanning the source text, so a class built at runtime like
 * `'bg-' + color + '-soft'` would never be generated.
 *
 * How to read this file: the first table colors the chip itself, the second
 * one draws the round color dots in the tag menu. Both must list the same keys.
 */

/** Classes per tag color (tokens in style.css, all pairs WCAG AA checked). */
export const TAG_COLOR_CLASSES = {
  gray: 'bg-surface-muted text-ink-muted',
  blue: 'bg-blue-soft text-blue-ink',
  green: 'bg-green-soft text-green-ink',
  yellow: 'bg-yellow-soft text-yellow-ink',
  orange: 'bg-orange-soft text-orange-ink',
  purple: 'bg-purple-soft text-purple-ink',
  pink: 'bg-pink-soft text-pink-ink',
  teal: 'bg-teal-soft text-teal-ink',
}

/** Solid swatch for the color picker. */
export const TAG_SWATCH_CLASSES = {
  gray: 'bg-ink-muted',
  blue: 'bg-blue-ink',
  green: 'bg-green-ink',
  yellow: 'bg-yellow-ink',
  orange: 'bg-orange-ink',
  purple: 'bg-purple-ink',
  pink: 'bg-pink-ink',
  teal: 'bg-teal-ink',
}
