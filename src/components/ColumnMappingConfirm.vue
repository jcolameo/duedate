<script setup>
import { computed } from 'vue'
import { useLocale } from '../composables/useLocale.js'

defineProps({
  userMapping: { type: Object, required: true },
  availableColumns: { type: Array, required: true },
  suggestions: { type: Array, required: true },
  hasRequiredFields: { type: Boolean, required: true },
  missingRequired: { type: Array, required: true },
})

const emit = defineEmits(['update', 'confirm'])

const { t } = useLocale()

// Felder die wir abfragen — Reihenfolge ist UI-Order
const FIELDS = computed(() => [
  { role: 'title', label: t('mapping.fieldTitle'), icon: '📝', required: true },
  { role: 'deadline', label: t('mapping.fieldDeadline'), icon: '📅', required: true },
  { role: 'start', label: t('mapping.fieldStart'), icon: '🟢', required: false },
  { role: 'category', label: t('mapping.fieldCategory'), icon: '🏷️', required: false },
  { role: 'description', label: t('mapping.fieldDescription'), icon: '📄', required: false },
  { role: 'graded', label: t('mapping.fieldGraded'), icon: '⭐', required: false },
  { role: 'files', label: t('mapping.fieldFiles'), icon: '📎', required: false },
])

function handleChange(role, event) {
  const value = event.target.value || null
  emit('update', { role, column: value })
}

function handleConfirm() {
  emit('confirm')
}
</script>

<template>
  <div class="max-w-2xl mx-auto mt-6 p-6 bg-slate-900/80 light:bg-white border border-emerald-500/30 rounded-2xl shadow-lg">
    <!-- Header -->
    <div class="flex items-start gap-3 mb-5">
      <span class="text-3xl">🤖</span>
      <div>
        <h3 class="text-lg font-bold text-emerald-300 light:text-emerald-600">{{ t('mapping.title') }}</h3>
        <p class="text-sm text-slate-400 light:text-slate-500">
          {{ t('mapping.subtitle') }}
        </p>
      </div>
    </div>

    <!-- Warning bei Missing Required -->
    <div v-if="missingRequired.length > 0" class="mb-4 p-4 bg-amber-900/30 light:bg-amber-50 border border-amber-500/40 light:border-amber-300 rounded-xl text-amber-200 light:text-amber-800 text-sm">
      ⚠️ <strong>{{ t('mapping.missingRequired') }}</strong> {{ missingRequired.join(', ') }} {{ t('mapping.missingRequiredSuffix') }}
    </div>

    <!-- Mapping Rows -->
    <div class="space-y-3">
      <div
        v-for="field in FIELDS"
        :key="field.role"
        class="flex items-center gap-3"
      >
        <!-- Label -->
        <div class="flex items-center gap-2 w-44 shrink-0">
          <span class="text-lg">{{ field.icon }}</span>
          <span class="text-sm text-slate-200 light:text-slate-700 font-medium">
            {{ field.label }}
            <span v-if="field.required" class="text-red-400">*</span>
          </span>
        </div>

        <!-- Arrow -->
        <span class="text-slate-500">→</span>

        <!-- Dropdown -->
        <select
          :value="userMapping[field.role] || ''"
          @change="handleChange(field.role, $event)"
          class="flex-1 px-3 py-2.5 bg-slate-950/60 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-200 light:text-slate-800 focus:border-emerald-400 focus:outline-none"
          :class="field.required && !userMapping[field.role] ? 'border-amber-500' : ''"
        >
          <option value="">{{ t('mapping.dontAssign') }}</option>
          <option
            v-for="col in availableColumns"
            :key="col"
            :value="col"
          >
            {{ col }}
          </option>
        </select>

        <!-- Status Indicator -->
        <span class="w-6 text-right text-sm">
          <span v-if="userMapping[field.role]" class="text-emerald-400">✓</span>
          <span v-else-if="field.required" class="text-red-400">!</span>
          <span v-else class="text-slate-600">·</span>
        </span>
      </div>
    </div>

    <!-- Confirm Button -->
    <div class="mt-6 flex items-center justify-between gap-4">
      <p class="text-xs text-slate-500">
        {{ t('mapping.savedNote') }}
      </p>
      <button
        @click="handleConfirm"
        :disabled="!hasRequiredFields"
        :class="[
          'px-6 py-2.5 font-bold rounded-xl transition shadow-lg',
          hasRequiredFields
            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-900 shadow-emerald-500/20 cursor-pointer'
            : 'bg-slate-700 light:bg-slate-200 text-slate-500 light:text-slate-400 cursor-not-allowed'
        ]"
      >
        {{ t('mapping.confirm') }}
      </button>
    </div>
  </div>
</template>
