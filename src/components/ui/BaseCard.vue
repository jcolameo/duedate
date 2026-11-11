<script setup>
defineProps({
  as: { type: String, default: 'div' },
  padding: { type: String, default: 'md', validator: v => ['none', 'sm', 'md', 'lg'].includes(v) },
  /** Subtle lift on hover for clickable cards (DESIGN.md §7) */
  interactive: { type: Boolean, default: false },
})

const PADDING = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }
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
