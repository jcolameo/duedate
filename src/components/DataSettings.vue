<script setup>
import { ref, computed } from 'vue'
import { PhDownloadSimple, PhUploadSimple, PhTrash, PhShieldCheck } from '@phosphor-icons/vue'
import { useBackup } from '../composables/useBackup.js'
import { useLocale } from '../composables/useLocale.js'
import BaseCard from './ui/BaseCard.vue'
import BaseButton from './ui/BaseButton.vue'
import BaseDialog from './ui/BaseDialog.vue'
import InlineNotice from './ui/InlineNotice.vue'

/**
 * Settings section "Daten und Backup" (B7): download everything as one file,
 * restore from a file (preview first, replaces only after confirmation) and
 * delete all data. Restore and delete reload the page afterwards.
 */
const { current, lastBackup, exportBackup, readFile, restore, wipe } = useBackup()
const { t, locale } = useLocale()

const fmt = (iso) => new Date(iso).toLocaleString(locale.value === 'de' ? 'de-CH' : 'en-GB', { dateStyle: 'medium', timeStyle: 'short' })

const lastText = computed(() => (lastBackup.value ? t('backup.last', { date: fmt(lastBackup.value) }) : t('backup.never')))
const currentText = computed(() => t('backup.current', { tasks: current.value.tasks, tags: current.value.tags, blocks: current.value.blocks }))

// --- Restore ---------------------------------------------------------------
const fileError = ref(null)
const pending = ref(null) // { fileName, backup, summary }
const restoreOpen = ref(false)
const safetyBackup = ref(true)

async function onFile(event) {
  const file = event.target.files?.[0]
  event.target.value = '' // the same file can be chosen again
  if (!file) return
  fileError.value = null
  const result = await readFile(file)
  if (result.error) {
    fileError.value = result.error
    return
  }
  pending.value = { fileName: file.name, ...result }
  safetyBackup.value = true
  restoreOpen.value = true
}

// Give the browser a moment to start the safety download before reloading
function afterDownload(action) {
  setTimeout(action, 500)
}

function confirmRestore() {
  const { backup, summary } = pending.value
  if (safetyBackup.value) {
    exportBackup()
    afterDownload(() => restore(backup, summary))
  } else {
    restore(backup, summary)
  }
}

const rows = computed(() => (pending.value
  ? [
      ['tasks', current.value.tasks, pending.value.summary.tasks],
      ['tags', current.value.tags, pending.value.summary.tags],
      ['blocks', current.value.blocks, pending.value.summary.blocks],
    ]
  : []))

// --- Delete everything -----------------------------------------------------
const wipeOpen = ref(false)
const wipeBackup = ref(true)

function confirmWipe() {
  if (wipeBackup.value) {
    exportBackup()
    afterDownload(wipe)
  } else {
    wipe()
  }
}

const checkbox = 'size-4 shrink-0 accent-[var(--dd-ink)]'
</script>

