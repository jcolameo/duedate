import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'duedate.availability.v1'

export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Simple recurring weekly availability/unavailability blocks
 * (e.g. "Gym, Mon, 18:00-19:00"). Shared module-level singleton,
 * persisted to localStorage — same pattern as the other stores.
 */
function loadSavedBlocks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch (e) {
    console.warn('[Availability] LocalStorage read failed:', e)
    return []
  }
}

const blocks = ref(loadSavedBlocks())

watchEffect(() => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks.value))
  } catch (e) {
    console.warn('[Availability] LocalStorage write failed:', e)
  }
})

function addBlock({ label, day, startTime, endTime }) {
  blocks.value = [
    ...blocks.value,
    { id: `b${Date.now()}`, label, day, startTime, endTime },
  ]
}

function removeBlock(id) {
  blocks.value = blocks.value.filter(b => b.id !== id)
}

export function useAvailability() {
  return { blocks, addBlock, removeBlock }
}
