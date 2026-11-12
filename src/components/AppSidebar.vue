<script setup>
import { computed } from 'vue'
import {
  PhHouse, PhCalendarCheck, PhClock, PhCalendarDots, PhFolders, PhHeartbeat,
  PhBriefcase, PhIdentificationCard, PhSun, PhMoon, PhGear, PhPlus,
} from '@phosphor-icons/vue'
import { useTheme } from '../composables/useTheme.js'
import { useLocale } from '../composables/useLocale.js'
import { useQuickAdd } from '../composables/useQuickAdd.js'
import BaseKbd from './ui/BaseKbd.vue'

const { theme, toggleTheme } = useTheme()
const { t } = useLocale()
const quickAdd = useQuickAdd()

const NAV_ITEMS = computed(() => [
  { path: '/', label: t('nav.home'), icon: PhHouse },
  { path: '/deadlines', label: t('nav.deadlines'), icon: PhCalendarCheck },
  { path: '/stundenplan', label: t('nav.stundenplan'), icon: PhClock },
  { path: '/calendar', label: t('nav.calendar'), icon: PhCalendarDots },
])

// Future modules: shown quietly so the roadmap is visible, but not interactive
const PLANNED_ITEMS = computed(() => [
  { label: t('nav.projects'), icon: PhFolders },
  { label: t('nav.freelance'), icon: PhBriefcase },
  { label: t('nav.jobs'), icon: PhIdentificationCard },
  { label: t('nav.lifePlanner'), icon: PhHeartbeat },
])

const itemClass = 'flex items-center gap-3 rounded-md px-3 h-9 text-sm transition-colors duration-150'
// Active must look clearly different from hover: filled + bold + accent icon vs. faint tint
const activeClass = 'bg-surface-muted text-ink font-semibold [&>svg]:text-blue-ink'
const idleClass = 'text-ink-muted hover:bg-surface-muted/50 hover:text-ink'

const themeLabel = computed(() => (theme.value === 'dark' ? t('nav.lightMode') : t('nav.darkMode')))
</script>

<template>
  <aside class="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-line bg-canvas px-3 py-6">
    <!-- Logo links home but is not a nav item, so no aria-current here -->
    <RouterLink to="/" custom v-slot="{ href, navigate }">
      <a :href="href" class="mb-8 block rounded-md px-3" @click="navigate">
        <span class="font-display text-[22px] font-extrabold leading-none tracking-[-0.03em] text-ink">DueDate<span class="text-blue-ink">.</span></span>
        <span class="mt-1.5 block font-mono text-[11px] text-ink-muted">{{ t('nav.subtitle') }}</span>
      </a>
    </RouterLink>

    <!-- Quick capture: always one click (or "N") away -->
    <button
      type="button"
      :class="[itemClass, 'mb-4 w-full border border-line bg-surface text-left text-ink hover:border-line-strong']"
      aria-keyshortcuts="N"
      @click="quickAdd.open()"
    >
      <PhPlus class="size-[18px] shrink-0 text-blue-ink" aria-hidden="true" />
      <span class="flex-1">{{ t('quickAdd.title') }}</span>
      <BaseKbd aria-hidden="true">N</BaseKbd>
    </button>

    <nav :aria-label="t('nav.main')" class="flex flex-1 flex-col">
      <ul class="space-y-0.5">
        <li v-for="item in NAV_ITEMS" :key="item.path">
          <RouterLink :to="item.path" custom v-slot="{ isExactActive, href, navigate }">
            <a :href="href" :class="[itemClass, isExactActive ? activeClass : idleClass]" :aria-current="isExactActive ? 'page' : undefined" @click="navigate">
              <component :is="item.icon" class="size-[18px] shrink-0" aria-hidden="true" />
              {{ item.label }}
            </a>
          </RouterLink>
        </li>
      </ul>

      <p class="mt-8 px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">{{ t('nav.planned') }}</p>
      <ul class="mt-2 space-y-0.5" :aria-label="t('nav.planned')">
        <li
          v-for="item in PLANNED_ITEMS"
          :key="item.label"
          class="flex h-8 items-center gap-3 px-3 text-[13px] text-ink-muted"
          aria-disabled="true"
        >
          <component :is="item.icon" class="size-4 shrink-0" aria-hidden="true" />
          {{ item.label }}
        </li>
      </ul>
    </nav>

    <div class="mt-6 space-y-0.5 border-t border-line pt-4">
      <button type="button" :class="[itemClass, idleClass, 'w-full text-left']" @click="toggleTheme">
        <component :is="theme === 'dark' ? PhSun : PhMoon" class="size-[18px] shrink-0" aria-hidden="true" />
        {{ themeLabel }}
      </button>
      <RouterLink to="/settings" custom v-slot="{ isExactActive, href, navigate }">
        <a :href="href" :class="[itemClass, isExactActive ? activeClass : idleClass]" :aria-current="isExactActive ? 'page' : undefined" @click="navigate">
          <PhGear class="size-[18px] shrink-0" aria-hidden="true" />
          {{ t('nav.settings') }}
        </a>
      </RouterLink>
    </div>
  </aside>
</template>
