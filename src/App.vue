<script setup>
import { useCSVImport } from './composables/useCSVImport.js'
import { useTaskEnrichment } from './composables/useTaskEnrichment.js'
import { useICSExport } from './composables/useICSExport.js'

// CSV-Import: Drag&Drop, Parsing, Datei-State
const {
  uploadedFile, isDragging, tasks, errorMessage,
  handleDragOver, handleDragLeave, handleDrop, handleFileSelect,
} = useCSVImport()

// Anreicherung: Status, Tage, Sortierung
const { enrichedTasks, exportableCount, STATUS_STYLES } = useTaskEnrichment(tasks)

// ICS-Export
const { exportMessage, exportError, exportToICS } = useICSExport(enrichedTasks)
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-white p-8">
    <header class="max-w-6xl mx-auto mb-12 text-center">
      <h1 class="text-4xl font-bold text-emerald-400">📅 DueDate</h1>
<p class="mt-2 text-slate-400">CSV rein → Kalender raus. Kein Tippen.</p>
    </header>

    <!-- Drop Zone -->
    <div class="max-w-2xl mx-auto">
      <label
        @dragover="handleDragOver"
        @dragleave="handleDragLeave"
        @drop="handleDrop"
        :class="[
          'block border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-emerald-400 bg-emerald-400/10 scale-105'
            : 'border-slate-600 bg-slate-800 hover:border-slate-500'
        ]"
      >
        <input type="file" accept=".csv" class="hidden" @change="handleFileSelect" />
        <div class="text-6xl mb-4">📂</div>
        <p class="text-xl font-semibold mb-2">CSV hier reinziehen</p>
        <p class="text-slate-400 text-sm">oder klicken zum Auswählen</p>
      </label>

      <div v-if="uploadedFile" class="mt-6 p-4 bg-slate-800 border border-emerald-400/30 rounded-xl">
        <p class="text-emerald-400 font-semibold">✅ {{ uploadedFile.name }}</p>
        <p class="text-slate-400 text-sm mt-1">
          {{ enrichedTasks.length }} Aufgaben · {{ exportableCount }} mit Datum exportierbar
        </p>
      </div>

      <div v-if="errorMessage || exportError" class="mt-6 p-4 bg-red-900/30 border border-red-500/50 rounded-xl text-red-300">
        ⚠️ {{ errorMessage || exportError }}
      </div>

      <div v-if="exportMessage" class="mt-6 p-4 bg-emerald-900/30 border border-emerald-500/50 rounded-xl text-emerald-300">
        {{ exportMessage }}
      </div>
    </div>

    <!-- Action Bar + Table -->
    <div v-if="enrichedTasks.length > 0" class="max-w-6xl mx-auto mt-12">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-2xl font-bold text-slate-200">📋 Deine Aufgaben</h2>
        <button
          @click="exportToICS"
          :disabled="exportableCount === 0"
          class="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition shadow-lg shadow-emerald-500/20"
        >
          📅 In Kalender exportieren ({{ exportableCount }})
        </button>
      </div>

      <div class="overflow-x-auto rounded-xl border border-slate-700">
        <table class="w-full text-left">
          <thead class="bg-slate-800 text-slate-300 text-sm uppercase">
            <tr>
              <th class="px-4 py-3 font-semibold">Status</th>
              <th class="px-4 py-3 font-semibold">Tage</th>
              <th class="px-4 py-3 font-semibold">Fach</th>
              <th class="px-4 py-3 font-semibold">Titel</th>
              <th class="px-4 py-3 font-semibold">Abgabe</th>
              <th class="px-4 py-3 font-semibold">Benotet</th>
            </tr>
          </thead>
          <tbody class="bg-slate-900/50">
            <tr
              v-for="(task, index) in enrichedTasks"
              :key="index"
              class="border-t border-slate-800 hover:bg-slate-800/50 transition"
            >
              <td class="px-4 py-3 align-top">
                <span :class="['inline-block px-2 py-1 rounded-md text-xs font-bold border', STATUS_STYLES[task._status.color]]">
                  {{ task._status.label }}
                </span>
              </td>
              <td class="px-4 py-3 text-sm align-top">
                <span v-if="task._days === null" class="text-slate-500">—</span>
                <span v-else-if="task._days < 0" class="text-red-400 font-mono">
                  {{ Math.abs(task._days) }}d überfällig
                </span>
                <span v-else class="text-slate-300 font-mono">in {{ task._days }}d</span>
              </td>
              <td class="px-4 py-3 text-sm text-slate-300 align-top">{{ task['Fach'] || '—' }}</td>
              <td class="px-4 py-3 text-sm text-slate-200 align-top font-medium max-w-xs">{{ task['Titel'] || '—' }}</td>
              <td class="px-4 py-3 text-sm text-slate-400 align-top whitespace-nowrap">{{ task['Abgabe'] || '—' }}</td>
              <td class="px-4 py-3 text-sm align-top">
                <span v-if="task._isGraded" class="text-amber-300">⭐ Ja</span>
                <span v-else class="text-slate-500">Nein</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>