<script setup>
import { ref, computed, watch } from 'vue'
import { PhUploadSimple, PhCalendarBlank, PhSlidersHorizontal, PhCaretDown, PhStar, PhLock, PhFileCsv, PhEye, PhEyeSlash, PhCheckCircle, PhFunnel } from '@phosphor-icons/vue'
import { useCSVImport } from '../composables/useCSVImport.js'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useICSExport } from '../composables/useICSExport.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import ColumnMappingConfirm from '../components/ColumnMappingConfirm.vue'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import DueBadge from '../components/ui/DueBadge.vue'
import InlineNotice from '../components/ui/InlineNotice.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import TaskCheckbox from '../components/ui/TaskCheckbox.vue'
import { useTaskActions } from '../composables/useTaskActions.js'
import { useAreaFilter } from '../composables/useAreaFilter.js'
import { filterByArea } from '../utils/areas.js'
import AreaFilter from '../components/AreaFilter.vue'
import AreaSelect from '../components/ui/AreaSelect.vue'

// CSV import: drag & drop, parsing, file state
const {
  uploadedFile, isDragging, errorMessage, importWarning,
  handleDragOver, handleDragLeave, handleDrop, handleFileSelect,
} = useCSVImport()

// Column mapping: detection runs automatically when the shared task list changes
const {
  userMapping, suggestions, missingRequired,
  availableColumns, isConfirmed, hasRequiredFields, needsConfirmation,
  updateMapping, confirmMapping, resetMapping,
} = useColumnMapping()

const { enrichedTasks, openTasks, doneTasks, exportableCount } = useTaskEnrichment()
const { toggleDone, changeArea } = useTaskActions()
const { areaFilter } = useAreaFilter()

// Completed tasks are hidden by default; open ones first, then done (newest first)
const showDone = ref(false)
const areaOpen = computed(() => filterByArea(openTasks.value, areaFilter.value))
const areaDone = computed(() => filterByArea(doneTasks.value, areaFilter.value))
const visibleTasks = computed(() => (showDone.value ? [...areaOpen.value, ...areaDone.value] : areaOpen.value))
const { exportMessage, exportError, exportToICS } = useICSExport(enrichedTasks)
const { locale, t } = useLocale()
const toast = useToast()

// Successful export is quick feedback, not page content
watch(exportMessage, (msg) => {
  if (msg) toast.show(msg, { tone: 'success' })
})

