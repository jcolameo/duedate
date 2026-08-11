<script setup>
import { useCSVImport } from '../composables/useCSVImport.js'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useICSExport } from '../composables/useICSExport.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'
import { useLocale } from '../composables/useLocale.js'

import ColumnMappingConfirm from '../components/ColumnMappingConfirm.vue'

// CSV-Import: Drag&Drop, Parsing, Datei-State
const {
  uploadedFile, isDragging, tasks, errorMessage,
  handleDragOver, handleDragLeave, handleDrop, handleFileSelect,
} = useCSVImport()

// Column-Mapping: Detection (runs automatically when the shared task list
// changes, see useColumnMapping.js) + State + Persistence
const {
  userMapping, suggestions, missingRequired,
  availableColumns, isConfirmed, hasRequiredFields, needsConfirmation,
  updateMapping, confirmMapping, resetMapping,
} = useColumnMapping()

// Anreicherung: Status, Tage, Sortierung
const { enrichedTasks, exportableCount, STATUS_STYLES } = useTaskEnrichment(tasks, userMapping)

// ICS-Export
const { exportMessage, exportError, exportToICS } = useICSExport(enrichedTasks)

const { locale, t } = useLocale()

function onMappingUpdate({ role, column }) {
  updateMapping(role, column)
}

function onMappingConfirm() {
  confirmMapping()
}
</script>

