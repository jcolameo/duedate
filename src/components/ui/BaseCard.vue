<script setup>
/**
 * BaseCard: a white box with a thin border and rounded corners that groups
 * content on a page.
 *
 * Used by: src/views/HomeView.vue:9, src/views/DeadlinesView.vue:13,
 * src/views/StundenplanView.vue:20, src/views/SettingsView.vue:7,
 * src/views/DesignView.vue:13, src/components/DataSettings.vue:10,
 * src/components/ColumnMappingConfirm.vue:5.
 *
 * Props: `as` (which HTML tag), `padding` (none/sm/md/lg) and `interactive`
 * (soft shadow on hover). Events: none. Content goes in the default slot.
 *
 * In the background: nothing. No state, no script logic beyond one table.
 *
 * Why it is built this way: every card in the app should look the same, so
 * border, radius and padding live in one place instead of in every view.
 *
 * How to read this file: props, the PADDING table, then the template, which
 * is one dynamic element with three class parts.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters. No `const props =` because only the template
 * reads them, and the template sees props directly.
 * - as: HTML tag of the card, e.g. 'section' or 'li' (default 'div')
 * - padding: 'none' | 'sm' | 'md' | 'lg' inner spacing
 * - interactive: subtle lift on hover for clickable cards (DESIGN.md §7);
 *   it only changes the look, not the keyboard behaviour
 */
defineProps({
  as: { type: String, default: 'div' },
  padding: { type: String, default: 'md', validator: v => ['none', 'sm', 'md', 'lg'].includes(v) },
  interactive: { type: Boolean, default: false },
})

const PADDING = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

// Template notes: `<component :is="as">` renders the tag named in `as`, like
// `const Tag = as; <Tag />` in React. In the class array,
// `interactive && '...'` yields `false` when off, and Vue skips falsy entries.
// `<slot />` is where the parent's content goes, like `props.children`.
</script>

<template>
  <component
    :is="as"
    :class="[
      'bg-surface border border-line rounded-xl',
      PADDING[padding],
      interactive && 'transition-shadow duration-200 ease-out-soft hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
    ]"
  >
    <slot />
  </component>
</template>
