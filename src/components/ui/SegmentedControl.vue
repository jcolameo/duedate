<script setup>
/**
 * Small set of mutually exclusive options (theme, language, priority, effort).
 * Implemented as a labelled group of toggle buttons with aria-pressed, which
 * works with Tab + Enter/Space and is announced correctly by screen readers.
 */
defineProps({
  /** Accessible name of the group */
  label: { type: String, required: true },
  /** [{ value, label, icon? }] */
  options: { type: Array, required: true },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
  /** Use the mono font for option labels (e.g. durations like "2h") */
  mono: { type: Boolean, default: false },
})

const model = defineModel({ type: [String, Number, null], default: null })
</script>

<template>
  <div role="group" :aria-label="label" class="inline-flex gap-0.5 rounded-lg border border-line bg-surface-muted p-0.5">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      :aria-pressed="model === opt.value"
      :class="[
        'inline-flex items-center gap-1.5 rounded-md transition-colors duration-150',
        size === 'sm' ? 'h-6 px-2 text-[12px]' : 'h-7 px-3 text-[13px]',
        mono && 'font-mono',
        model === opt.value
          ? 'bg-surface text-ink font-medium shadow-[0_1px_2px_rgba(0,0,0,0.06)]'
          : 'text-ink-muted hover:text-ink',
      ]"
      @click="model = opt.value"
    >
      <component :is="opt.icon" v-if="opt.icon" class="size-3.5" aria-hidden="true" />
      {{ opt.label }}
    </button>
  </div>
</template>
