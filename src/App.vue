<script setup>
import AppSidebar from './components/AppSidebar.vue'
import AppToaster from './components/ui/AppToaster.vue'
</script>

<template>
  <div class="flex min-h-screen bg-slate-950 light:bg-slate-50">
    <AppSidebar />
    <div class="flex-1 min-w-0">
      <RouterView />
    </div>
    <AppToaster />
  </div>
</template>