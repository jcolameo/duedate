<script setup>
import AppSidebar from './components/AppSidebar.vue'
import AppToaster from './components/ui/AppToaster.vue'
import { useLocale } from './composables/useLocale.js'

const { t } = useLocale()
</script>

<template>
  <div class="flex min-h-screen bg-canvas text-ink">
    <!-- Keyboard users can jump past the sidebar -->
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-on-accent"
      @click.prevent="$refs.main.focus()"
    >{{ t('nav.skipToContent') }}</a>
    <AppSidebar />
    <main id="main" ref="main" tabindex="-1" class="min-w-0 flex-1 outline-none">
      <RouterView />
    </main>
    <AppToaster />
  </div>
</template>
