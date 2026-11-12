<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { RouterLink } from 'vue-router'
import { PhTray, PhUploadSimple, PhCheck, PhCheckCircle, PhFunnel, PhPlus, PhArrowsClockwise, PhPencilSimple } from '@phosphor-icons/vue'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useLocale } from '../composables/useLocale.js'
import { usePageEyebrow } from '../composables/usePageEyebrow.js'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import DueBadge from '../components/ui/DueBadge.vue'
import TaskCheckbox from '../components/ui/TaskCheckbox.vue'
import { useTaskActions } from '../composables/useTaskActions.js'
import { useAreaFilter } from '../composables/useAreaFilter.js'
import { filterByArea } from '../utils/areas.js'
import { markdownSummary } from '../utils/markdown.js'
import AreaFilter from '../components/AreaFilter.vue'
import TagFilter from '../components/TagFilter.vue'
import TagChip from '../components/ui/TagChip.vue'
import { useTags } from '../composables/useTags.js'
import { useTagFilter } from '../composables/useTagFilter.js'
import { filterByTag, tagsOf } from '../utils/tags.js'
import AreaTag from '../components/ui/AreaTag.vue'
import ChecklistBadge from '../components/ui/ChecklistBadge.vue'
import { useQuickAdd } from '../composables/useQuickAdd.js'
import { useTaskDetail } from '../composables/useTaskDetail.js'
import { useToday } from '../composables/useToday.js'
import { useToast } from '../composables/useToast.js'
import {
  TODAY_LIMIT, rankCandidates, suggestToday, pickReplacement, totalEffort, formatMinutes,
} from '../utils/todaySuggestion.js'

const { enrichedTasks, openTasks: allOpen, doneTasks: allDone } = useTaskEnrichment()
const { areaFilter } = useAreaFilter()
const { tagFilter } = useTagFilter()
const { tagsById } = useTags()
const quickAdd = useQuickAdd()
const { openTask, openFromClick } = useTaskDetail()
const { complete, toggleDone, toggleStep } = useTaskActions()
const { todayIds, skippedIds, setToday, addToday, swapToday } = useToday()
const toast = useToast()
const { t, locale } = useLocale()
const eyebrow = usePageEyebrow()

// Filters (area, tag) only shape the choice of tasks (morning picker and
// "Nicht heute"); today's own list always shows what the user picked.
const filtered = (list) => filterByTag(filterByArea(list, areaFilter.value), tagFilter.value)
const openTasks = computed(() => filtered(allOpen.value))
const doneTasks = computed(() => filtered(allDone.value))
const isFiltered = computed(() => areaFilter.value !== 'all' || tagFilter.value !== 'all')
function resetFilters() {
  areaFilter.value = 'all'
  tagFilter.value = 'all'
}
const showAreaTags = computed(() => areaFilter.value === 'all')
// One line about what the task is: BBNet subject, else the description
const subline = (task) => task._category || markdownSummary(task.description)

// --- Today's list -----------------------------------------------------
const byId = computed(() => new Map(enrichedTasks.value.map(task => [task._id, task])))
// Deleted tasks silently drop out; done ones stay (progress, no jumping rows)
const todayTasks = computed(() => todayIds.value.map(id => byId.value.get(id)).filter(Boolean))
const todayOpen = computed(() => todayTasks.value.filter(task => !task._isDone))
const todayDone = computed(() => todayTasks.value.filter(task => task._isDone))
const planned = computed(() => todayTasks.value.length > 0)
const focusTask = computed(() => todayOpen.value[0] || null)
const otherToday = computed(() => todayTasks.value.filter(task => task._id !== focusTask.value?._id))
// How many open picks can still be chosen (done ones count towards the three)
const limit = computed(() => Math.max(0, TODAY_LIMIT - todayDone.value.length))
const effort = computed(() => {
  const total = totalEffort(todayOpen.value)
  if (!total) return ''
  const time = formatMinutes(total.minutes, locale.value === 'de' ? ',' : '.')
  return t(total.atLeast ? 'today.effortAtLeast' : 'today.effort', { time })
})

const replacement = computed(() =>
  pickReplacement(allOpen.value, { exclude: todayIds.value, skipped: skippedIds.value }),
)

// --- Morning picker ("Was sind heute deine 3?") ------------------------------
const planning = ref(false) // editing an existing plan
const showRitual = computed(() => allOpen.value.length > 0 && (!planned.value || planning.value))
const selected = ref([])

function startRitual() {
  selected.value = suggestToday(filtered(allOpen.value), { limit: limit.value }).map(task => task._id)
}
watch(() => showRitual.value && !planning.value, (morning) => { if (morning) startRitual() }, { immediate: true })

function editDay() {
  planning.value = true
  selected.value = todayOpen.value.map(task => task._id)
}

