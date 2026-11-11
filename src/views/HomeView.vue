<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { PhTray, PhArrowRight, PhUploadSimple } from '@phosphor-icons/vue'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useLocale } from '../composables/useLocale.js'
import { usePageEyebrow } from '../composables/usePageEyebrow.js'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import BaseButton from '../components/ui/BaseButton.vue'
import EmptyState from '../components/ui/EmptyState.vue'
import DueBadge from '../components/ui/DueBadge.vue'

const { enrichedTasks } = useTaskEnrichment()
const { t } = useLocale()
const eyebrow = usePageEyebrow()

const overdueCount = computed(() => enrichedTasks.value.filter(x => x._status.code === 'overdue').length)
const urgentCount = computed(() => enrichedTasks.value.filter(x => x._status.code === 'urgent').length)
const focusTask = computed(() => enrichedTasks.value.find(x => x._days !== null) || null)
const upcoming = computed(() => enrichedTasks.value.filter(x => x !== focusTask.value).slice(0, 5))

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
      :description="enrichedTasks.length ? summary : t('home.subtitle')"
    />

    <div class="mt-10">
      <EmptyState v-if="enrichedTasks.length === 0" :icon="PhTray" :title="t('home.emptyTitle')" :description="t('home.emptyState')">
        <BaseButton :as="RouterLink" to="/deadlines" variant="primary" :icon="PhUploadSimple">{{ t('home.importCta') }}</BaseButton>
      </EmptyState>

      <template v-else>
        <!-- Focus: the single next action -->
        <BaseCard v-if="focusTask" padding="lg" class="mb-6">
          <p class="font-mono text-[12px] uppercase tracking-[0.06em] text-ink-muted">{{ t('home.focus') }}</p>
          <div class="mt-3 flex flex-wrap items-end justify-between gap-6">
            <div class="min-w-0">
              <p class="font-display text-[28px] font-bold leading-tight tracking-[-0.02em]">
                {{ focusTask._title || t('common.untitled') }}
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-3 text-sm text-ink-muted">
                <span v-if="focusTask._category">{{ focusTask._category }}</span>
                <DueBadge :code="focusTask._status.code" :days="focusTask._days" />
              </div>
            </div>
            <BaseButton :as="RouterLink" to="/deadlines" variant="primary" :icon="PhArrowRight">{{ t('home.goToDeadlines') }}</BaseButton>
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
            <dd class="mt-1 font-mono text-[32px] leading-none">{{ enrichedTasks.length }}</dd>
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
              <li v-for="task in upcoming" :key="task._id" class="flex items-center gap-4 px-5 py-3">
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium">{{ task._title || t('common.untitled') }}</p>
                  <p v-if="task._category" class="truncate text-[13px] text-ink-muted">{{ task._category }}</p>
                </div>
                <DueBadge :code="task._status.code" :days="task._days" />
              </li>
            </ul>
          </BaseCard>
        </section>
      </template>
    </div>
  </div>
</template>
