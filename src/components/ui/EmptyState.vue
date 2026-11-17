<script setup>
/**
 * EmptyState: the friendly box shown when a list has nothing in it yet,
 * e.g. "No tasks yet" with an icon, one sentence and maybe a button.
 *
 * Used by: src/views/HomeView.vue:194, :201, :313 and :385,
 * src/views/DeadlinesView.vue:176 and :179, src/views/StundenplanView.vue:117,
 * src/views/DesignView.vue:216.
 *
 * Props: `icon`, `title`, `description`. Events: none. The default slot
 * holds optional buttons, e.g. "Import CSV".
 *
 * In the background: nothing. Pure display.
 *
 * Why it is built this way: an empty screen should say why it is empty and
 * what to do next (DESIGN.md §6), always in the same layout.
 *
 * How to read this file: the props, then the template from top to bottom:
 * icon, title, description, slot.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - icon: optional Phosphor icon component shown in a grey square
 * - title: short headline, e.g. "Noch keine Aufgaben"
 * - description: one sentence, why it is empty and what to do (DESIGN.md §6)
 */
defineProps({
  icon: { type: [Object, Function], default: null },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})

// Template notes: `$slots.default` is true when the parent put something
// between the tags. Only then the button area is drawn, so an EmptyState
// without actions has no extra gap. `<slot />` is like `props.children`.
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
