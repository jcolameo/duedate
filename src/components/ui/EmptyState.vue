<script setup>
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  /** One sentence: why it is empty and what to do (DESIGN.md §6) */
  description: { type: String, default: '' },
})
</script>

<template>
  <div class="flex flex-col items-center gap-3 rounded-xl border border-line bg-surface px-6 py-12 text-center">
    <span v-if="icon" class="flex size-10 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
      <component :is="icon" class="size-5" aria-hidden="true" />
    </span>
    <div class="max-w-sm">
      <p class="font-medium text-ink">{{ title }}</p>
      <p v-if="description" class="mt-1 text-sm text-ink-muted">{{ description }}</p>
    </div>
    <div v-if="$slots.default" class="mt-2">
      <slot />
    </div>
  </div>
</template>
