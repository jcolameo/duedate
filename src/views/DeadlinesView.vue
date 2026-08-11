<script setup>
import { useCSVImport } from '../composables/useCSVImport.js'
import { useTaskEnrichment } from '../composables/useTaskEnrichment.js'
import { useICSExport } from '../composables/useICSExport.js'
import { useColumnMapping } from '../composables/useColumnMapping.js'

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
      <h1 class="text-4xl font-bold text-emerald-400 light:text-emerald-600">📅 Deadlines</h1>
      <p class="mt-2 text-slate-400 light:text-slate-500">CSV rein → Kalender raus. Kein Tippen.</p>
    </header>

    <!-- Anleitung für BBNet-User -->
    <div class="max-w-2xl mx-auto mb-8 p-6 bg-slate-900/60 light:bg-white border border-slate-800 light:border-slate-200 rounded-2xl">
      <details class="group">
        <summary class="flex items-center justify-between cursor-pointer list-none">
          <span class="font-semibold text-slate-200 light:text-slate-800">
            📖 So funktioniert's <span class="text-slate-500 text-sm font-normal">(für BBNet-User)</span>
          </span>
          <span class="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
        </summary>
        <ol class="mt-4 space-y-2 text-sm text-slate-300 light:text-slate-600 list-decimal list-inside">
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
        <p class="mt-4 text-xs text-slate-500 border-t border-slate-800 light:border-slate-200 pt-3">
          🔒 Alles läuft lokal in deinem Browser. Keine Daten werden hochgeladen.
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
        <p class="text-xl font-semibold mb-2">CSV hier reinziehen</p>
        <p class="text-slate-400 light:text-slate-500 text-sm">oder klicken zum Auswählen</p>
      </label>

      <div v-if="uploadedFile"
        class="mt-6 p-5 bg-slate-900 light:bg-white border border-emerald-400/30 light:border-emerald-500/40 rounded-2xl">
        <p class="text-emerald-400 light:text-emerald-600 font-semibold">✅ {{ uploadedFile.name }}</p>
        <p class="text-slate-400 light:text-slate-500 text-sm mt-1">
          {{ enrichedTasks.length }} Aufgaben · {{ exportableCount }} mit Datum exportierbar
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
        <h2 class="text-2xl font-bold text-slate-100 light:text-slate-900">📋 Deine Aufgaben</h2>
        <div class="flex items-center gap-3">
          <button v-if="isConfirmed" @click="resetMapping"
            class="px-4 py-2.5 text-sm bg-slate-800 light:bg-slate-100 hover:bg-slate-700 light:hover:bg-slate-200 text-slate-200 light:text-slate-700 rounded-xl transition border border-slate-700 light:border-slate-300"
            title="Spalten-Zuordnung anpassen">
            ⚙️ Mapping ändern
          </button>
          <button @click="exportToICS" :disabled="exportableCount === 0"
            class="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-800 light:disabled:bg-slate-200 disabled:text-slate-500 light:disabled:text-slate-400 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20">
            📅 In Kalender exportieren ({{ exportableCount }})
          </button>
        </div>
      </div>

      <div class="overflow-x-auto rounded-2xl border border-slate-800 light:border-slate-200">
        <table class="w-full text-left">
          <thead class="bg-slate-900 light:bg-slate-100 text-slate-400 light:text-slate-500 text-xs uppercase tracking-wide">
            <tr>
              <th class="px-5 py-4 font-semibold">Status</th>
              <th class="px-5 py-4 font-semibold">Tage</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.category || 'Fach' }}</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.title || 'Titel' }}</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.deadline || 'Abgabe' }}</th>
              <th class="px-5 py-4 font-semibold">{{ userMapping.graded || 'Benotet' }}</th>
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
                <span v-if="task._days === null" class="text-slate-500">—</span>
                <span v-else-if="task._days < 0" class="text-red-400 light:text-red-600 font-mono">
                  {{ Math.abs(task._days) }}d überfällig
                </span>
                <span v-else class="text-slate-300 light:text-slate-600 font-mono">in {{ task._days }}d</span>
              </td>
              <td class="px-5 py-4 text-sm text-slate-300 light:text-slate-600 align-top">{{ task._category || '—' }}</td>
              <td class="px-5 py-4 text-sm text-slate-200 light:text-slate-800 align-top font-medium max-w-xs">{{ task._title || '—' }}
              </td>
              <td class="px-5 py-4 text-sm text-slate-400 light:text-slate-500 align-top whitespace-nowrap">{{ task._deadline || '—' }}</td>
              <td class="px-5 py-4 text-sm align-top">
                <span v-if="task._isGraded" class="text-amber-300 light:text-amber-600">⭐ Ja</span>
                <span v-else class="text-slate-500">Nein</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
