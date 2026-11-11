import { ref, watchEffect } from 'vue'
import { WEEKDAYS, normalizeBlocks, sortDays } from '../utils/availability.js'

export { WEEKDAYS }

const STORAGE_KEY = 'duedate.availability.v1'

/**
 * Recurring weekly busy blocks ("Arbeit, Mo–Do, 08:00–17:00").
 * Shared module-level singleton, persisted to localStorage.
 *
 * Data model (since A6): { id, label, days: ['Mon', …], startTime, endTime }.
 * Blocks saved before A6 had a single `day`; they are migrated on load by
 * normalizeBlocks() and written back in the new shape. Same storage key,
 * because the migration is lossless and backwards-safe.
 */
function loadSavedBlocks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? normalizeBlocks(JSON.parse(saved)) : []
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

function addBlock({ label, days, startTime, endTime }) {
  blocks.value = [
    ...blocks.value,
    { id: `b${Date.now()}`, label, days: sortDays(days), startTime, endTime },
  ]
}

function removeBlock(id) {
  blocks.value = blocks.value.filter(b => b.id !== id)
}

/** Re-adds a removed block (undo) at its previous position. */
function restoreBlock(block, index) {
  const next = [...blocks.value]
  next.splice(Math.min(index, next.length), 0, block)
  blocks.value = next
}

export function useAvailability() {
  return { blocks, addBlock, removeBlock, restoreBlock }
}
