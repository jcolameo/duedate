<script setup>
import { computed } from 'vue'
import { PhCircleNotch } from '@phosphor-icons/vue'

const props = defineProps({
  /** primary = the one main action per screen; secondary / ghost for the rest */
  variant: { type: String, default: 'secondary', validator: v => ['primary', 'secondary', 'ghost', 'danger'].includes(v) },
  size: { type: String, default: 'md', validator: v => ['sm', 'md'].includes(v) },
  /** Optional Phosphor icon component shown before the label */
  icon: { type: [Object, Function], default: null },
  /** Icon-only button: label becomes aria-label, text is hidden */
  iconOnly: { type: Boolean, default: false },
  label: { type: String, default: '' },
  type: { type: String, default: 'button' },
  disabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  /** Render as another element/component, e.g. RouterLink */
  as: { type: [String, Object], default: 'button' },
})

const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-surface-muted',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-muted',
  danger: 'text-red-ink hover:bg-red-soft',
}

const SIZES = {
  md: (iconOnly) => (iconOnly ? 'size-9' : 'h-9 px-4 text-sm'),
  sm: (iconOnly) => (iconOnly ? 'size-7' : 'h-7 px-2.5 text-[13px]'),
}

const classes = computed(() => [
  'inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none',
  'transition-[background-color,color,transform] duration-150 ease-out-soft active:scale-[0.98]',
  'disabled:opacity-50 disabled:pointer-events-none aria-disabled:opacity-50 aria-disabled:pointer-events-none',
  VARIANTS[props.variant],
  SIZES[props.size](props.iconOnly),
])

const isNativeButton = computed(() => props.as === 'button')
</script>

<template>
  <component
    :is="as"
    :type="isNativeButton ? type : undefined"
    :disabled="isNativeButton ? disabled || loading : undefined"
    :aria-disabled="!isNativeButton && (disabled || loading) ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :aria-label="iconOnly ? label : undefined"
    :title="iconOnly ? label : undefined"
    :class="classes"
  >
    <PhCircleNotch v-if="loading" class="size-4 animate-spin" aria-hidden="true" />
    <component :is="icon" v-else-if="icon" class="size-4 shrink-0" aria-hidden="true" />
    <span v-if="!iconOnly"><slot>{{ label }}</slot></span>
  </component>
</template>