const code = 'rounded bg-surface-muted px-1.5 py-0.5 font-mono text-[12px] text-ink'
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10 sm:px-10">
    <PageHeader :title="t('deadlines.title')" accent="." :description="t('deadlines.subtitle')">
      <template v-if="enrichedTasks.length && !needsConfirmation" #actions>
        <BaseButton v-if="isConfirmed" variant="ghost" :icon="PhSlidersHorizontal" :title="t('deadlines.changeMappingTitle')" @click="resetMapping">
          {{ t('deadlines.changeMapping') }}
        </BaseButton>
        <BaseButton variant="primary" :icon="PhCalendarBlank" :disabled="exportableCount === 0" @click="exportToICS">
          {{ t('deadlines.exportButton') }} <span class="font-mono">({{ exportableCount }})</span>
        </BaseButton>
      </template>
    </PageHeader>

    <div class="mt-10 space-y-4">
      <!-- Drop zone (label wraps a visually hidden but focusable file input) -->
      <label
        :class="[
          'flex cursor-pointer items-center gap-5 rounded-xl border border-dashed bg-surface transition-colors duration-150',
          'focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus',
          enrichedTasks.length ? 'px-5 py-4' : 'flex-col px-6 py-14 text-center',
          isDragging ? 'border-blue-ink bg-blue-soft' : 'border-line-strong hover:bg-surface-muted',
        ]"
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
      >
        <input type="file" accept=".csv,text/csv" class="sr-only" @change="handleFileSelect" />
        <span class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-ink-muted">
          <PhUploadSimple class="size-5" aria-hidden="true" />
        </span>
        <span :class="enrichedTasks.length ? 'min-w-0 flex-1' : ''">
          <span class="block font-medium text-ink">{{ t('deadlines.dropCsv') }}</span>
          <span class="block text-sm text-ink-muted">{{ t('deadlines.orClickToSelect') }}</span>
        </span>
        <span v-if="uploadedFile && enrichedTasks.length" class="hidden items-center gap-2 text-right sm:flex">
          <PhFileCsv class="size-4 text-ink-muted" aria-hidden="true" />
          <span>
            <span class="block max-w-56 truncate font-mono text-[13px] text-ink">{{ uploadedFile.name }}</span>
            <span class="block font-mono text-[12px] text-ink-muted">{{ t('deadlines.uploadSummary', { count: enrichedTasks.length, exportable: exportableCount }) }}</span>
          </span>
        </span>
      </label>

      <InlineNotice v-if="importWarning && !errorMessage" tone="warning">{{ importWarning }}</InlineNotice>
      <InlineNotice v-if="errorMessage || exportError" tone="error">{{ errorMessage || exportError }}</InlineNotice>

      <!-- How it works (BBNet's own UI labels stay German in both locales) -->
      <details class="group rounded-xl border border-line bg-surface">
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl px-5 py-3.5 text-sm [&::-webkit-details-marker]:hidden">
          <span><span class="font-medium text-ink">{{ t('deadlines.howItWorks') }}</span> <span class="text-ink-muted">· {{ t('deadlines.forBBNetUsers') }}</span></span>
          <PhCaretDown class="size-4 text-ink-muted transition-transform duration-150 group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div class="border-t border-line px-5 py-4 text-sm text-ink">
          <ol v-if="locale === 'de'" class="list-inside list-decimal space-y-2 marker:font-mono marker:text-ink-muted">
            <li>Im <span :class="code">BBNet</span> unter <span :class="code">Hausaufgabe</span> öffnen</li>
            <li>Oben rechts neben <span :class="code">«Neuer Antrag»</span> auf <span :class="code">⋯</span> klicken</li>
            <li><span :class="code">«Gesamte Liste exportieren»</span> wählen, die CSV wird heruntergeladen</li>
            <li>Die CSV oben in das Feld ziehen</li>
            <li><span :class="code">In Kalender exportieren</span> klicken und die <span :class="code">.ics</span>-Datei öffnen</li>
          </ol>
          <ol v-else class="list-inside list-decimal space-y-2 marker:font-mono marker:text-ink-muted">
            <li>In <span :class="code">BBNet</span>, open <span :class="code">Hausaufgabe</span> (homework)</li>
            <li>Click <span :class="code">⋯</span> next to <span :class="code">«Neuer Antrag»</span> in the top right</li>
            <li>Choose <span :class="code">«Gesamte Liste exportieren»</span> (export entire list), the CSV downloads</li>
            <li>Drag the CSV into the field above</li>
            <li>Click <span :class="code">Export to calendar</span> and open the <span :class="code">.ics</span> file</li>
          </ol>
          <p class="mt-4 flex items-center gap-2 text-[13px] text-ink-muted">
            <PhLock class="size-3.5 shrink-0" aria-hidden="true" />{{ t('deadlines.localNotice') }}
          </p>
        </div>
      </details>
    </div>

    <ColumnMappingConfirm
      v-if="needsConfirmation"
      class="mt-8"
      :user-mapping="userMapping"
      :available-columns="availableColumns"
      :suggestions="suggestions"
      :has-required-fields="hasRequiredFields"
      :missing-required="missingRequired"
      @update="updateMapping($event.role, $event.column)"
      @confirm="confirmMapping"
    />

    <!-- Task table -->
    <section v-if="enrichedTasks.length > 0 && !needsConfirmation" class="mt-12" aria-labelledby="h-tasks">
      <div class="mb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="h-tasks" class="font-display text-[22px] font-bold tracking-[-0.01em]">
          {{ t('deadlines.yourTasks') }} <span class="font-mono text-[15px] font-normal text-ink-muted">{{ areaOpen.length }}</span>
        </h2>
        <div class="flex flex-wrap items-center gap-3">
          <AreaFilter :tasks="openTasks" />
          <BaseButton v-if="areaDone.length" variant="ghost" size="sm" :icon="showDone ? PhEyeSlash : PhEye" :aria-pressed="showDone" @click="showDone = !showDone">
            {{ showDone ? t('tasks.hideDone') : t('tasks.showDone', { count: areaDone.length }) }}
          </BaseButton>
        </div>
      </div>

      <EmptyState v-if="visibleTasks.length === 0 && areaFilter !== 'all' && openTasks.length" :icon="PhFunnel" :title="t('areas.emptyTitle', { area: t('areas.' + areaFilter) })" :description="t('areas.emptyText')">
        <BaseButton variant="secondary" @click="areaFilter = 'all'">{{ t('areas.showAll') }}</BaseButton>
      </EmptyState>
      <EmptyState v-else-if="visibleTasks.length === 0" :icon="PhCheckCircle" :title="t('tasks.allDoneTitle')" :description="t('tasks.allDoneText')" />

      <BaseCard v-else padding="none" class="overflow-x-auto">
        <table class="w-full text-left text-sm">
          <thead>
            <tr class="border-b border-line font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
              <th scope="col" class="w-12 py-3 pl-4 pr-0 font-normal"><span class="sr-only">{{ t('tasks.markDone') }}</span></th>
              <th scope="col" class="px-4 py-3 font-normal">{{ t('deadlines.colDays') }}</th>
              <th scope="col" class="px-4 py-3 font-normal">{{ userMapping.title || t('deadlines.colTitle') }}</th>
              <th scope="col" class="px-4 py-3 font-normal">{{ t('areas.colArea') }}</th>
              <th scope="col" class="px-4 py-3 font-normal">{{ userMapping.category || t('deadlines.colSubject') }}</th>
              <th scope="col" class="px-4 py-3 font-normal">{{ userMapping.deadline || t('deadlines.colDue') }}</th>
              <th scope="col" class="px-4 py-3 font-normal">{{ userMapping.graded || t('deadlines.colGraded') }}</th>
            </tr>
          </thead>
          <TransitionGroup tag="tbody" name="dd-row" class="divide-y divide-line">
            <tr
              v-for="task in visibleTasks"
              :key="task._id"
              :class="['transition-colors duration-150 hover:bg-surface-muted/50', task._isDone && 'text-ink-muted']"
            >
              <td class="py-2.5 pl-4 pr-0 align-middle">
                <TaskCheckbox :done="task._isDone" :title="task._title || t('common.untitled')" @toggle="toggleDone(task)" />
              </td>
              <td class="whitespace-nowrap px-4 py-3 align-middle">
                <span v-if="task._isDone" class="font-mono text-[13px] text-ink-muted">{{ t('tasks.markDone') }}</span>
                <DueBadge v-else :code="task._status.code" :days="task._days" />
              </td>
              <td :class="['max-w-xs px-4 py-3 align-middle font-medium', task._isDone ? 'text-ink-muted line-through decoration-line-strong' : 'text-ink']">{{ task._title || t('common.dash') }}</td>
              <td class="whitespace-nowrap px-4 py-3 align-middle">
                <AreaSelect :area="task._area" :title="task._title || t('common.untitled')" @change="changeArea(task, $event)" />
              </td>
              <td class="px-4 py-3 align-middle text-ink-muted">{{ task._category || t('common.dash') }}</td>
              <td class="whitespace-nowrap px-4 py-3 align-middle font-mono text-[13px] text-ink-muted">{{ task._deadline || t('common.dash') }}</td>
              <td class="px-4 py-3 align-middle">
                <span v-if="task._isGraded" :class="['inline-flex items-center gap-1.5', task._isDone ? 'text-ink-muted' : 'text-yellow-ink']">
                  <PhStar weight="fill" class="size-3.5" aria-hidden="true" />{{ t('deadlines.gradedYes') }}
                </span>
                <span v-else class="text-ink-muted">{{ t('deadlines.gradedNo') }}</span>
              </td>
            </tr>
          </TransitionGroup>
        </table>
      </BaseCard>
    </section>
  </div>
</template>

<style scoped>
.dd-row-leave-active {
  transition: opacity 200ms var(--ease-out-soft);
}
.dd-row-leave-to {
  opacity: 0;
}
</style>