<template>
  <BaseCard padding="none">
    <!-- Export -->
    <div class="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
      <div class="min-w-0 flex-1 basis-72">
        <p class="text-sm font-medium">{{ t('backup.exportTitle') }}</p>
        <p class="text-[13px] text-ink-muted">{{ t('backup.exportText') }}</p>
        <p class="mt-1 font-mono text-[12px] text-ink-muted">{{ currentText }} · {{ lastText }}</p>
      </div>
      <BaseButton variant="primary" class="shrink-0" :icon="PhDownloadSimple" @click="exportBackup">{{ t('backup.download') }}</BaseButton>
    </div>

    <!-- Import -->
    <div class="border-t border-line px-5 py-4">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="min-w-0 flex-1 basis-72">
          <p class="text-sm font-medium">{{ t('backup.importTitle') }}</p>
          <p class="text-[13px] text-ink-muted">{{ t('backup.importText') }}</p>
        </div>
        <BaseButton as="label" :icon="PhUploadSimple" class="shrink-0 cursor-pointer has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-offset-2 has-[input:focus-visible]:outline-focus">
          <input type="file" accept=".json,application/json" class="sr-only" @change="onFile" />
          {{ t('backup.chooseFile') }}
        </BaseButton>
      </div>
      <InlineNotice v-if="fileError" tone="error" class="mt-3">{{ t('backup.error_' + fileError.code, fileError.params) }}</InlineNotice>
    </div>

    <!-- Delete -->
    <div class="flex flex-wrap items-center justify-between gap-4 border-t border-line px-5 py-4">
      <div class="min-w-0 flex-1 basis-72">
        <p class="text-sm font-medium">{{ t('backup.wipeTitle') }}</p>
        <p class="text-[13px] text-ink-muted">{{ t('backup.wipeText') }}</p>
      </div>
      <BaseButton variant="danger" class="shrink-0" :icon="PhTrash" @click="wipeOpen = true">{{ t('backup.wipe') }}</BaseButton>
    </div>
  </BaseCard>

  <p class="mt-3 flex items-start gap-2 text-[13px] text-ink-muted">
    <PhShieldCheck class="mt-0.5 size-4 shrink-0" aria-hidden="true" />{{ t('backup.privacy') }}
  </p>

  <!-- Restore: preview and confirm -->
  <BaseDialog v-model:open="restoreOpen" :title="t('backup.restoreTitle')" :description="t('backup.restoreText')">
    <div v-if="pending">
      <p class="break-all font-mono text-[12px] text-ink-muted">{{ pending.fileName }}</p>
      <p v-if="pending.backup.exportedAt" class="font-mono text-[12px] text-ink-muted">{{ t('backup.savedOn', { date: fmt(pending.backup.exportedAt) }) }}</p>
      <table class="mt-3 w-full text-sm">
        <thead>
          <tr class="font-mono text-[11px] uppercase tracking-[0.06em] text-ink-muted">
            <th scope="col" class="py-1 text-left font-normal"><span class="sr-only">{{ t('backup.what') }}</span></th>
            <th scope="col" class="py-1 text-right font-normal">{{ t('backup.now') }}</th>
            <th scope="col" class="py-1 text-right font-normal">{{ t('backup.fromFile') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="[key, now, next] in rows" :key="key">
            <th scope="row" class="py-2 text-left font-normal">{{ t('backup.item_' + key) }}</th>
            <td class="py-2 text-right font-mono text-ink-muted">{{ now }}</td>
            <td class="py-2 text-right font-mono font-medium">{{ next }}</td>
          </tr>
        </tbody>
      </table>
      <label class="mt-4 flex cursor-pointer items-start gap-2.5 text-sm">
        <input v-model="safetyBackup" type="checkbox" :class="[checkbox, 'mt-0.5']" />
        <span>{{ t('backup.safetyFirst') }}</span>
      </label>
    </div>
    <template #actions>
      <BaseButton variant="ghost" @click="restoreOpen = false">{{ t('quickAdd.cancel') }}</BaseButton>
      <BaseButton variant="primary" @click="confirmRestore">{{ t('backup.replace') }}</BaseButton>
    </template>
  </BaseDialog>

  <!-- Delete: confirm -->
  <BaseDialog v-model:open="wipeOpen" :title="t('backup.wipeDialogTitle')" :description="t('backup.wipeDialogText', { tasks: current.tasks })">
    <label class="flex cursor-pointer items-start gap-2.5 text-sm">
      <input v-model="wipeBackup" type="checkbox" :class="[checkbox, 'mt-0.5']" />
      <span>{{ t('backup.safetyFirst') }}</span>
    </label>
    <template #actions>
      <BaseButton variant="ghost" @click="wipeOpen = false">{{ t('quickAdd.cancel') }}</BaseButton>
      <BaseButton variant="primary" :icon="PhTrash" @click="confirmWipe">{{ t('backup.wipeConfirm') }}</BaseButton>
    </template>
  </BaseDialog>
</template>
