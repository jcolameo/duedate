<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { PhTrash, PhCheck, PhCheckCircle, PhArrowCounterClockwise, PhX, PhFileCsv, PhStar } from '@phosphor-icons/vue'
import { useTaskDetail } from '../composables/useTaskDetail.js'
import { useTasks } from '../composables/useTasks.js'
import { useTaskActions } from '../composables/useTaskActions.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import EffortInput from './ui/EffortInput.vue'
import { remainingMinutes, formatMinutes } from '../utils/estimate.js'
import { enrichTask, fromISODate } from '../utils/taskModel.js'
import { AREAS, normalizeArea } from '../utils/areas.js'
import { dueLabel } from '../utils/dueLabel.js'
import { AREA_META, sessionClass } from './ui/areaMeta.js'
import BaseDialog from './ui/BaseDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import SegmentedControl from './ui/SegmentedControl.vue'
import DueBadge from './ui/DueBadge.vue'
import MarkdownEditor from './ui/MarkdownEditor.vue'
import TagPicker from './TagPicker.vue'
import ProgressBar from './ui/ProgressBar.vue'
import { usePlanState } from '../composables/usePlanState.js'
import { taskProgress, plannedSessions, taskTimeline } from '../utils/taskProgress.js'
import { shortDate } from '../utils/planSummary.js'

/**
 * Side panel to edit one task (B5). Changes are saved immediately, the
 * title on blur/Enter (an empty title is not saved). Fields that come from
 * the BBNet CSV (title, date, subject …) are read-only, because the next
 * import would overwrite them; they are changed in BBNet instead.
 * Native <dialog>: Esc closes, focus is trapped and returns to the opener.
 */
const { taskId, context, closeTask } = useTaskDetail()
const { plan } = usePlanState()
const { getTask, updateTask, removeTask, restoreTask } = useTasks()
const { toggleDone } = useTaskActions()
const { t, locale } = useLocale()
const toast = useToast()

const task = computed(() => (taskId.value ? getTask(taskId.value) : null))
const view = computed(() => (task.value ? enrichTask(task.value) : null))
const isCsv = computed(() => task.value?.source === 'csv')

// How far are we, what is planned, when did it start (calendar and panel)
const progress = computed(() => (task.value ? taskProgress(task.value) : null))
const planned = computed(() => (task.value ? plannedSessions(plan.value, task.value.id) : null))
const timeline = computed(() => (task.value ? taskTimeline(task.value) : null))
const loc = computed(() => (locale.value === 'de' ? 'de-CH' : 'en-GB'))
const decimal = computed(() => (locale.value === 'de' ? ',' : '.'))
const time = (min) => formatMinutes(min, decimal.value)
const dayText = (date) => date.toLocaleDateString(loc.value, { weekday: 'short', day: 'numeric', month: 'numeric' })
const fullDate = (date) => date.toLocaleDateString(loc.value, { day: 'numeric', month: 'long', year: 'numeric' })
const SESSIONS_SHOWN = 5
const progressLabel = computed(() =>
  progress.value.steps
    ? t('detail.progressLabel', { percent: progress.value.percent, ...progress.value.steps })
    : t('detail.progressLabelNone', { percent: progress.value.percent }),
)
// The session the panel was opened from, only while it belongs to this task
const fromSession = computed(() => (context.value && task.value && context.value.taskId === task.value.id ? context.value : null))

const open = computed({
  get: () => !!task.value,
  set: (v) => { if (!v) closeTask() },
})

// Title is edited as a draft so an empty field never reaches the store
const titleDraft = ref('')
const titleError = ref(false)
watch(task, (value, old) => {
  if (value && value.id !== old?.id) {
    titleDraft.value = value.title
    titleError.value = false
  }
}, { immediate: true })

// Saved while typing (so Esc never loses it); an empty title is not saved
// and the field falls back to the last saved title when it loses focus
function onTitleInput() {
  if (!task.value) return
  const title = titleDraft.value.trim()
  titleError.value = !title
  if (title && title !== task.value.title) updateTask(task.value.id, { title })
}
function onTitleBlur() {
  if (!task.value || titleDraft.value.trim()) return
  titleDraft.value = task.value.title
  titleError.value = false
}

function set(field, value) {
  updateTask(task.value.id, { [field]: value })
}

