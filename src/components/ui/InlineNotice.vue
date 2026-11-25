<script setup>
/**
 * InlineNotice: a colored message box inside a page, e.g. an import warning,
 * an export error or a tip.
 *
 * Used by: src/views/DeadlinesView.vue:118 and :119, src/views/HomeView.vue:418,
 * src/views/CalendarView.vue:168, src/views/StundenplanView.vue:232 and :234,
 * src/components/DataSettings.vue:130, src/components/ColumnMappingConfirm.vue:48.
 *
 * Props: `tone` (neutral, success, warning, error). Events: none. The
 * message text goes in the default slot.
 *
 * In the background: nothing. One lookup table from tone to icon and colors.
 *
 * Why it is built this way: unlike a toast, the notice stays on the page
 * next to what it is about. Errors use role="alert", so screen readers read
 * them at once; everything else is a polite role="status".
 *
 * How to read this file: the prop, the STYLE table, `s`, then the template.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { computed } from 'vue'
import { PhCheckCircle, PhWarning, PhWarningCircle, PhInfo } from '@phosphor-icons/vue'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - tone: 'neutral' | 'success' | 'warning' | 'error'; picks icon, colors
 *   and the ARIA role
 */
const props = defineProps({
  tone: { type: String, default: 'neutral', validator: v => ['neutral', 'success', 'warning', 'error'].includes(v) },
})

// tone -> icon component, classes for the box (`box`) and for the icon
// (`icon_`, with a trailing underscore because `icon` is already taken).
const STYLE = {
  neutral: { icon: PhInfo, box: 'bg-surface-muted text-ink', icon_: 'text-ink-muted' },
  success: { icon: PhCheckCircle, box: 'bg-green-soft text-ink', icon_: 'text-green-ink' },
  warning: { icon: PhWarning, box: 'bg-yellow-soft text-ink', icon_: 'text-yellow-ink' },
  error: { icon: PhWarningCircle, box: 'bg-red-soft text-ink', icon_: 'text-red-ink' },
}
// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes. `s` is the style entry for the current tone.
const s = computed(() => STYLE[props.tone])

// Template notes: `<component :is="s.icon">` renders the icon component held
// in the table, like `const Icon = s.icon; <Icon />` in React. `<slot />` is
// where the message goes, like `props.children`. `min-w-0` lets long text
// wrap instead of pushing the box wider.
</script>

<template>
  <div
    :role="tone === 'error' ? 'alert' : 'status'"
    :class="['flex items-start gap-3 rounded-lg px-4 py-3 text-sm', s.box]"
  >
    <component :is="s.icon" :class="['mt-0.5 size-4 shrink-0', s.icon_]" aria-hidden="true" />
    <div class="min-w-0 flex-1"><slot /></div>
  </div>
</template>
