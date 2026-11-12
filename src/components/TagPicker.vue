<script setup>
import { ref, computed, useId } from 'vue'
import { PhPlus } from '@phosphor-icons/vue'
import { useTags } from '../composables/useTags.js'
import { useLocale } from '../composables/useLocale.js'
import { normalizeTagName, tagsOf } from '../utils/tags.js'
import TagChip from './ui/TagChip.vue'

/**
 * Tags of one task: chips with remove buttons, plus an input with
 * suggestions (native datalist) that adds an existing tag or creates a new
 * one on Enter. Comma also adds, so several tags can be typed in a row.
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
const { tags, tagsById, ensureTags } = useTags()
const { t } = useLocale()

const id = `tags-${useId()}`
const draft = ref('')
const selected = computed(() => tagsOf({ tags: props.modelValue }, tagsById.value))
const suggestions = computed(() => tags.value.filter(tag => !props.modelValue.includes(tag.id)))

function add() {
  const name = normalizeTagName(draft.value)
  draft.value = ''
  if (!name) return
  const [tagId] = ensureTags([name])
  if (tagId && !props.modelValue.includes(tagId)) emit('update:modelValue', [...props.modelValue, tagId])
}

function remove(tagId) {
  emit('update:modelValue', props.modelValue.filter(x => x !== tagId))
}

function onKeydown(e) {
  if ((e.key === 'Enter' || e.key === ',') && !e.isComposing) {
    e.preventDefault()
    add()
  } else if (e.key === 'Backspace' && !draft.value && props.modelValue.length) {
    remove(props.modelValue[props.modelValue.length - 1])
  }
}
</script>

<template>
  <div class="space-y-1.5">
    <label :for="id" class="text-[13px] font-medium text-ink">{{ t('tags.title') }}</label>
    <div class="flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2 py-1.5 transition-colors duration-150 focus-within:border-ink-muted hover:border-ink-muted">
      <TagChip v-for="tag in selected" :key="tag.id" :tag="tag" removable @remove="remove(tag.id)" />
      <span class="flex min-w-32 flex-1 items-center gap-1">
        <PhPlus class="size-3.5 shrink-0 text-ink-muted" aria-hidden="true" />
        <input
          :id="id"
          v-model="draft"
          type="text"
          autocomplete="off"
          :list="`${id}-list`"
          :placeholder="t('tags.placeholder')"
          class="h-6 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
          @keydown="onKeydown"
          @blur="add"
        />
      </span>
      <datalist :id="`${id}-list`">
        <option v-for="tag in suggestions" :key="tag.id" :value="tag.name" />
      </datalist>
    </div>
    <p class="text-[13px] text-ink-muted">{{ t('tags.hint') }}</p>
  </div>
</template>
