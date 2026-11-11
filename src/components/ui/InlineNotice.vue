<script setup>
import { computed } from 'vue'
import { PhCheckCircle, PhWarning, PhWarningCircle, PhInfo } from '@phosphor-icons/vue'

/** Inline message inside a page, e.g. import warnings or errors. */
const props = defineProps({
  tone: { type: String, default: 'neutral', validator: v => ['neutral', 'success', 'warning', 'error'].includes(v) },
})

const STYLE = {
  neutral: { icon: PhInfo, box: 'bg-surface-muted text-ink', icon_: 'text-ink-muted' },
  success: { icon: PhCheckCircle, box: 'bg-green-soft text-ink', icon_: 'text-green-ink' },
  warning: { icon: PhWarning, box: 'bg-yellow-soft text-ink', icon_: 'text-yellow-ink' },
  error: { icon: PhWarningCircle, box: 'bg-red-soft text-ink', icon_: 'text-red-ink' },
}
const s = computed(() => STYLE[props.tone])
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
