<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { PhTray, PhArrowRight, PhUploadSimple, PhCheck, PhCheckCircle, PhFunnel, PhPlus } from '@phosphor-icons/vue'
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
import AreaFilter from '../components/AreaFilter.vue'
import AreaTag from '../components/ui/AreaTag.vue'
import { useQuickAdd } from '../composables/useQuickAdd.js'
import { useTaskDetail } from '../composables/useTaskDetail.js'

const { enrichedTasks, openTasks: allOpen, doneTasks: allDone } = useTaskEnrichment()
const { areaFilter } = useAreaFilter()
const quickAdd = useQuickAdd()
const { openTask } = useTaskDetail()
// Everything below follows the area filter (shared with Deadlines)
const openTasks = computed(() => filterByArea(allOpen.value, areaFilter.value))
const doneTasks = computed(() => filterByArea(allDone.value, areaFilter.value))
const showAreaTags = computed(() => areaFilter.value === 'all')
const { complete, toggleDone } = useTaskActions()
const { t } = useLocale()
const eyebrow = usePageEyebrow()

const overdueCount = computed(() => openTasks.value.filter(x => x._status.code === 'overdue').length)
const urgentCount = computed(() => openTasks.value.filter(x => x._status.code === 'urgent').length)
const focusTask = computed(() => openTasks.value.find(x => x._days !== null) || null)
const upcoming = computed(() => openTasks.value.filter(x => x._id !== focusTask.value?._id).slice(0, 5))

const summary = computed(() =>
  overdueCount.value + urgentCount.value === 0
    ? t('home.summaryCalm')
    : t('home.summary', { overdue: overdueCount.value, urgent: urgentCount.value }),
)
</script>

<template>
  <div class="mx-auto max-w-5xl px-6 py-10 sm:px-10">
    <PageHeader
      :eyebrow="eyebrow"
      :title="t('home.title')"
      accent="?"
      :description="openTasks.length ? summary : t('home.subtitle')"
    />

    <div v-if="allOpen.length" class="mt-8 flex justify-end">
      <AreaFilter :tasks="allOpen" />
    </div>

    <div :class="allOpen.length ? 'mt-4' : 'mt-10'">
      <EmptyState v-if="enrichedTasks.length === 0" :icon="PhTray" :title="t('home.emptyTitle')" :description="t('home.emptyState')">
        <div class="flex flex-wrap justify-center gap-2">
          <BaseButton variant="primary" :icon="PhPlus" @click="quickAdd.open()">{{ t('quickAdd.title') }}</BaseButton>
          <BaseButton :as="RouterLink" to="/deadlines" :icon="PhUploadSimple">{{ t('home.importCta') }}</BaseButton>
        </div>
      </EmptyState>

      <template v-else>
        <EmptyState v-if="openTasks.length === 0 && allOpen.length" class="mb-6" :icon="PhFunnel" :title="t('areas.emptyTitle', { area: t('areas.' + areaFilter) })" :description="t('areas.emptyText')">
          <BaseButton variant="secondary" @click="areaFilter = 'all'">{{ t('areas.showAll') }}</BaseButton>
        </EmptyState>
        <EmptyState v-else-if="openTasks.length === 0" class="mb-6" :icon="PhCheckCircle" :title="t('tasks.allDoneTitle')" :description="t('tasks.allDoneText')" />

        <!-- Focus: the single next action -->
        <BaseCard v-if="focusTask" padding="lg" class="mb-6">
          <p class="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-muted">{{ t('home.focus') }}</p>
          <div class="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div class="min-w-0">
              <p class="font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">
                <button type="button" class="rounded-sm text-left underline-offset-4 decoration-line-strong hover:underline" aria-haspopup="dialog" @click="openTask(focusTask)">{{ focusTask._title || t('common.untitled') }}</button>
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                <AreaTag v-if="showAreaTags" :area="focusTask._area" />
                <span v-if="focusTask._category">{{ focusTask._category }}</span>
                <DueBadge :code="focusTask._status.code" :days="focusTask._days" />
              </div>
            </div>
            <div class="flex flex-wrap gap-2">
              <BaseButton :as="RouterLink" to="/deadlines" variant="ghost" :icon="PhArrowRight">{{ t('home.goToDeadlines') }}</BaseButton>
              <BaseButton variant="primary" :icon="PhCheck" @click="complete(focusTask)">{{ t('tasks.markDone') }}</BaseButton>
            </div>
          </div>
        </BaseCard>

        <!-- Numbers -->
        <dl class="mb-10 grid grid-cols-3 gap-4">
          <BaseCard>
            <dt class="text-[13px] text-ink-muted">{{ t('home.overdue') }}</dt>
            <dd :class="['mt-1 font-mono text-[32px] leading-none', overdueCount ? 'text-red-ink' : 'text-ink']">{{ overdueCount }}</dd>
          </BaseCard>
          <BaseCard>
            <dt class="text-[13px] text-ink-muted">{{ t('home.urgent') }}</dt>
            <dd :class="['mt-1 font-mono text-[32px] leading-none', urgentCount ? 'text-red-ink' : 'text-ink']">{{ urgentCount }}</dd>
          </BaseCard>
          <BaseCard>
            <dt class="text-[13px] text-ink-muted">{{ t('home.trackedTotal') }}</dt>
            <dd :class="['mt-1 font-mono text-[32px] leading-none', doneTasks.length ? 'text-green-ink' : 'text-ink']">{{ doneTasks.length }}</dd>
          </BaseCard>
        </dl>

        <!-- Up next -->
        <section v-if="upcoming.length" aria-labelledby="h-upcoming">
          <div class="mb-3 flex items-baseline justify-between gap-4">
            <h2 id="h-upcoming" class="font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('home.upcoming') }}</h2>
            <RouterLink to="/deadlines" class="rounded text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
              {{ t('home.viewAllInDeadlines') }}
            </RouterLink>
          </div>
          <BaseCard padding="none">
            <ul class="divide-y divide-line">
              <li v-for="task in upcoming" :key="task._id" class="flex items-center gap-3 px-4 py-2.5">
                <TaskCheckbox :done="task._isDone" :title="task._title || t('common.untitled')" @toggle="toggleDone(task)" />
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">
                    <button type="button" class="rounded-sm text-left underline-offset-4 decoration-line-strong hover:underline" aria-haspopup="dialog" @click="openTask(task)">{{ task._title || t('common.untitled') }}</button>
                  </p>
                  <p v-if="task._category" class="truncate text-[13px] text-ink-muted">{{ task._category }}</p>
                </div>
                <AreaTag v-if="showAreaTags" :area="task._area" class="hidden sm:inline-flex" />
                <DueBadge :code="task._status.code" :days="task._days" />
              </li>
            </ul>
          </BaseCard>
        </section>
      </template>
    </div>
  </div>
</template>
