<script setup>
import { ref, computed, watch } from 'vue'
import { PhTrash, PhCheck, PhArrowCounterClockwise, PhX, PhFileCsv, PhStar } from '@phosphor-icons/vue'
import { useTaskDetail } from '../composables/useTaskDetail.js'
import { useTasks } from '../composables/useTasks.js'
import { useTaskActions } from '../composables/useTaskActions.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { EFFORT_OPTIONS } from '../composables/useTaskPlanning.js'
import { enrichTask, fromISODate } from '../utils/taskModel.js'
import { AREAS, normalizeArea } from '../utils/areas.js'
import { dueLabel } from '../utils/dueLabel.js'
import { AREA_META } from './ui/areaMeta.js'
import BaseDialog from './ui/BaseDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import SegmentedControl from './ui/SegmentedControl.vue'
import DueBadge from './ui/DueBadge.vue'
import MarkdownEditor from './ui/MarkdownEditor.vue'
import TagPicker from './TagPicker.vue'

/**
 * Side panel to edit one task (B5). Changes are saved immediately, the
 * title on blur/Enter (an empty title is not saved). Fields that come from
 * the BBNet CSV (title, date, subject …) are read-only, because the next
 * import would overwrite them; they are changed in BBNet instead.
 * Native <dialog>: Esc closes, focus is trapped and returns to the opener.
 */
const { taskId, closeTask } = useTaskDetail()
const { getTask, updateTask, removeTask, restoreTask } = useTasks()
const { toggleDone } = useTaskActions()
const { t, locale } = useLocale()
const toast = useToast()

const task = computed(() => (taskId.value ? getTask(taskId.value) : null))
const view = computed(() => (task.value ? enrichTask(task.value) : null))
const isCsv = computed(() => task.value?.source === 'csv')

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
const effortOptions = computed(() => [
  { value: null, label: t('common.dash') },
  ...EFFORT_OPTIONS.map(e => ({ value: e, label: e })),
])

function remove() {
  const removed = removeTask(task.value.id)
  if (!removed) return
  closeTask()
  const title = removed.task.title || t('common.untitled')
  toast.show(t(removed.task.source === 'csv' ? 'detail.deletedCsv' : 'detail.deleted', { title }), {
    action: { label: t('ui.undo'), onClick: () => restoreTask(removed) },
  })
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
        <p :class="fieldLabel">{{ t('stundenplan.effort') }}</p>
        <SegmentedControl :model-value="task.effort" mono :label="t('stundenplan.effort')" :options="effortOptions" @update:model-value="set('effort', $event)" />
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
    </div>

    <template v-if="task" #actions>
      <BaseButton variant="danger" :icon="PhTrash" class="mr-auto" @click="remove">{{ t('detail.delete') }}</BaseButton>
      <BaseButton :icon="view._isDone ? PhArrowCounterClockwise : PhCheck" @click="toggleDone(task)">
        {{ view._isDone ? t('detail.reopen') : t('tasks.markDone') }}
      </BaseButton>
      <BaseButton variant="primary" @click="closeTask">{{ t('detail.done') }}</BaseButton>
    </template>
  </BaseDialog>
</template>
