import { ref } from 'vue'

/**
 * Global toast queue (module-level singleton like the other stores).
 * A toast can carry one action, e.g. "Rückgängig" for undo (DESIGN.md §6).
 */
const toasts = ref([])
let nextId = 1
const timers = new Map()

function dismiss(id) {
  clearTimeout(timers.get(id))
  timers.delete(id)
  toasts.value = toasts.value.filter(t => t.id !== id)
}

/**
 * @param {string} message
 * @param {{ tone?: 'neutral'|'success'|'error', action?: { label: string, onClick: () => void }, duration?: number }} [options]
 * @returns {number} toast id
 */
function show(message, { tone = 'neutral', action = null, duration = 5000 } = {}) {
  const id = nextId++
  toasts.value = [...toasts.value, { id, message, tone, action }]
  // Errors stay until dismissed so they can be read at any pace
  if (tone !== 'error' && duration > 0) {
    timers.set(id, setTimeout(() => dismiss(id), duration))
  }
  return id
}

function runAction(toast) {
  toast.action?.onClick()
  dismiss(toast.id)
}

export function useToast() {
  return { toasts, show, dismiss, runAction }
}
