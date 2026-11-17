<script setup>
/**
 * BaseButton: the one button of the app, in four looks (primary, secondary,
 * ghost, danger) and two sizes, optionally with an icon or a spinner.
 *
 * Used by: almost every screen, e.g. src/views/HomeView.vue:10,
 * src/views/DeadlinesView.vue:12, src/components/TaskDetail.vue:16,
 * src/components/QuickAdd.vue:19, src/components/DataSettings.vue:11.
 *
 * Props: see the block above `defineProps`. Events: none declared; a parent's
 * `@click` lands on the root element by itself, like `...rest` in React.
 *
 * In the background: nothing. Two `computed` values build the CSS classes and
 * decide whether the root is a real <button>.
 *
 * Why it is built this way: the `as` prop lets the same look render as a
 * RouterLink or <a>, so links and buttons stay visually identical.
 *
 * How to read this file: props, then the two lookup tables VARIANTS and SIZES,
 * then `classes`, then the template, where `isNativeButton` decides which
 * attributes the root element gets.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed } from 'vue'
import { PhCircleNotch } from '@phosphor-icons/vue'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters. `validator` only warns in development.
 * - variant: 'primary' = the one main action per screen; 'secondary',
 *   'ghost' or 'danger' for the rest
 * - size: 'md' (default) or 'sm'
 * - icon: optional Phosphor icon component shown before the label
 * - iconOnly: icon-only button; `label` becomes aria-label and tooltip, the
 *   text is hidden
 * - label: button text, used when no slot content is given
 * - type: native button type ('button', 'submit', 'reset'); only on <button>
 * - disabled: greys the button out and blocks clicks
 * - loading: shows a spinner instead of the icon and blocks clicks
 * - as: render as another element or component, e.g. RouterLink or 'a'
 */
const props = defineProps({
  variant: { type: String, default: 'secondary', validator: v => ['primary', 'secondary', 'ghost', 'danger'].includes(v) },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
  icon: { type: [Object, Function], default: null },
  iconOnly: { type: Boolean, default: false },
  label: { type: String, default: '' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  as: { type: [String, Object], default: 'button' },
})

// variant -> Tailwind classes for colors and hover state.
const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-muted',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-muted',
  danger: 'text-red-ink hover:bg-red-soft',
}

// size -> function, because an icon-only button is a square ('size-9') while
// a button with text gets a height and horizontal padding instead.
// HINWEIS: An unknown `size` makes SIZES[size] undefined and calling it throws
// a TypeError; the validator above only prints a warning in development.
const SIZES = {
  md: (iconOnly) => (iconOnly ? 'size-9' : 'h-9 px-4 text-sm'),
  sm: (iconOnly) => (iconOnly ? 'size-7' : 'h-7 px-2.5 text-[13px]'),
}

// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes. Vue accepts an array of class strings and
// joins them for you.
// The `aria-disabled:` classes cover links (`as` is not 'button'), which have
// no real `disabled` attribute and get `aria-disabled` instead.
const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none',
  'transition-[background-color,color,transform] duration-150 ease-out-soft active:scale-[0.98]',
  'disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none',
  VARIANTS[props.variant],
  SIZES[props.size](props.iconOnly),
])

// `type` and `disabled` only exist on a real <button>. On a link they would be
// wrong HTML, so the template leaves them out (undefined = attribute not set).
const isNativeButton = computed(() => props.as === 'button')

// Template notes for this file:
// - `<component :is="as">` renders whatever `as` holds: the string 'button',
//   'a', or a component like RouterLink. Like `const Tag = as; <Tag />` in React.
// - Binding an attribute to `undefined` removes it from the DOM.
//   HINWEIS: When `as` is a link and `disabled` is true, only `aria-disabled`
//   and `pointer-events-none` are set. The mouse cannot click it, but the link
//   stays in the Tab order and Enter still follows it.
// - `<slot>{{ label }}</slot>`: the slot is like `props.children` in React;
//   the text inside is the fallback when the parent passes no children.
// - `v-if` / `v-else-if` are `if` / `else if` for elements: spinner wins over
//   icon, and no icon is drawn when neither is set.
</script>

<template>
  <component
    :is="as"
    :type="isNativeButton ? type : undefined"
    :disabled="isNativeButton ? disabled || loading : undefined"
    :aria-disabled="!isNativeButton && (disabled || loading) ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-label="iconOnly ? label : undefined"
    :title="iconOnly ? label : undefined"
    :class="classes"
  >
    <PhCircleNotch v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" class="size-4 shrink-0" aria-hidden="true" />
    <span v-if="!iconOnly"><slot>{{ label }}</slot></span>
  </component>
</template>