const dueText = computed(() => {
  const date = fromISODate(task.value?.due)
  if (!date) return ''
  const weekday = date.toLocaleDateString(locale.value === 'de' ? 'de-CH' : 'en-GB', { weekday: 'long' })
  const rel = dueLabel(view.value._days)
  return `${weekday} · ${t(rel.key, rel.params)}`
})

const areaOptions = computed(() => AREAS.map(a => ({ value: a, label: t('areas.' + a), icon: AREA_META[a].icon })))
const priorityOptions = computed(() => [
  { value: null, label: t('detail.auto') },
  { value: 'high', label: t('stundenplan.priorityHigh') },
  { value: 'medium', label: t('stundenplan.priorityMedium') },
  { value: 'low', label: t('stundenplan.priorityLow') },
])
// Time left after finished checklist steps, shown only when it differs from the estimate
const remaining = computed(() => {
  const left = task.value ? remainingMinutes(task.value) : null
  if (left === null || left === task.value.estimateMin) return ''
  return t('estimate.remaining', { time: formatMinutes(left, locale.value === 'de' ? ',' : '.') })
})

function remove() {
  const removed = removeTask(task.value.id)
  if (!removed) return
  closeTask()
  const title = removed.task.title || t('common.untitled')
  toast.show(t(removed.task.source === 'csv' ? 'detail.deletedCsv' : 'detail.deleted', { title }), {
    action: { label: t('ui.undo'), onClick: () => restoreTask(removed) },
  })
}

// The offer disappears once the task is done: keep focus inside the panel
const doneButton = ref(null)
async function completeFromOffer() {
  toggleDone(task.value)
  await nextTick()
  doneButton.value?.$el?.focus()
}

const fieldLabel = 'text-[13px] font-medium text-ink'
const readOnly = 'text-sm text-ink'
</script>

