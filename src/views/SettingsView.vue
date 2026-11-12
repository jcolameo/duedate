<script setup>
import { computed } from 'vue'
import { PhMoon, PhSun } from '@phosphor-icons/vue'
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'
import PageHeader from '../components/ui/PageHeader.vue'
import BaseCard from '../components/ui/BaseCard.vue'
import SegmentedControl from '../components/ui/SegmentedControl.vue'
import DataSettings from '../components/DataSettings.vue'

const { theme, setTheme } = useTheme()
const { locale, setLocale, t } = useLocale()

const themeOptions = computed(() => [
  { value: 'dark', label: t('settings.dark'), icon: PhMoon },
  { value: 'light', label: t('settings.light'), icon: PhSun },
])
// Language names stay in their own language
const localeOptions = [
  { value: 'de', label: 'Deutsch' },
  { value: 'en', label: 'English' },
]
</script>

<template>
  <div class="mx-auto max-w-3xl px-6 py-10 sm:px-10">
    <PageHeader :title="t('settings.title')" accent="." :description="t('settings.subtitle')" />

    <section class="mt-12" aria-labelledby="h-appearance">
      <h2 id="h-appearance" class="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('settings.appearance') }}</h2>
      <BaseCard padding="none">
        <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p class="text-sm font-medium">{{ t('settings.theme') }}</p>
            <p class="text-[13px] text-ink-muted">{{ t('settings.themeDescription') }}</p>
          </div>
          <SegmentedControl :label="t('settings.theme')" :options="themeOptions" :model-value="theme" @update:model-value="setTheme" />
        </div>
        <div class="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
          <div>
            <p class="text-sm font-medium">{{ t('settings.language') }}</p>
            <p class="text-[13px] text-ink-muted">{{ t('settings.languageDescription') }}</p>
          </div>
          <SegmentedControl :label="t('settings.language')" :options="localeOptions" :model-value="locale" @update:model-value="setLocale" />
        </div>
      </BaseCard>
    </section>

    <section class="mt-10" aria-labelledby="h-data">
      <h2 id="h-data" class="mb-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('backup.title') }}</h2>
      <DataSettings />
    </section>
  </div>
</template>
