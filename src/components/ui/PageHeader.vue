<script setup>
/**
 * Page title block (DESIGN.md §5): mono eyebrow, bold display title with an
 * optional accent-colored trailing character ("?", "."), short description
 * and an actions slot for the one primary action of the screen.
 */
defineProps({
  title: { type: String, required: true },
  /** Trailing character in accent color, e.g. "?" or "." */
  accent: { type: String, default: '' },
  /** Small mono line above the title, e.g. "MI 11.11. · KW 46" */
  eyebrow: { type: String, default: '' },
  description: { type: String, default: '' },
})
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
