<script setup>
defineProps({
  /** neutral or one of the semantic pastels (DESIGN.md §4) */
  tone: { type: String, default: 'neutral', validator: v => ['neutral', 'red', 'blue', 'green', 'yellow'].includes(v) },
  /** Optional Phosphor icon — keeps meaning readable without color */
  icon: { type: [Object, Function], default: null },
})

const TONES = {
  neutral: 'bg-surface-muted text-ink-muted',
  red: 'bg-red-soft text-red-ink',
  blue: 'bg-blue-soft text-blue-ink',
  green: 'bg-green-soft text-green-ink',
  yellow: 'bg-yellow-soft text-yellow-ink',
}
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
