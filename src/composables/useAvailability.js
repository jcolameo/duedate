/**
 * useAvailability: the user's recurring busy times per week, for example
 * "Work, Mon to Thu, 08:00 to 17:00". The planner never puts work sessions
 * into these blocks.
 *
 * Called by: src/views/StundenplanView.vue:32 (add, remove, undo),
 * src/views/CalendarView.vue:36 (draws them in the week grid), and inside
 * this folder by usePlanState.js, usePlanEdit.js and useBackup.js.
 * WEEKDAYS is re-exported here for older imports.
 *
 * In: nothing. Out: `{ blocks, addBlock, removeBlock, restoreBlock }`.
 * `blocks` is a ref with an array of `{ id, label, days, startTime, endTime }`.
 *
 * In the background: a `watchEffect` writes the whole array to localStorage
 * under `duedate.availability.v1`, once at start and after every change.
 *
 * Why module level: `blocks` is created once at import, so the Stundenplan
 * page, the calendar and the planner all see the same list.
 *
 * How to read this file: `loadSavedBlocks()` first (it also migrates old
 * data), then the `watchEffect` that saves, then the three small actions.
 * The actions never touch localStorage; they replace `blocks.value`, and the
 * `watchEffect` notices that.
 */
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
 *
 * @returns {Array<object>} the saved blocks in the current shape, or []
 */
function loadSavedBlocks() {
  // Two things can fail here: the storage is blocked, or the saved text is
  // not valid JSON (edited by hand, cut off). Both cases start with no blocks.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? normalizeBlocks(JSON.parse(saved)) : []
  } catch (e) {
    console.warn('[Availability] LocalStorage read failed:', e)
    return []
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one list for the whole app.
const blocks = ref(loadSavedBlocks())

// `watchEffect` is like `watch` without a list of sources: it runs once right
// away and then again whenever anything it read inside (here `blocks.value`)
// changes. The first run is what writes migrated pre-A6 blocks back.
watchEffect(() => {
  // Saving may fail when the storage is full or blocked; the blocks stay in
  // memory for this session, they just will not survive a reload.
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks.value))
  } catch (e) {
    console.warn('[Availability] LocalStorage write failed:', e)
  }
})

/**
 * Adds a new busy block at the end of the list.
 *
 * @param {{ label: string, days: string[], startTime: string, endTime: string }} block
 *   the form values; `days` are codes like 'Mon', in any order
 * @sideeffect replaces `blocks.value`, which triggers the save above
 */
function addBlock({ label, days, startTime, endTime }) {
  // A new array instead of push(), so the change is a plain assignment that
  // every watcher sees, like setState with a fresh array in React.
  // HINWEIS: The id is only the current time in ms; two blocks added in the
  // same millisecond get the same id, and removeBlock would delete both.
  blocks.value = [
    ...blocks.value,
    { id: `b${Date.now()}`, label, days: sortDays(days), startTime, endTime },
  ]
}

/**
 * Removes the block with this id.
 *
 * @param {string} id block id
 * @sideeffect replaces `blocks.value`
 */
function removeBlock(id) {
  blocks.value = blocks.value.filter(b => b.id !== id)
}

/**
 * Re-adds a removed block (undo) at its previous position.
 *
 * @param {object} block the block that was removed
 * @param {number} index its old position in the list
 * @sideeffect replaces `blocks.value`
 */
function restoreBlock(block, index) {
  const next = [...blocks.value]
  // The list may have become shorter since the removal; Math.min puts the
  // block at the end instead of leaving a gap.
  next.splice(Math.min(index, next.length), 0, block)
  blocks.value = next
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ blocks: import('vue').Ref<object[]>, addBlock: Function, removeBlock: Function, restoreBlock: Function }}
 */
export function useAvailability() {
  return { blocks, addBlock, removeBlock, restoreBlock }
}
