<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { PhCalendarBlank, PhFlag, PhKeyReturn } from '@phosphor-icons/vue'
import { useQuickAdd } from '../composables/useQuickAdd.js'
import { useTasks } from '../composables/useTasks.js'
import { useAreaFilter } from '../composables/useAreaFilter.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { parseQuickAdd } from '../utils/quickAddParser.js'
import { fromISODate } from '../utils/taskModel.js'
import { daysUntil } from '../utils/dateParser.js'
import { dueLabel } from '../utils/dueLabel.js'
import BaseDialog from './ui/BaseDialog.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseTag from './ui/BaseTag.vue'
import BaseKbd from './ui/BaseKbd.vue'
import AreaTag from './ui/AreaTag.vue'

/**
 * Quick capture (B4): one line of text, parsed live into title, date, area
 * and priority. Enter saves and closes, Shift+Enter saves and stays open
 * for the next task. Opens with "N" from anywhere (see App.vue).
 */
const { isOpen } = useQuickAdd()
const { addTask, removeTask } = useTasks()
const { areaFilter } = useAreaFilter()
const { t, locale } = useLocale()
const toast = useToast()

const text = ref('')
const triedSubmit = ref(false)
const inputEl = ref(null)

const parsed = computed(() => parseQuickAdd(text.value))
// Without #tag the task lands in the area currently filtered, else Studium
const area = computed(() => parsed.value.area || (areaFilter.value !== 'all' ? areaFilter.value : 'study'))
const titleMissing = computed(() => !parsed.value.title)

const dueText = computed(() => {
  const date = fromISODate(parsed.value.due)
  if (!date) return ''
  const weekday = date.toLocaleDateString(locale.value === 'de' ? 'de-CH' : 'en-GB', { weekday: 'short' }).replace('.', '')
  const rel = dueLabel(daysUntil(date))
  return `${weekday} ${date.getDate()}.${date.getMonth() + 1}. · ${t(rel.key, rel.params)}`
})

watch(isOpen, async (open) => {
  if (!open) return
  text.value = ''
  triedSubmit.value = false
  await nextTick()
  inputEl.value?.focus()
})

function save(keepOpen) {
  triedSubmit.value = true
  if (titleMissing.value) return
  const { title, due, priority } = parsed.value
  const task = addTask({ title, due, priority, area: area.value })
  toast.show(t('quickAdd.saved', { title }), {
    tone: 'success',
    action: { label: t('ui.undo'), onClick: () => removeTask(task.id) },
  })
  text.value = ''
  triedSubmit.value = false
  if (!keepOpen) isOpen.value = false
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

    <!-- Live preview of what was recognised -->
    <div id="quick-add-preview" class="mt-4 flex min-h-6 flex-wrap items-center gap-2 text-sm">
      <span class="sr-only">{{ t('quickAdd.previewLabel') }}</span>
      <span :class="['mr-1 font-medium', parsed.title ? 'text-ink' : 'text-ink-muted']">{{ parsed.title || t('quickAdd.noTitle') }}</span>
      <AreaTag :area="area" />
      <BaseTag v-if="parsed.due" :icon="PhCalendarBlank"><span class="font-mono normal-case tracking-normal">{{ dueText }}</span></BaseTag>
      <BaseTag v-if="parsed.priority" :icon="PhFlag">{{ t('quickAdd.important') }}</BaseTag>
    </div>

    <p id="quick-add-help" class="mt-4 border-t border-line pt-3 text-[13px] leading-6 text-ink-muted">
      {{ t('quickAdd.helpDate') }} <BaseKbd>morgen</BaseKbd> <BaseKbd>fr</BaseKbd> <BaseKbd>24.11.</BaseKbd>
      · {{ t('quickAdd.helpArea') }} <BaseKbd>#freelance</BaseKbd> <BaseKbd>#p</BaseKbd>
      · {{ t('quickAdd.helpPriority') }} <BaseKbd>!</BaseKbd>
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
