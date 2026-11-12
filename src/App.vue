<script setup>
import AppSidebar from './components/AppSidebar.vue'
import AppToaster from './components/ui/AppToaster.vue'
import QuickAdd from './components/QuickAdd.vue'
import TaskDetail from './components/TaskDetail.vue'
import { onMounted, onBeforeUnmount } from 'vue'
import { useLocale } from './composables/useLocale.js'
import { useQuickAdd, isTypingTarget } from './composables/useQuickAdd.js'
import { takeAfterReloadNotice } from './composables/useBackup.js'
import { useToast } from './composables/useToast.js'
import { useFileImport } from './composables/useFileImport.js'
import { dragHasFiles } from './utils/fileTypes.js'
import FileDropOverlay from './components/FileDropOverlay.vue'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const { t } = useLocale()
const quickAdd = useQuickAdd()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const { importFile } = useFileImport()

// A file dropped anywhere on the window is imported. Not on Deadlines (its own
// drop zone handles it) and not while a dialog is open (New task has its own).
const dragging = ref(false)
let dragDepth = 0
const dropAllowed = (e) => dragHasFiles(e) && route.name !== 'deadlines' && !document.querySelector('dialog[open]')
function onDragEnter(e) {
  if (!dropAllowed(e)) return
  dragDepth++
  dragging.value = true
}
function onDragOver(e) {
  if (dropAllowed(e)) e.preventDefault() // required to allow the drop
}
function onDragLeave(e) {
  if (!dragHasFiles(e)) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}
async function onDrop(e) {
  dragDepth = 0
  dragging.value = false
  if (e.defaultPrevented || !dragHasFiles(e) || route.name === 'deadlines' || document.querySelector('dialog[open]')) return
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  if (!file) return
  const result = await importFile(file)
  if (result.status === 'needs-mapping') router.push('/deadlines')
}

// "N" opens quick capture from anywhere, unless the user is typing or a dialog is open
function onGlobalKeydown(e) {
  if (e.key !== 'n' && e.key !== 'N') return
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return
  if (isTypingTarget(e.target) || document.querySelector('dialog[open]')) return
  e.preventDefault()
  quickAdd.open()
}
onMounted(() => {
  window.addEventListener('keydown', onGlobalKeydown)
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
  // After "restore backup" / "delete all data" the page reloads: say what happened
  const notice = takeAfterReloadNotice()
  if (notice?.kind === 'restored') toast.show(t('backup.restored', { count: notice.count }), { tone: 'success' })
  if (notice?.kind === 'wiped') toast.show(t('backup.wiped'), { tone: 'success' })
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
})
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
    <QuickAdd />
    <FileDropOverlay :show="dragging" />
    <TaskDetail />
    <AppToaster />
  </div>
</template>
