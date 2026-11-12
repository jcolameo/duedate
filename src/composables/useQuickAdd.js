import { ref } from 'vue'

/** Open state of the quick capture dialog, shared by shortcut, sidebar and views. */
const isOpen = ref(false)

export function useQuickAdd() {
  return {
    isOpen,
    open: () => { isOpen.value = true },
    close: () => { isOpen.value = false },
  }
}

/** True if a key press should not trigger global shortcuts (user is typing). */
export function isTypingTarget(target) {
  if (!target || !(target instanceof Element)) return false
  if (target.isContentEditable) return true
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
}
