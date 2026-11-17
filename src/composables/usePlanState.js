/**
 * usePlanState: holds the generated weekly plan (which task to work on when)
 * and keeps it up to date once it exists.
 *
 * Called by: src/views/CalendarView.vue:37 and
 * src/views/StundenplanView.vue:34 (button "Generate plan" -> `generate`),
 * src/components/TaskDetail.vue:36 (shows the task's sessions), and inside
 * this folder by usePlanEdit.js.
 *
 * In: nothing. Out: `{ plan, generate, enrichedTasks }`. `plan` is a ref with
 * `null` (no plan yet) or the result of generatePlan() in
 * src/utils/scheduler.js, which has a `sessions` array. `enrichedTasks` is
 * passed through so the calendar uses the same list as the planner.
 *
 * In the background: no localStorage, on purpose. A `watch` re-plans whenever
 * tasks, busy blocks or planner settings change, but only if a plan exists.
 *
 * Why module level: `plan` exists once, so the calendar, the Stundenplan page
 * and the task panel all show the same plan, also after switching pages.
 *
 * How to read this file: `generate()` is the only writer of `plan`. The
 * `watch` below it calls `generate()` again after data changes. The inputs
 * come from four other stores, taken at import time at the top.
 */
import { ref, watch } from 'vue'
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
 *
 * Once a plan exists it follows the data (rolling plan): finishing a task,
 * ticking a checklist step, changing an estimate or date, a busy block or a
 * planner rule re-plans automatically, so the calendar never shows work for
 * tasks that are already done.
 */
const { enrichedTasks } = useTaskEnrichment()
const { getPlanningFor } = useTaskPlanning()
const { blocks } = useAvailability()
const { plannerOptions } = usePlannerSettings()

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one plan for the whole app.
const plan = ref(null)

/**
 * Builds a fresh plan from the current data, starting now.
 *
 * @sideeffect replaces `plan.value`
 */
function generate() {
  plan.value = generatePlan(enrichedTasks.value, getPlanningFor, blocks.value, new Date(), plannerOptions.value)
}

// `watch` is like `componentDidUpdate`, but it names the values it listens to,
// here three at once. `deep: true` also reacts to changes inside the arrays
// and objects, not only when they are replaced.
watch([enrichedTasks, blocks, plannerOptions], () => {
  // Before the first click on "Generate" there is no plan; the watch must not
  // create one on its own.
  if (plan.value) generate()
}, { deep: true })

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ plan: import('vue').Ref<object|null>, generate: Function, enrichedTasks: import('vue').ComputedRef<object[]> }}
 */
export function usePlanState() {
  return { plan, generate, enrichedTasks }
}
