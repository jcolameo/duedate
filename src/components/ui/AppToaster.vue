<script setup>
import { PhCheckCircle, PhWarningCircle, PhInfo, PhX } from '@phosphor-icons/vue'
import { useToast } from '../../composables/useToast.js'
import { useLocale } from '../../composables/useLocale.js'

const { toasts, dismiss, runAction } = useToast()
const { t } = useLocale()

const ICONS = { success: PhCheckCircle, error: PhWarningCircle, neutral: PhInfo }
const ICON_COLOR = { success: 'text-green-ink', error: 'text-red-ink', neutral: 'text-ink-muted' }
</script>

<template>
  <!-- Polite live region: screen readers announce new toasts without interrupting -->
  <div
    aria-live="polite"
    aria-relevant="additions"
    class="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
  >
    <TransitionGroup name="dd-toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        :role="toast.tone === 'error' ? 'alert' : 'status'"
        class="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3 text-sm text-ink shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
      >
        <component :is="ICONS[toast.tone]" :class="['size-4 shrink-0', ICON_COLOR[toast.tone]]" aria-hidden="true" />
        <p class="flex-1">{{ toast.message }}</p>
        <button
          v-if="toast.action"
          type="button"
          class="rounded-md px-2 py-1 font-medium text-ink underline-offset-4 hover:underline"
          @click="runAction(toast)"
        >
          {{ toast.action.label }}
        </button>
        <button
          type="button"
          class="-mr-1 flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
          :aria-label="t('ui.dismissToast')"
          @click="dismiss(toast.id)"
        >
          <PhX class="size-3.5" aria-hidden="true" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.dd-toast-enter-active,
.dd-toast-leave-active {
  transition: opacity 180ms var(--ease-out-soft), transform 180ms var(--ease-out-soft);
}
.dd-toast-enter-from,
.dd-toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