const ritualList = computed(() => {
  const shown = rankCandidates(filtered(allOpen.value)).slice(0, 8)
  const extra = selected.value
    .map(id => byId.value.get(id))
    .filter(task => task && !task._isDone && !shown.some(s => s._id === task._id))
  return [...shown, ...extra]
})
const limitReached = computed(() => selected.value.length >= limit.value)

function toggleSelected(id) {
  if (selected.value.includes(id)) selected.value = selected.value.filter(x => x !== id)
  else if (!limitReached.value) selected.value = [...selected.value, id]
}

const focusTitle = ref(null)
async function focusNext() {
  await nextTick()
  if (focusTitle.value) focusTitle.value.focus()
  else document.getElementById('main')?.focus()
}

function confirmRitual() {
  // Most urgent first, whatever order the boxes were ticked in
  const picked = selected.value.map(id => byId.value.get(id)).filter(Boolean)
  setToday([...todayDone.value, ...rankCandidates(picked)].map(task => task._id))
  planning.value = false
  focusNext()
}

function swap() {
  const next = replacement.value
  if (!focusTask.value || !next) return
  swapToday(focusTask.value._id, next._id)
  toast.show(t('today.swapped', { title: next._title || t('common.untitled') }))
}

function oneMore() {
  if (replacement.value) addToday(replacement.value._id)
  focusNext()
}

// Ticking the next step on the card: the box stays, the next step moves in.
function tickStep(task, event) {
  event.target.checked = false
  toggleStep(task, task._checklist.next.index)
}

function finish(task) {
  complete(task)
  focusNext()
}

// --- "Nicht heute" ------------------------------------------------------
const notToday = computed(() => openTasks.value.filter(task => !todayIds.value.includes(task._id)).slice(0, 4))

const overdueCount = computed(() => openTasks.value.filter(x => x._status.code === 'overdue').length)
const urgentCount = computed(() => openTasks.value.filter(x => x._status.code === 'urgent').length)
const summary = computed(() =>
  overdueCount.value + urgentCount.value === 0
    ? t('home.summaryCalm')
    : t('home.summary', { overdue: overdueCount.value, urgent: urgentCount.value }),
)

