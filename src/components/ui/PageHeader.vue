<script setup>
/**
 * PageHeader: the big title block at the top of every screen, with an
 * optional small line above it, a short description and room for buttons.
 *
 * Used by: src/views/HomeView.vue:186, src/views/DeadlinesView.vue:77,
 * src/views/CalendarView.vue:124, src/views/StundenplanView.vue:111,
 * src/views/SettingsView.vue:27, src/views/DesignView.vue:64.
 *
 * Props: `title`, `accent`, `eyebrow`, `description`. Events: none.
 * Slot `actions`: the one primary action of the screen, e.g. "New task".
 *
 * In the background: nothing. Pure display.
 *
 * Why it is built this way: all screens share one title style (DESIGN.md §5):
 * mono eyebrow, bold display title with an optional accent-colored trailing
 * character ("?", "."), short description.
 *
 * How to read this file: the props, then the template: left column (eyebrow,
 * title, description), right column (actions slot).
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - title: the page title, rendered as the page's only <h1>
 * - accent: trailing character in accent color, e.g. "?" or "."
 * - eyebrow: small mono line above the title, e.g. "MI 11.11. · KW 46"
 * - description: one short sentence under the title
 */
defineProps({
  title: { type: String, required: true },
  accent: { type: String, default: '' },
  eyebrow: { type: String, default: '' },
  description: { type: String, default: '' },
})

// Template notes: `$slots.actions` is true when the parent filled the named
// slot `<template #actions>`; only then the right column is drawn.
// `<slot name="actions" />` is like a second, named `props.children`.
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-6">
    <div class="min-w-0">
      <p v-if="eyebrow" class="font-mono text-[12px] uppercase tracking-[0.04em] text-ink-muted">{{ eyebrow }}</p>
      <h1 class="mt-2 font-display text-[44px] font-extrabold leading-[0.95] tracking-[-0.04em] text-ink sm:text-[56px]">
        {{ title }}<span v-if="accent" class="text-blue-ink">{{ accent }}</span>
      </h1>
      <p v-if="description" class="mt-3 max-w-xl text-[15px] text-ink-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
