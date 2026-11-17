<script setup>
/**
 * BaseTag: a small rounded pill with uppercase text and an optional icon,
 * in grey or one of four soft colors.
 *
 * Used by: src/components/ui/AreaTag.vue and src/components/ui/DueBadge.vue
 * in this folder, and src/views/DesignView.vue:16 (style guide).
 *
 * Props: `tone` (color) and `icon` (optional icon component). Events: none.
 * The text goes in the default slot.
 *
 * In the background: nothing. One lookup table from tone to classes.
 *
 * Why it is built this way: all pills share size, letter spacing and shape;
 * only the color changes, and the icon keeps the meaning readable for people
 * who cannot tell the colors apart.
 *
 * How to read this file: props, the TONES table, then the short template.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters. Only the template reads them, hence no `const props`.
 * - tone: 'neutral' or one of the semantic pastels red/blue/green/yellow (DESIGN.md §4)
 * - icon: optional Phosphor icon component; keeps meaning readable without color
 */
defineProps({
  tone: { type: String, default: 'neutral', validator: v => ['neutral', 'red', 'blue', 'green', 'yellow'].includes(v) },
  icon: { type: [Object, Function], default: null },
})

// tone -> background and text color. Full class names, so Tailwind finds them
// when it scans the source.
const TONES = {
  neutral: 'bg-surface-muted text-ink-muted',
  red: 'bg-red-soft text-red-ink',
  blue: 'bg-blue-soft text-blue-ink',
  green: 'bg-green-soft text-green-ink',
  yellow: 'bg-yellow-soft text-yellow-ink',
}

// Template notes: `<component :is="icon" v-if="icon">` renders the icon
// component held in the prop, like `const Icon = icon; <Icon />` in React,
// and only when one was given. `<slot />` is where the text goes, like
// `props.children`.
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase leading-4 tracking-[0.05em] whitespace-nowrap',
      TONES[tone],
    ]"
  >
    <component :is="icon" v-if="icon" class="size-3" aria-hidden="true" />
    <slot />
  </span>
</template>