const titleButton = 'rounded-sm text-left underline-offset-4 decoration-line-strong hover:underline'
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10 sm:px-10">
    <PageHeader
      :eyebrow="eyebrow"
      :title="t('home.title')"
      accent="?"
      :description="openTasks.length ? summary : t('home.subtitle')"
    />

    <div class="mt-8">
      <EmptyState v-if="enrichedTasks.length === 0" :icon="PhTray" :title="t('home.emptyTitle')" :description="t('home.emptyState')">
        <div class="flex flex-wrap justify-center gap-2">
          <BaseButton variant="primary" :icon="PhPlus" @click="quickAdd.open()">{{ t('quickAdd.title') }}</BaseButton>
          <BaseButton :as="RouterLink" to="/deadlines" :icon="PhUploadSimple">{{ t('home.importCta') }}</BaseButton>
        </div>
      </EmptyState>

      <EmptyState v-else-if="allOpen.length === 0" :icon="PhCheckCircle" :title="t('tasks.allDoneTitle')" :description="t('tasks.allDoneText')" />

      <template v-else>
        <!-- Morning picker: first visit of the day, or "Tag ändern" -->
        <BaseCard v-if="showRitual" as="section" padding="lg" class="mb-6" aria-labelledby="h-ritual">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-muted">{{ planning ? t('today.editEyebrow') : t('today.suggested') }}</p>
              <h2 id="h-ritual" class="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">
                {{ planning ? t('today.editTitle') : t('today.ritualTitle') }}
              </h2>
              <p class="mt-1 text-sm text-ink-muted">{{ planning ? t('today.editText', { count: limit }) : t('today.ritualText') }}</p>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <AreaFilter :tasks="allOpen" />
              <TagFilter :tasks="allOpen" />
            </div>
          </div>

          <div v-if="ritualList.length === 0" class="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-line px-4 py-3 text-sm text-ink-muted">
            {{ t('areas.emptyText') }}
            <BaseButton size="sm" @click="resetFilters">{{ t('tags.resetFilters') }}</BaseButton>
          </div>
          <ul v-else class="mt-5 divide-y divide-line overflow-hidden rounded-lg border border-line">
            <li v-for="task in ritualList" :key="task._id">
              <label
                :class="[
                  'flex items-center gap-3 px-4 py-2.5 transition-colors duration-150',
                  !selected.includes(task._id) && limitReached ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-surface-muted/50',
                ]"
              >
                <input
                  type="checkbox"
                  class="size-4 shrink-0 accent-[var(--dd-ink)]"
                  :checked="selected.includes(task._id)"
                  :disabled="!selected.includes(task._id) && limitReached"
                  @change="toggleSelected(task._id)"
                />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-medium">{{ task._title || t('common.untitled') }}</span>
                  <span v-if="subline(task)" class="block truncate text-[13px] text-ink-muted">{{ subline(task) }}</span>
                </span>
                <span class="hidden items-center gap-1.5 sm:flex">
                  <ChecklistBadge :progress="task._checklist" />
                  <TagChip v-for="tag in tagsOf(task, tagsById)" :key="tag.id" :tag="tag" />
                  <AreaTag v-if="showAreaTags" :area="task._area" />
                </span>
                <DueBadge :code="task._status.code" :days="task._days" />
              </label>
            </li>
          </ul>

          <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p class="text-[13px] text-ink-muted" aria-live="polite">
              <span class="font-mono">{{ t('today.chosen', { count: selected.length, limit }) }}</span>
              <span v-if="limitReached && limit > 0"> · {{ t('today.limitHint') }}</span>
            </p>
            <div class="flex items-center gap-2">
              <BaseButton v-if="planning" variant="ghost" @click="planning = false">{{ t('quickAdd.cancel') }}</BaseButton>
              <BaseButton variant="primary" :icon="PhCheck" :disabled="selected.length === 0" @click="confirmRitual">
                {{ planning ? t('today.saveEdit') : t('today.start') }}
              </BaseButton>
            </div>
          </div>
        </BaseCard>

        <template v-else>
          <!-- Next action: the one thing to do now -->
          <BaseCard
            v-if="focusTask"
            padding="lg"
            class="cursor-pointer transition-colors duration-150 hover:border-line-strong"
            @click="openFromClick($event, focusTask)"
          >
            <div class="flex flex-wrap items-center justify-between gap-3">
              <p class="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-muted">{{ t('today.nextAction') }}</p>
              <p class="flex items-center gap-2 font-mono text-[12px] text-ink-muted">
                <span class="sr-only">{{ t('today.progressLabel', { done: todayDone.length, total: todayTasks.length }) }}</span>
                <span aria-hidden="true">{{ t('today.progress', { done: todayDone.length, total: todayTasks.length }) }}</span>
                <span class="flex gap-1" aria-hidden="true">
                  <span
                    v-for="(task, i) in todayTasks"
                    :key="task._id + i"
                    :class="['h-1.5 w-5 rounded-full', task._isDone ? 'bg-green-ink' : 'bg-line-strong']"
                  ></span>
                </span>
              </p>
            </div>
            <div class="mt-3 flex flex-wrap items-end justify-between gap-6">
              <div class="min-w-0">
                <p class="font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">
                  <button ref="focusTitle" type="button" :class="titleButton" aria-haspopup="dialog" @click="openTask(focusTask)">{{ focusTask._title || t('common.untitled') }}</button>
                </p>
                <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                  <AreaTag :area="focusTask._area" />
                  <TagChip v-for="tag in tagsOf(focusTask, tagsById)" :key="tag.id" :tag="tag" />
                  <span v-if="subline(focusTask)" class="max-w-md truncate">{{ subline(focusTask) }}</span>
                  <DueBadge :code="focusTask._status.code" :days="focusTask._days" />
                  <ChecklistBadge :progress="focusTask._checklist" />
                </div>
                <label
                  v-if="focusTask._checklist?.next"
                  class="mt-4 flex max-w-xl cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface-muted/50 px-3 py-2.5 transition-colors duration-150 hover:border-line-strong"
                >
                  <input type="checkbox" class="mt-0.5 size-4 shrink-0 accent-[var(--dd-ink)]" @change="tickStep(focusTask, $event)" />
                  <span class="min-w-0">
                    <span class="block font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('checklist.nextStep') }}</span>
                    <span class="block text-sm font-medium">{{ focusTask._checklist.next.text }}</span>
                  </span>
                </label>
              </div>
              <div class="flex flex-wrap gap-2">
                <BaseButton variant="ghost" :icon="PhArrowsClockwise" :disabled="!replacement" :title="replacement ? undefined : t('today.swapNone')" @click="swap">
                  {{ t('today.swap') }}
                </BaseButton>
                <BaseButton variant="primary" :icon="PhCheck" @click="finish(focusTask)">{{ t('tasks.markDone') }}</BaseButton>
              </div>
            </div>
          </BaseCard>

          <!-- All of today's picks done -->
          <EmptyState v-else :icon="PhCheckCircle" :title="t('today.allDoneTitle')" :description="t('today.allDoneText', { count: todayTasks.length })">
            <BaseButton v-if="replacement" :icon="PhPlus" @click="oneMore">{{ t('today.oneMore') }}</BaseButton>
          </EmptyState>

          <!-- Effort left + edit -->
          <div class="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p class="font-mono text-[13px] text-ink-muted">{{ effort }}</p>
            <BaseButton v-if="limit > 0" variant="ghost" size="sm" :icon="PhPencilSimple" @click="editDay">{{ t('today.editDay') }}</BaseButton>
          </div>

          <!-- The rest of today -->
          <BaseCard v-if="otherToday.length" padding="none" class="mt-4">
            <ul class="divide-y divide-line">
              <li
                v-for="task in otherToday"
                :key="task._id"
                class="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted/50"
                @click="openFromClick($event, task)"
              >
                <TaskCheckbox :done="task._isDone" :title="task._title || t('common.untitled')" @toggle="toggleDone(task)" />
                <div class="min-w-0 flex-1">
                  <p :class="['truncate text-sm font-medium', task._isDone && 'text-ink-muted line-through decoration-line-strong']">
                    <button type="button" :class="titleButton" aria-haspopup="dialog" @click="openTask(task)">{{ task._title || t('common.untitled') }}</button>
                  </p>
                  <p v-if="subline(task)" class="truncate text-[13px] text-ink-muted">{{ subline(task) }}</p>
                </div>
                <span class="hidden items-center gap-1.5 sm:flex">
                  <ChecklistBadge :progress="task._checklist" />
                  <TagChip v-for="tag in tagsOf(task, tagsById)" :key="tag.id" :tag="tag" />
                  <AreaTag :area="task._area" />
                </span>
                <DueBadge v-if="!task._isDone" :code="task._status.code" :days="task._days" />
              </li>
            </ul>
          </BaseCard>

          <!-- Numbers: one quiet line instead of three big cards -->
          <dl class="mt-8 flex flex-wrap gap-x-8 gap-y-2 text-[13px] text-ink-muted">
            <div class="flex items-baseline gap-2">
              <dt>{{ t('home.overdue') }}</dt>
              <dd :class="['font-mono text-[15px]', overdueCount ? 'text-red-ink' : 'text-ink']">{{ overdueCount }}</dd>
            </div>
            <div class="flex items-baseline gap-2">
              <dt>{{ t('home.urgent') }}</dt>
              <dd :class="['font-mono text-[15px]', urgentCount ? 'text-red-ink' : 'text-ink']">{{ urgentCount }}</dd>
            </div>
            <div class="flex items-baseline gap-2">
              <dt>{{ t('home.trackedTotal') }}</dt>
              <dd :class="['font-mono text-[15px]', doneTasks.length ? 'text-green-ink' : 'text-ink']">{{ doneTasks.length }}</dd>
            </div>
          </dl>

          <!-- Everything else, out of the way -->
          <section class="mt-10" aria-labelledby="h-not-today">
            <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="h-not-today" class="font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('today.notToday') }}</h2>
              <div class="flex flex-wrap items-center gap-3">
                <AreaFilter :tasks="allOpen" />
                <TagFilter :tasks="allOpen" />
                <RouterLink to="/deadlines" class="rounded text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  {{ t('home.viewAllInDeadlines') }}
                </RouterLink>
              </div>
            </div>
            <EmptyState v-if="isFiltered && openTasks.length === 0" :icon="PhFunnel" :title="t('tags.emptyFilteredTitle')" :description="t('areas.emptyText')">
              <BaseButton variant="secondary" @click="resetFilters">{{ t('tags.resetFilters') }}</BaseButton>
            </EmptyState>
            <p v-else-if="notToday.length === 0" class="text-sm text-ink-muted">{{ t('today.nothingElse') }}</p>
            <BaseCard v-else padding="none">
              <ul class="divide-y divide-line">
                <li
                  v-for="task in notToday"
                  :key="task._id"
                  class="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-muted/50"
                  @click="openFromClick($event, task)"
                >
                  <TaskCheckbox :done="task._isDone" :title="task._title || t('common.untitled')" @toggle="toggleDone(task)" />
                  <div class="min-w-0 flex-1">
                    <p class="truncate text-sm font-medium">
                      <button type="button" :class="titleButton" aria-haspopup="dialog" @click="openTask(task)">{{ task._title || t('common.untitled') }}</button>
                    </p>
                    <p v-if="subline(task)" class="truncate text-[13px] text-ink-muted">{{ subline(task) }}</p>
                  </div>
                  <span class="hidden items-center gap-1.5 sm:flex">
                    <TagChip v-for="tag in tagsOf(task, tagsById)" :key="tag.id" :tag="tag" />
                    <AreaTag v-if="showAreaTags" :area="task._area" />
                  </span>
                  <DueBadge :code="task._status.code" :days="task._days" />
                </li>
              </ul>
            </BaseCard>
          </section>
        </template>
      </template>
    </div>
  </div>
</template>
