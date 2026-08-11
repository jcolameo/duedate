<script setup>
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'

const { theme, setTheme } = useTheme()
const { locale, setLocale, t } = useLocale()
</script>

<template>
  <div class="min-h-screen bg-slate-950 light:bg-slate-50 text-slate-100 light:text-slate-900 p-10">
    <div class="max-w-2xl mx-auto">
      <header class="mb-10">
        <h1 class="text-3xl font-bold text-emerald-400 light:text-emerald-600">{{ t('settings.title') }}</h1>
        <p class="mt-2 text-slate-400 light:text-slate-500">{{ t('settings.subtitle') }}</p>
      </header>

      <section class="p-6 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl mb-4">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">{{ t('settings.appearance') }}</h2>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-200 light:text-slate-800">{{ t('settings.theme') }}</p>
            <p class="text-xs text-slate-500 mt-0.5">{{ t('settings.themeDescription') }}</p>
          </div>

          <div class="flex items-center gap-1 p-1 bg-slate-950/60 light:bg-slate-100 rounded-xl border border-slate-800 light:border-slate-200">
            <button type="button" @click="setTheme('dark')" :class="[
              'px-3 py-1.5 rounded-lg text-sm transition',
              theme === 'dark'
                ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
                : 'text-slate-400 hover:text-slate-200 light:hover:text-slate-700',
            ]">
              {{ t('settings.dark') }}
            </button>
            <button type="button" @click="setTheme('light')" :class="[
              'px-3 py-1.5 rounded-lg text-sm transition',
              theme === 'light'
                ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
                : 'text-slate-400 hover:text-slate-200 light:hover:text-slate-700',
            ]">
              {{ t('settings.light') }}
            </button>
          </div>
        </div>
      </section>

      <section class="p-6 bg-slate-900 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
        <h2 class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-4">{{ t('settings.language') }}</h2>

        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-slate-200 light:text-slate-800">{{ t('settings.language') }}</p>
            <p class="text-xs text-slate-500 mt-0.5">{{ t('settings.languageDescription') }}</p>
          </div>

          <div class="flex items-center gap-1 p-1 bg-slate-950/60 light:bg-slate-100 rounded-xl border border-slate-800 light:border-slate-200">
            <button type="button" @click="setLocale('de')" :class="[
              'px-3 py-1.5 rounded-lg text-sm transition',
              locale === 'de'
                ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
                : 'text-slate-400 hover:text-slate-200 light:hover:text-slate-700',
            ]">
              {{ t('settings.german') }}
            </button>
            <button type="button" @click="setLocale('en')" :class="[
              'px-3 py-1.5 rounded-lg text-sm transition',
              locale === 'en'
                ? 'bg-emerald-500/10 text-emerald-400 light:text-emerald-600 font-semibold'
                : 'text-slate-400 hover:text-slate-200 light:hover:text-slate-700',
            ]">
              {{ t('settings.english') }}
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
