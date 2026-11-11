<script setup>
import { computed } from 'vue'
import { PhCheck } from '@phosphor-icons/vue'
import { useLocale } from '../composables/useLocale.js'
import BaseCard from './ui/BaseCard.vue'
import BaseSelect from './ui/BaseSelect.vue'
import BaseButton from './ui/BaseButton.vue'
import InlineNotice from './ui/InlineNotice.vue'

const props = defineProps({
  userMapping: { type: Object, required: true },
  availableColumns: { type: Array, required: true },
  suggestions: { type: Array, required: true },
  hasRequiredFields: { type: Boolean, required: true },
  missingRequired: { type: Array, required: true },
})

const emit = defineEmits(['update', 'confirm'])
const { t } = useLocale()

// Order = UI order; required fields first
const FIELDS = computed(() => [
  { role: 'title', label: t('mapping.fieldTitle'), required: true },
  { role: 'deadline', label: t('mapping.fieldDeadline'), required: true },
  { role: 'category', label: t('mapping.fieldCategory') },
  { role: 'start', label: t('mapping.fieldStart') },
  { role: 'description', label: t('mapping.fieldDescription') },
  { role: 'graded', label: t('mapping.fieldGraded') },
  { role: 'files', label: t('mapping.fieldFiles') },
])

const columnOptions = computed(() => props.availableColumns.map(c => ({ value: c, label: c })))

const missingLabels = computed(() =>
  props.missingRequired.map(role => FIELDS.value.find(f => f.role === role)?.label || role).join(', '),
)

function onChange(role, value) {
  emit('update', { role, column: value || null })
}
</script>

<template>
  <BaseCard as="section" padding="lg" aria-labelledby="h-mapping">
    <h2 id="h-mapping" class="font-display text-[22px] font-bold tracking-[-0.01em]">{{ t('mapping.title') }}</h2>
    <p class="mt-1 max-w-xl text-sm text-ink-muted">{{ t('mapping.subtitle') }}</p>

    <InlineNotice v-if="missingRequired.length > 0" tone="warning" class="mt-5">
      <strong class="font-medium">{{ t('mapping.missingRequired') }}</strong> {{ missingLabels }}. {{ t('mapping.missingRequiredSuffix') }}
    </InlineNotice>

    <div class="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
      <BaseSelect
        v-for="field in FIELDS"
        :key="field.role"
        :label="field.required ? `${field.label} · ${t('mapping.required')}` : field.label"
        :model-value="userMapping[field.role] || ''"
        :options="columnOptions"
        :placeholder="t('mapping.dontAssign')"
        :aria-invalid="field.required && !userMapping[field.role] ? 'true' : undefined"
        @update:model-value="onChange(field.role, $event)"
      />
    </div>

    <div class="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
      <p class="text-[13px] text-ink-muted">{{ t('mapping.savedNote') }}</p>
      <BaseButton variant="primary" :icon="PhCheck" :disabled="!hasRequiredFields" @click="emit('confirm')">
        {{ t('mapping.confirm') }}
      </BaseButton>
    </div>
  </BaseCard>
</template>
