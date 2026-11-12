import { ref } from 'vue'
import { useTaskEnrichment } from './useTaskEnrichment.js'
import { useTaskPlanning } from './useTaskPlanning.js'
import { useAvailability } from './useAvailability.js'
import { usePlannerSettings } from './usePlannerSettings.js'
import { generatePlan } from '../utils/scheduler.js'

/**
 * Shared, module-level generated-plan state so both Stundenplan and My Week
 * see the same plan without regenerating it independently. Deliberately NOT
 * persisted to localStorage — still a regeneratable preview, not stored
 * source of truth (see PROJECT_CONTEXT.md Phase F); it just now also
 * survives navigation between views within a session, not just re-renders
 * of a single component.
 */
const { enrichedTasks } = useTaskEnrichment()
const { getPlanningFor } = useTaskPlanning()
const { blocks } = useAvailability()
const { plannerOptions } = usePlannerSettings()

const plan = ref(null)

function generate() {
  plan.value = generatePlan(enrichedTasks.value, getPlanningFor, blocks.value, new Date(), plannerOptions.value)
}

export function usePlanState() {
  return { plan, generate, enrichedTasks }
}
