<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { PhFlag, PhKeyReturn, PhX, PhTextAlignLeft } from '@phosphor-icons/vue'
import { useQuickAdd } from '../composables/useQuickAdd.js'
import { useTasks } from '../composables/useTasks.js'
import { useAreaFilter } from '../composables/useAreaFilter.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { parseQuickAdd } from '../utils/quickAddParser.js'
import { fromISODate } from '../utils/taskModel.js'
import { AREAS } from '../utils/areas.js'
import { AREA_META } from './ui/areaMeta.js'
import { daysUntil } from '../utils/dateParser.js'
import { dueLabel } from '../utils/dueLabel.js'
import BaseDialog from './ui/BaseDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseKbd from './ui/BaseKbd.vue'
import SegmentedControl from './ui/SegmentedControl.vue'
import MarkdownEditor from './ui/MarkdownEditor.vue'
import TagChip from './ui/TagChip.vue'
import { useTags } from '../composables/useTags.js'
import { findTagByName, normalizeTagName } from '../utils/tags.js'

/**
 * Quick capture (B4): one line of text, parsed live into title, date, area
 * and priority. The same three things can be set with the controls below
 * the input; whatever was changed last (typed or clicked) wins.
 * Enter saves and closes, Shift+Enter saves and stays open for the next
 * task. Opens with "N" from anywhere (see App.vue).
 */
const { isOpen } = useQuickAdd()
const { addTask, removeTask } = useTasks()
const { areaFilter } = useAreaFilter()
const { t, locale } = useLocale()
const toast = useToast()
const { tags: allTags, ensureTags } = useTags()

const text = ref('')
const triedSubmit = ref(false)
const inputEl = ref(null)

const parsed = computed(() => parseQuickAdd(text.value))

// Clicked values; cleared when the typed text recognises something new
const pickedArea = ref(null)
const pickedDue = ref(null) // '' = explicitly no date
const pickedPriority = ref(null)
const description = ref('')
const showDescription = ref(false)
watch(() => parsed.value.area, (v) => { if (v) pickedArea.value = null })
watch(() => parsed.value.due, (v) => { if (v) pickedDue.value = null })
watch(() => parsed.value.priority, (v) => { if (v) pickedPriority.value = null })

// Without #tag or click the task lands in the area currently filtered, else Studium
const area = computed({
  get: () => pickedArea.value || parsed.value.area || (areaFilter.value !== 'all' ? areaFilter.value : 'study'),
  set: (v) => { pickedArea.value = v },
})
const due = computed({
  get: () => (pickedDue.value !== null ? pickedDue.value : parsed.value.due || ''),
  set: (v) => { pickedDue.value = v || '' },
})
const important = computed(() =>
  pickedPriority.value !== null ? pickedPriority.value : parsed.value.priority === 'high',
)
function toggleImportant() { pickedPriority.value = !important.value }

// Typed #tags, shown with their real color if they already exist
const previewTags = computed(() => parsed.value.tags.map((name) => {
  const existing = findTagByName(allTags.value, name)
  return existing ? { ...existing, isNew: false } : { id: `new-${name}`, name: normalizeTagName(name), color: 'gray', isNew: true }
}))

const areaOptions = computed(() => AREAS.map(a => ({ value: a, label: t('areas.' + a), icon: AREA_META[a].icon })))
const titleMissing = computed(() => !parsed.value.title)

const dueText = computed(() => {
  const date = fromISODate(due.value)
  if (!date) return ''
  const weekday = date.toLocaleDateString(locale.value === 'de' ? 'de-CH' : 'en-GB', { weekday: 'short' }).replace('.', '')
  const rel = dueLabel(daysUntil(date))
  return `${weekday} ${date.getDate()}.${date.getMonth() + 1}. · ${t(rel.key, rel.params)}`
})

watch(isOpen, async (open) => {
  if (!open) return
  reset()
  await nextTick()
  inputEl.value?.focus()
})

function reset() {
  text.value = ''
  triedSubmit.value = false
  pickedArea.value = null
  pickedDue.value = null
  pickedPriority.value = null
  description.value = ''
  showDescription.value = false
}

function save(keepOpen) {
  triedSubmit.value = true
  if (titleMissing.value) return
  const title = parsed.value.title
  const tagIds = ensureTags(parsed.value.tags)
  const task = addTask({ title, tags: tagIds, description: description.value.trim(), due: due.value || null, priority: important.value ? 'high' : null, area: area.value })
  toast.show(t('quickAdd.saved', { title }), {
    tone: 'success',
    action: { label: t('ui.undo'), onClick: () => removeTask(task.id) },
  })
  reset()
  if (!keepOpen) isOpen.value = false
  else inputEl.value?.focus()
}

function onKeydown(e) {
  if (e.key !== 'Enter' || e.isComposing) return
  e.preventDefault()
  save(e.shiftKey)
}
</script>