<template>
  <BaseDialog v-model:open="open" placement="right" :title="t('detail.title')">
    <div v-if="task" class="space-y-6">
      <!-- Title -->
      <div>
        <template v-if="isCsv">
          <p class="font-display text-[24px] font-bold leading-tight tracking-[-0.02em]">{{ task.title || t('common.untitled') }}</p>
        </template>
        <template v-else>
          <label for="detail-title" class="sr-only">{{ t('detail.titleField') }}</label>
          <input
            id="detail-title"
            v-model="titleDraft"
            type="text"
            autocomplete="off"
            :aria-invalid="titleError ? 'true' : undefined"
            :aria-describedby="titleError ? 'detail-title-error' : undefined"
            :class="[
              'w-full rounded-md border bg-transparent px-2 py-1 -mx-2 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-ink transition-colors duration-150',
              titleError ? 'border-red-ink' : 'border-transparent hover:border-line-strong focus:border-line-strong',
            ]"
            @input="onTitleInput"
            @blur="onTitleBlur"
            @keydown.enter.prevent="$event.target.blur()"
          />
          <p v-if="titleError" id="detail-title-error" class="mt-1 text-[13px] text-red-ink">{{ t('quickAdd.errorTitle') }}</p>
        </template>
        <div class="mt-2 flex flex-wrap items-center gap-2">
          <DueBadge v-if="!view._isDone" :code="view._statusCode" :days="view._days" />
          <span v-else class="inline-flex items-center gap-1 text-[13px] text-green-ink"><PhCheck class="size-3.5" aria-hidden="true" />{{ t('tasks.markDone') }}</span>
          <span v-if="isCsv" class="inline-flex items-center gap-1 text-[13px] text-ink-muted"><PhFileCsv class="size-3.5" aria-hidden="true" />{{ t('detail.fromCsv') }}</span>
        </div>
      </div>

      <!-- Opened from a work session in the calendar -->
      <div v-if="fromSession" :class="['rounded-lg border-l-2 px-3 py-2', sessionClass({ area: task.area })]">
        <p v-if="fromSession.of > 1" class="text-sm font-medium">{{ t('detail.sessionOf', { n: fromSession.n, of: fromSession.of }) }}</p>
        <p v-else class="text-sm font-medium">{{ t('calendar.legendSession') }}</p>
        <p class="font-mono text-[13px]">{{ dayText(fromSession.date) }} · {{ fromSession.startTime }}–{{ fromSession.endTime }}</p>
      </div>

      <!-- How far are we -->
      <section aria-labelledby="detail-progress">
        <h3 id="detail-progress" class="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('detail.progress') }}</h3>
        <ProgressBar class="mt-2" :value="progress.percent" :label="progressLabel" />
        <p class="mt-2 text-sm">
          <template v-if="progress.steps">{{ t('detail.stepsDone', progress.steps) }}</template>
          <template v-else-if="progress.isDone">{{ t('tasks.markDone') }}</template>
          <span v-else class="text-ink-muted">{{ t('detail.noSteps') }}</span>
        </p>
        <p v-if="progress.estimateMin" class="mt-1 font-mono text-[12px] text-ink-muted">
          {{ t('detail.timeLine', { total: time(progress.estimateMin), done: time(progress.doneMin), left: time(progress.remainingMin) }) }}
        </p>
      </section>

      <!-- Date -->
      <div class="space-y-1.5">
        <label v-if="!isCsv" for="detail-due" :class="fieldLabel">{{ t('detail.due') }}</label>
        <p v-else :class="fieldLabel">{{ t('detail.due') }}</p>
        <div v-if="!isCsv" class="flex flex-wrap items-center gap-2">
          <input
            id="detail-due"
            :value="task.due || ''"
            type="date"
            class="h-9 rounded-md border border-line-strong bg-surface px-2 font-mono text-[13px] text-ink transition-colors duration-150 hover:border-ink-muted [color-scheme:dark] light:[color-scheme:light]"
            @change="set('due', $event.target.value || null)"
          />
          <span v-if="dueText" class="text-[13px] text-ink-muted">{{ dueText }}</span>
          <button
            v-if="task.due"
            type="button"
            class="flex size-8 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
            :aria-label="t('quickAdd.clearDate')"
            @click="set('due', null)"
          >
            <PhX class="size-3.5" aria-hidden="true" />
          </button>
        </div>
        <p v-else :class="readOnly">
          <span class="font-mono text-[13px]">{{ view._deadline || t('due.none') }}</span>
          <span v-if="dueText" class="text-ink-muted"> · {{ dueText }}</span>
        </p>
      </div>

      <div class="space-y-1.5">
        <p :class="fieldLabel">{{ t('areas.colArea') }}</p>
        <SegmentedControl :model-value="normalizeArea(task.area)" :label="t('areas.colArea')" :options="areaOptions" @update:model-value="set('area', $event)" />
      </div>

      <div class="space-y-1.5">
        <p :class="fieldLabel">{{ t('quickAdd.priority') }}</p>
        <SegmentedControl :model-value="task.priority" :label="t('quickAdd.priority')" :options="priorityOptions" @update:model-value="set('priority', $event)" />
        <p class="text-[13px] text-ink-muted">{{ t('detail.autoHint') }}</p>
      </div>

      <div class="space-y-1.5">
        <p :class="fieldLabel">{{ t('estimate.label') }}</p>
        <EffortInput :key="task.id" :model-value="task.estimateMin" :label="t('estimate.label')" @update:model-value="set('estimateMin', $event)" />
        <p class="text-[13px] text-ink-muted">{{ remaining || t('estimate.hint') }}</p>
      </div>

      <TagPicker :model-value="task.tags || []" @update:model-value="set('tags', $event)" />

      <!-- Manual tasks: own description. CSV tasks: the description belongs
           to BBNet (shown below), the user writes notes instead. -->
      <MarkdownEditor
        :key="task.id + (isCsv ? '-notes' : '-desc')"
        :model-value="isCsv ? task.notes : task.description"
        :label="isCsv ? t('detail.notes') : t('detail.description')"
        :placeholder="t('detail.descriptionPlaceholder')"
        @update:model-value="set(isCsv ? 'notes' : 'description', $event)"
      />

      <!-- Inline instead of a toast: this panel is modal, a toast would sit behind it -->
      <div
        v-if="view._checklist?.complete && !view._isDone"
        class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-green-soft px-3 py-2.5"
      >
        <p class="flex items-center gap-2 text-sm text-green-ink">
          <PhCheckCircle class="size-4 shrink-0" aria-hidden="true" />{{ t('checklist.allDoneShort') }}
        </p>
        <BaseButton size="sm" variant="primary" :icon="PhCheck" @click="completeFromOffer">{{ t('checklist.completeTask') }}</BaseButton>
      </div>

      <!-- Read-only details from BBNet -->
      <div v-if="isCsv" class="rounded-lg border border-line bg-surface-muted/50 p-4">
        <p class="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('detail.fromCsvTitle') }}</p>
        <dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <template v-if="task.category"><dt class="text-ink-muted">{{ t('deadlines.colSubject') }}</dt><dd>{{ task.category }}</dd></template>
          <template v-if="task.description"><dt class="text-ink-muted">{{ t('detail.description') }}</dt><dd class="whitespace-pre-line">{{ task.description }}</dd></template>
          <template v-if="task.files"><dt class="text-ink-muted">{{ t('detail.files') }}</dt><dd class="break-words">{{ task.files }}</dd></template>
          <dt class="text-ink-muted">{{ t('deadlines.colGraded') }}</dt>
          <dd>
            <span v-if="task.graded" class="inline-flex items-center gap-1.5 text-yellow-ink"><PhStar weight="fill" class="size-3.5" aria-hidden="true" />{{ t('deadlines.gradedYes') }}</span>
            <span v-else>{{ t('deadlines.gradedNo') }}</span>
          </dd>
        </dl>
        <p class="mt-3 text-[13px] text-ink-muted">{{ t('detail.csvHint') }}</p>
      </div>

      <!-- Planned work time -->
      <section aria-labelledby="detail-planned">
        <h3 id="detail-planned" class="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('detail.planned') }}</h3>
        <p v-if="!plan" class="mt-2 text-sm text-ink-muted">{{ t('detail.noPlanYet') }}</p>
        <p v-else-if="planned.sessions.length === 0" class="mt-2 text-sm text-ink-muted">{{ t('detail.notPlanned') }}</p>
        <template v-else>
          <p class="mt-2 font-mono text-[12px] text-ink-muted">
            {{ t('detail.plannedSummary', { count: planned.sessions.length, time: time(planned.minutes), from: shortDate(planned.first), to: shortDate(planned.last) }) }}
          </p>
          <ul class="mt-2 divide-y divide-line rounded-lg border border-line">
            <li
              v-for="s in planned.upcoming.slice(0, SESSIONS_SHOWN)"
              :key="s.n"
              :class="['flex items-baseline gap-3 px-3 py-1.5 text-sm', fromSession && fromSession.n === s.n && 'bg-surface-muted']"
            >
              <span class="w-24 shrink-0 font-mono text-[13px] text-ink-muted">{{ dayText(s.date) }}</span>
              <span class="font-mono text-[13px]">{{ s.startTime }}–{{ s.endTime }}</span>
              <span v-if="s.of > 1" class="ml-auto font-mono text-[12px] text-ink-muted">{{ s.n }}/{{ s.of }}</span>
            </li>
          </ul>
          <p v-if="planned.upcoming.length > SESSIONS_SHOWN" class="mt-1 text-[13px] text-ink-muted">{{ t('detail.moreSessions', { count: planned.upcoming.length - SESSIONS_SHOWN }) }}</p>
        </template>
      </section>

      <!-- Facts -->
      <section aria-labelledby="detail-facts">
        <h3 id="detail-facts" class="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('detail.facts') }}</h3>
        <dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <template v-if="timeline.created"><dt class="text-ink-muted">{{ t('detail.created') }}</dt><dd>{{ fullDate(timeline.created) }}</dd></template>
          <template v-if="timeline.updated"><dt class="text-ink-muted">{{ t('detail.updated') }}</dt><dd>{{ fullDate(timeline.updated) }}</dd></template>
          <template v-if="timeline.completed"><dt class="text-ink-muted">{{ t('detail.completedOn') }}</dt><dd>{{ fullDate(timeline.completed) }}</dd></template>
          <dt class="text-ink-muted">{{ t('detail.source') }}</dt>
          <dd>{{ isCsv ? t('detail.sourceCsv') : t('detail.sourceManual') }}</dd>
        </dl>
      </section>
    </div>

    <template v-if="task" #actions>
      <BaseButton variant="danger" :icon="PhTrash" class="mr-auto" @click="remove">{{ t('detail.delete') }}</BaseButton>
      <BaseButton :icon="view._isDone ? PhArrowCounterClockwise : PhCheck" @click="toggleDone(task)">
        {{ view._isDone ? t('detail.reopen') : t('tasks.markDone') }}
      </BaseButton>
      <BaseButton ref="doneButton" variant="primary" @click="closeTask">{{ t('detail.done') }}</BaseButton>
    </template>
  </BaseDialog>
</template>