<template>
  <div class="min-h-screen bg-slate-950 light:bg-slate-50 text-slate-100 light:text-slate-900 p-10">
    <header class="max-w-6xl mx-auto mb-14 text-center">
      <h1 class="text-4xl font-bold text-emerald-400 light:text-emerald-600">{{ t('deadlines.title') }}</h1>
      <p class="mt-2 text-slate-400 light:text-slate-500">{{ t('deadlines.subtitle') }}</p>
    </header>

    <!-- Anleitung für BBNet-User -->
    <div class="max-w-2xl mx-auto mb-8 p-6 bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
      <details class="group">
        <summary class="flex items-center justify-between cursor-pointer list-none">
          <span class="font-semibold text-slate-200 light:text-slate-800">
            📖 {{ t('deadlines.howItWorks') }}
            <span class="text-slate-500 text-sm font-normal">{{ t('deadlines.forBBNetUsers') }}</span>
          </span>
          <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <!-- BBNet's own UI labels (in quotes) are kept in German regardless
             of app language — that's literally what BBNet displays. -->
        <ol v-if="locale === 'de'" class="mt-4 space-y-2 text-sm text-slate-300 light:text-slate-600 list-decimal list-inside">
          <li>Im <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">BBNet</span> → <span
              class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">Hausaufgabe</span> öffnen</li>
          <li>Oben rechts neben <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">«Neuer Antrag»</span> auf die
            <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">⋯</span> klicken
          </li>
          <li><span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">«Gesamte Liste exportieren»</span> wählen → CSV
            wird heruntergeladen</li>
          <li>CSV-Datei unten in die Box ziehen ⬇️</li>
          <li>Auf <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">«In Kalender exportieren»</span> klicken
          </li>
          <li>Heruntergeladene <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">.ics</span>-Datei öffnen →
            alle Termine landen im Kalender ✨</li>
        </ol>
        <ol v-else class="mt-4 space-y-2 text-sm text-slate-300 light:text-slate-600 list-decimal list-inside">
          <li>In <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">BBNet</span>, open
            <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">Hausaufgabe</span> (Homework)</li>
          <li>Click the <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">⋯</span> next to
            <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">«Neuer Antrag»</span> (New Request) in the top right
          </li>
          <li>Choose <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">«Gesamte Liste exportieren»</span>
            (Export entire list) → the CSV downloads</li>
          <li>Drag the CSV file into the box below ⬇️</li>
          <li>Click <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">«In Kalender exportieren»</span> (Export to
            calendar) below
          </li>
          <li>Open the downloaded <span class="font-mono bg-slate-950/70 light:bg-slate-100 px-1.5 py-0.5 rounded">.ics</span> file → all
            deadlines land in your calendar ✨</li>
        </ol>
        <p class="mt-4 text-xs text-slate-500 border-t border-slate-800 light:border-slate-200 pt-3">
          {{ t('deadlines.localNotice') }}
        </p>
      </details>
    </div>

    <!-- Drop Zone -->
    <div class="max-w-2xl mx-auto">
      <label @dragover="handleDragOver" @dragleave="handleDragLeave" @drop="handleDrop" :class="[
        'block border-2 border-dashed rounded-2xl p-14 text-center cursor-pointer transition-all',
        isDragging
          ? 'border-emerald-400 bg-emerald-400/10 scale-105'
          : 'border-slate-700 light:border-slate-300 bg-slate-900 light:bg-white hover:border-slate-600 light:hover:border-slate-400 hover:bg-slate-900/80 light:hover:bg-slate-50'
      ]">
        <input type="file" accept=".csv" class="hidden" @change="handleFileSelect" />
        <div class="text-6xl mb-4">📂</div>
        <p class="text-xl font-semibold mb-2">{{ t('deadlines.dropCsv') }}</p>
        <p class="text-slate-400 light:text-slate-500 text-sm">{{ t('deadlines.orClickToSelect') }}</p>
      </label>

      <div v-if="uploadedFile"
        class="mt-6 p-5 bg-slate-900 light:bg-white border border-emerald-400/30 light:border-emerald-500/40 rounded-2xl">
        <p class="text-emerald-400 light:text-emerald-600 font-semibold">✅ {{ uploadedFile.name }}</p>
        <p class="text-slate-400 light:text-slate-500 text-sm mt-1">
          {{ t('deadlines.uploadSummary', { count: enrichedTasks.length, exportable: exportableCount }) }}
        </p>
      </div>

      <div v-if="errorMessage || exportError"
        class="mt-6 p-5 bg-red-900/30 light:bg-red-50 border border-red-500/50 light:border-red-300 rounded-2xl text-red-300 light:text-red-700">
        ⚠️ {{ errorMessage || exportError }}
      </div>

      <div v-if="exportMessage"
        class="mt-6 p-5 bg-emerald-900/30 light:bg-emerald-50 border border-emerald-500/50 light:border-emerald-300 rounded-2xl text-emerald-300 light:text-emerald-700">
        {{ exportMessage }}
      </div>
    </div>

    <!-- Column Mapping Confirmation -->
    <ColumnMappingConfirm v-if="needsConfirmation" :user-mapping="userMapping" :available-columns="availableColumns"
      :suggestions="suggestions" :has-required-fields="hasRequiredFields" :missing-required="missingRequired"
      @update="onMappingUpdate" @confirm="onMappingConfirm" />

    <!-- Action Bar + Table -->
    <div v-if="enrichedTasks.length > 0" class="max-w-6xl mx-auto mt-14">
      <div class="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 class="text-2xl font-bold text-slate-100 light:text-slate-900">{{ t('deadlines.yourTasks') }}</h2>
        <div class="flex items-center gap-3">
          <button v-if="isConfirmed" @click="resetMapping"
            class="px-4 py-2.5 text-sm bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-slate-200 light:text-slate-700 rounded-xl transition border border-slate-700 light:border-slate-300"
            :title="t('deadlines.changeMappingTitle')">
            {{ t('deadlines.changeMapping') }}
          </button>
          <button @click="exportToICS" :disabled="exportableCount === 0"
            class="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 light:disabled:bg-slate-200 disabled:text-slate-500 light:disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20">
            {{ t('deadlines.exportButton', { count: exportableCount }) }}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-slate-800 light:border-slate-200">
        <table class="w-full text-left">
          <thead class="bg-slate-900 light:bg-slate-100 text-slate-400 light:text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th class="px-5 py-4 font-semibold">{{ t('deadlines.colStatus') }}</th>
              <th class="px-5 py-4 font-semibold">{{ t('deadlines.colDays') }}</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.category || t('deadlines.colSubject') }}</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.title || t('deadlines.colTitle') }}</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.deadline || t('deadlines.colDue') }}</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.graded || t('deadlines.colGraded') }}</th>
            </tr>
          </thead>
          <tbody class="bg-slate-950/40 light:bg-white">
            <tr v-for="(task, index) in enrichedTasks" :key="index"
              class="border-t border-slate-800/70 light:border-slate-200 hover:bg-slate-900/60 light:hover:bg-slate-50 transition">
              <td class="px-5 py-4 align-top">
                <span
                  :class="['inline-block px-2.5 py-1 rounded-full text-xs font-bold border', STATUS_STYLES[task._status.color]]">
                  {{ task._status.label }}
                </span>
              </td>
              <td class="px-5 py-4 text-sm align-top">
                <span v-if="task._days === null" class="text-slate-500">{{ t('common.dash') }}</span>
                <span v-else-if="task._days < 0" class="text-red-400 light:text-red-600 font-mono">
                  {{ t('deadlines.daysOverdue', { days: Math.abs(task._days) }) }}
                </span>
                <span v-else class="text-slate-300 light:text-slate-600 font-mono">{{ t('deadlines.dueInDays', { days: task._days }) }}</span>
              </td>
              <td class="px-5 py-4 text-sm text-slate-300 light:text-slate-600 align-top">{{ task._category || t('common.dash') }}</td>
              <td class="px-5 py-4 text-sm text-slate-200 light:text-slate-800 align-top font-medium max-w-xs">{{ task._title || t('common.dash') }}
              </td>
              <td class="px-5 py-4 text-sm text-slate-400 light:text-slate-500 align-top whitespace-nowrap">{{ task._deadline || t('common.dash') }}</td>
              <td class="px-5 py-4 text-sm align-top">
                <span v-if="task._isGraded" class="text-amber-300 light:text-amber-600">{{ t('deadlines.gradedYes') }}</span>
                <span v-else class="text-slate-500">{{ t('deadlines.gradedNo') }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