<template>
  <BaseDialog v-model:open="isOpen" :title="t('quickAdd.title')">
    <label for="quick-add-input" class="sr-only">{{ t('quickAdd.inputLabel') }}</label>
    <input
      id="quick-add-input"
      ref="inputEl"
      v-model="text"
      type="text"
      autocomplete="off"
      autofocus
      :placeholder="t('quickAdd.placeholder')"
      :aria-invalid="triedSubmit && titleMissing ? 'true' : undefined"
      aria-describedby="quick-add-preview quick-add-help"
      :class="[
        'h-11 w-full rounded-md border bg-surface px-3 text-[15px] text-ink placeholder:text-ink-muted transition-colors duration-150',
        triedSubmit && titleMissing ? 'border-red-ink' : 'border-line-strong hover:border-ink-muted',
      ]"
      @keydown="onKeydown"
    />
    <p v-if="triedSubmit && titleMissing" class="mt-1.5 text-[13px] text-red-ink">{{ t('quickAdd.errorTitle') }}</p>

    <!-- Title as it will be saved -->
    <p id="quick-add-preview" class="mt-3 truncate text-sm">
      <span class="text-ink-muted">{{ t('quickAdd.previewLabel') }}</span>
      <span :class="['ml-1 font-medium', parsed.title ? 'text-ink' : 'text-ink-muted']">{{ parsed.title || t('quickAdd.noTitle') }}</span>
    </p>

    <!-- Area, date and priority: recognised from the text, or set here -->
    <div class="mt-4 grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
      <span class="text-[13px] text-ink-muted">{{ t('quickAdd.helpArea') }}</span>
      <SegmentedControl v-model="area" size="sm" :label="t('quickAdd.helpArea')" :options="areaOptions" class="justify-self-start" />

      <label for="quick-add-due" class="text-[13px] text-ink-muted">{{ t('quickAdd.helpDate') }}</label>
      <div class="flex flex-wrap items-center gap-2">
        <input
          id="quick-add-due"
          v-model="due"
          type="date"
          @keydown="onKeydown"
          class="h-8 rounded-md border border-line-strong bg-surface px-2 font-mono text-[13px] text-ink transition-colors duration-150 hover:border-ink-muted [color-scheme:dark] light:[color-scheme:light]"
        />
        <span v-if="due" class="font-mono text-[12px] text-ink-muted">{{ dueText }}</span>
        <button
          v-if="due"
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
          :aria-label="t('quickAdd.clearDate')"
          @click="due = ''"
        >
          <PhX class="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <span class="text-[13px] text-ink-muted">{{ t('quickAdd.priority') }}</span>
      <button
        type="button"
        :aria-pressed="important"
        :class="[
          'inline-flex h-7 items-center gap-1.5 justify-self-start rounded-md border px-2.5 text-[13px] transition-colors duration-150',
          important ? 'border-ink bg-ink text-canvas font-medium' : 'border-line-strong text-ink-muted hover:border-ink-muted hover:text-ink',
        ]"
        @click="toggleImportant"
      >
        <PhFlag :weight="important ? 'fill' : 'bold'" class="size-3.5" aria-hidden="true" />{{ t('quickAdd.important') }}
      </button>

      <template v-if="previewTags.length">
        <span class="text-[13px] text-ink-muted">{{ t('tags.title') }}</span>
        <span class="flex flex-wrap items-center gap-1.5">
          <span v-for="tag in previewTags" :key="tag.id" class="inline-flex items-center gap-1">
            <TagChip :tag="tag" />
            <span v-if="tag.isNew" class="font-mono text-[11px] text-ink-muted">{{ t('tags.new') }}</span>
          </span>
        </span>
      </template>
    </div>

    <!-- Optional description (Markdown), hidden by default to keep capture fast -->
    <div class="mt-4">
      <button
        v-if="!showDescription"
        type="button"
        class="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 -mx-1.5 text-[13px] text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
        @click="showDescription = true"
      >
        <PhTextAlignLeft class="size-3.5" aria-hidden="true" />{{ t('quickAdd.addDescription') }}
      </button>
      <MarkdownEditor
        v-else
        v-model="description"
        start-editing
        :rows="4"
        :label="t('detail.description')"
        :placeholder="t('detail.descriptionPlaceholder')"
        @submit="save(false)"
      />
    </div>

    <p id="quick-add-help" class="mt-4 border-t border-line pt-3 text-[13px] leading-6 text-ink-muted">
      {{ t('quickAdd.helpIntro') }}
      <BaseKbd>morgen</BaseKbd> <BaseKbd>fr</BaseKbd> <BaseKbd>15.12</BaseKbd>
      · <BaseKbd>#studium</BaseKbd> <BaseKbd>#freelance</BaseKbd> <BaseKbd>#privat</BaseKbd>
      · {{ t('tags.helpQuick') }} <BaseKbd>#fotografie</BaseKbd>
      · <BaseKbd>!</BaseKbd>
    </p>

    <template #actions>
      <span class="mr-auto hidden items-center gap-1.5 self-center text-[12px] text-ink-muted sm:flex">
        <BaseKbd>Shift</BaseKbd><BaseKbd>⏎</BaseKbd> {{ t('quickAdd.saveAndNext') }}
      </span>
      <BaseButton variant="ghost" @click="isOpen = false">{{ t('quickAdd.cancel') }}</BaseButton>
      <BaseButton variant="primary" :icon="PhKeyReturn" @click="save(false)">{{ t('quickAdd.save') }}</BaseButton>
    </template>
  </BaseDialog>
</template>
