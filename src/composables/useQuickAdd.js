/**
 * useQuickAdd: whether the "New task" dialog is open, plus a helper that
 * tells keyboard shortcuts to stay quiet while the user is typing.
 *
 * Called by: src/App.vue:18 (shortcut "n" opens the dialog) and
 * src/App.vue:57 (`isTypingTarget`), src/components/AppSidebar.vue:14 (the
 * "+" button), src/views/HomeView.vue:42, src/components/QuickAdd.vue:35
 * (the dialog itself reads and closes `isOpen`).
 *
 * In: nothing. Out: `{ isOpen, open, close }`. `isTypingTarget(element)` is a
 * separate export.
 *
 * In the background: nothing is stored; the dialog starts closed after every
 * reload.
 *
 * Why module level: `isOpen` exists once, so the sidebar button, the shortcut
 * and the dialog component all talk about the same dialog.
 *
 * How to read this file: two parts that only share a topic. The ref with its
 * open/close functions, and `isTypingTarget`, which is a plain DOM check.
 */
import { ref } from 'vue'

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one flag for the whole app.
/** Open state of the quick capture dialog, shared by shortcut, sidebar and views. */
const isOpen = ref(false)

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ isOpen: import('vue').Ref<boolean>, open: () => void, close: () => void }}
 */
export function useQuickAdd() {
  return {
    isOpen,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
  }
}

/**
 * True if a key press should not trigger global shortcuts (user is typing).
 *
 * @param {EventTarget|null} target `event.target` of the key event
 * @returns {boolean} true inside inputs, text areas, selects and editable areas
 */
export function isTypingTarget(target) {
  // Key events on the window or document have no element as target.
  if (!target || !(target instanceof Element)) return false
  // Rich text editors use contenteditable instead of an <input>.
  if (target.isContentEditable) return true
  // closest() also finds a matching parent, e.g. a <span> inside an editor.
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}
