<script setup>
/**
 * BaseDialog: a window over the page (centered) or a panel sliding in from
 * the right, with a title, a close button, content and optional buttons.
 *
 * Used by: src/components/QuickAdd.vue:153, src/components/TaskDetail.vue:167
 * (right-side panel), src/components/DataSettings.vue:168, :200 and :212,
 * src/views/DesignView.vue:233.
 *
 * Props: `title`, `description`, `placement` and `v-model:open` (open or
 * closed). Slots: default (content) and `actions` (buttons at the bottom).
 *
 * In the background: a `watch` on `open` calls `showModal()`/`close()` on the
 * native <dialog>. The browser then traps focus, closes on Esc, makes the page
 * behind inert and gives focus back to the opener. No timers, no Teleport.
 *
 * Why it is built this way: the native <dialog> already does the hard
 * accessibility work, so this file only keeps it in sync with `open`.
 *
 * How to read this file: start with the template, because the <dialog>
 * element carries the behaviour. Then `sync`, which turns `open` into
 * showModal/close, then `onClose` and `onClick`, which go the other way.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { ref, watch, onMounted, useId } from 'vue'
import { PhX } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - title: heading of the dialog, also its accessible name
 * - description: optional sentence under the title, read out after the name
 * - placement: 'center' = modal window, 'right' = full-height side panel (drawer)
 */
const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  placement: { type: String, default: 'center', validator: v => ['center', 'right'].includes(v) },
})

const { t } = useLocale()

// `defineModel('open')`: the parent writes `v-model:open="isOpen"`. That is
// two-way binding: the parent passes a value and a listener, the child emits
// the new value. Reading `open.value` gives the parent's value; assigning
// `open.value = false` sends `update:open` back to the parent.
const open = defineModel('open', { type: Boolean, default: false })
// `ref` on a DOM element: like `useRef` in React, but you read `.value`
// instead of `.current`. It is filled by `ref="dialogEl"` in the template.
const dialogEl = ref(null)
// `useId()`: like React's `useId`, a unique id per component instance, so
// two dialogs on the same page never share an id for aria-labelledby.
const titleId = `dlg-${useId()}`
const descId = `${titleId}-desc`

/**
 * Brings the native <dialog> in line with the wanted state.
 *
 * @param {boolean} isOpen whether the dialog should be open
 * @returns {void}
 * @sideeffect calls `showModal()` or `close()` on the <dialog> element
 */
function sync(isOpen) {
  const el = dialogEl.value
  // Before the first render the element does not exist yet; onMounted below
  // calls sync again once it does.
  if (!el) return
  // Only act when the element's state differs from the wanted one. Besides
  // saving work, showModal() on a dialog that is already open can throw an
  // InvalidStateError.
  if (isOpen && !el.open) el.showModal()
  if (!isOpen && el.open) el.close()
}

// `watch`: like `useEffect` with a dependency list, but it names the value it
// listens to. It runs `sync(newValue)` every time `open` changes.
watch(open, sync)
// `onMounted`: like `componentDidMount` in a React class component. Needed
// because the watch only fires on changes; a dialog that starts open
// (`v-model:open` already true) would otherwise never call showModal().
onMounted(() => sync(open.value))

/**
 * The browser closed the dialog by itself: the user pressed Esc, or a
 * `<form method="dialog">` inside was submitted. Keep v-model in sync so the
 * parent knows.
 *
 * @returns {void}
 * @sideeffect emits `update:open` with false
 */
function onClose() {
  open.value = false
}

/**
 * Closes the dialog when the user clicks on the dark backdrop.
 *
 * @param {MouseEvent} e the click event on the <dialog> element
 * @returns {void}
 * @sideeffect may emit `update:open` with false
 */
function onClick(e) {
  // The backdrop belongs to the <dialog> element itself, while all content
  // sits in inner <div>s. So "target is the dialog" means "outside the panel".
  // HINWEIS: If the user starts a text selection inside the panel and releases
  // the mouse over the backdrop, the browser reports the click on the <dialog>
  // and the dialog closes, even though nobody clicked the backdrop.
  if (e.target === dialogEl.value) open.value = false
}

// Template notes for this file:
// - `@close` and `@click` listen to native DOM events on <dialog>, like
//   `onClose`/`onClick` props in React.
// - `$slots.actions` is true when the parent filled the `actions` slot, so the
//   button row is only drawn when there are buttons. `<slot />` and
//   `<slot name="actions" />` are like `props.children` and a second,
//   named children prop.
// - For placement 'right' the inner layout becomes a column: the content
//   scrolls, the action bar stays fixed at the bottom.
// - The close button assigns `open = false` directly; in the template
//   `open` needs no `.value`.
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
/* `scoped`: these rules only reach elements of this component. */
/* ::backdrop is the dark layer the browser draws behind a modal <dialog>. */
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
