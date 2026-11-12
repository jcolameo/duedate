<script setup>
import { computed } from 'vue'
import { useTags } from '../composables/useTags.js'
import { useLocale } from '../composables/useLocale.js'
import { tagsOf } from '../utils/tags.js'
import TagChip from './ui/TagChip.vue'
import TagMenu from './TagMenu.vue'

/** Tags of one task: removable chips + the Trello-like tag menu. */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
const { tagsById } = useTags()
const { t } = useLocale()

const selected = computed(() => tagsOf({ tags: props.modelValue }, tagsById.value))
</script>

<template>
  <div class="space-y-1.5">
    <p class="text-[13px] font-medium text-ink">{{ t('tags.title') }}</p>
    <div class="relative flex flex-wrap items-center gap-1.5">
      <TagChip
        v-for="tag in selected"
        :key="tag.id"
        :tag="tag"
        removable
        @remove="emit('update:modelValue', modelValue.filter(x => x !== tag.id))"
      />
      <TagMenu :model-value="modelValue" @update:model-value="emit('update:modelValue', $event)" />
    </div>
  </div>
</template>
