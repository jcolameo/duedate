<script setup>
import AppSidebar from './components/AppSidebar.vue'
</script>

<template>
  <div class="flex min-h-screen bg-slate-900">
    <AppSidebar />
    <div class="flex-1 min-w-0">
      <RouterView />
    </div>
  </div>
</template>