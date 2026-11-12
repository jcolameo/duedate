<script setup>
import { ref, watch, onMounted, useId } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'

/**
 * Modal dialog built on the native <dialog> element: focus is trapped,
 * Esc closes it, the page behind becomes inert and focus returns to the
 * opener — all handled by the browser.
 */
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  /** 'center' = modal dialog, 'right' = full-height side panel (drawer) */
  placement: { type: String, default: 'center', validator: v => ['center', 'right'].includes(v) },
})

const { t } = useLocale()

const open = defineModel('open', { type: Boolean, default: false })
const dialogEl = ref(null)
const titleId = `dlg-${useId()}`
const descId = `${titleId}-desc`

function sync(isOpen) {
  const el = dialogEl.value
  if (!el) return
  if (isOpen && !el.open) el.showModal()
  if (!isOpen && el.open) el.close()
}

watch(open, sync)
onMounted(() => sync(open.value))

// Esc or form[method=dialog] closes natively — keep v-model in sync
function onClose() {
  open.value = false
}

// Click on the backdrop (the dialog element itself, outside the panel) closes
function onClick(e) {
  if (e.target === dialogEl.value) open.value = false
}
</script>

<template>
  <dialog
    ref="dialogEl"
    :aria-labelledby="titleId"
    :aria-describedby="props.description ? descId : undefined"
    :class="[
      'dd-dialog bg-surface p-0 text-ink',
      placement === 'right'
        ? 'dd-drawer m-0 ml-auto h-dvh max-h-dvh w-[min(30rem,100vw)] border-l border-line'
        : 'm-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border border-line',
    ]"
    @close="onClose"
    @click="onClick"
  >
    <div :class="placement === 'right' ? 'flex h-full flex-col' : 'p-6'">
      <div :class="placement === 'right' ? 'flex-1 overflow-y-auto p-6' : ''">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 :id="titleId" class="text-lg font-semibold text-ink">{{ title }}</h2>
            <p v-if="description" :id="descId" class="mt-1 text-sm text-ink-muted">{{ description }}</p>
          </div>
          <button
            type="button"
            class="-mr-2 -mt-1 flex size-8 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
            :aria-label="t('ui.close')"
            @click="open = false"
          >
            <PhX class="size-4" aria-hidden="true" />
          </button>
        </div>
        <div class="mt-5">
          <slot />
        </div>
      </div>
      <div
        v-if="$slots.actions"
        :class="['flex justify-end gap-2', placement === 'right' ? 'border-t border-line px-6 py-4' : 'mt-6']"
      >
        <slot name="actions" />
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.dd-dialog::backdrop {
  background: rgb(0 0 0 / 0.45);
}
.dd-dialog[open] {
  animation: dd-dialog-in 180ms var(--ease-out-soft);
}
.dd-drawer[open] {
  animation: dd-drawer-in 220ms var(--ease-out-soft);
}
@keyframes dd-drawer-in {
  from {
    transform: translateX(24px);
    opacity: 0;
  }
}
@keyframes dd-dialog-in {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.98);
  }
}
</style>
