<script setup>
import { ref } from 'vue'
import { PhTrash } from '@phosphor-icons/vue'
import { useTags } from '../composables/useTags.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { TAG_COLORS } from '../utils/tags.js'
import { TAG_SWATCH_CLASSES } from './ui/tagColors.js'
import BaseCard from './ui/BaseCard.vue'
import TagChip from './ui/TagChip.vue'

/** Manage tags: rename, pick a color, delete (with undo). */
const { tags, usage, updateTag, deleteTag, restoreTag } = useTags()
const { t } = useLocale()
const toast = useToast()

const errors = ref({})

function rename(tag, event) {
  const error = updateTag(tag.id, { name: event.target.value })
  errors.value = { ...errors.value, [tag.id]: error }
  if (error) event.target.value = tag.name
}

function remove(tag) {
  const removed = deleteTag(tag.id)
  if (!removed) return
  toast.show(t('tags.deleted', { name: tag.name, count: removed.taskIds.length }), {
    action: { label: t('ui.undo'), onClick: () => restoreTag(removed) },
  })
}
</script>

<template>
  <BaseCard padding="none">
    <p v-if="!tags.length" class="px-5 py-4 text-sm text-ink-muted">{{ t('tags.none') }}</p>
    <ul v-else class="divide-y divide-line">
      <li
        v-for="tag in tags"
        :key="tag.id"
        class="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-3 md:grid-cols-[8rem_minmax(0,1fr)_auto_4.5rem_auto]"
      >
        <span class="min-w-0"><TagChip :tag="tag" /></span>
        <div class="col-span-2 min-w-0 md:col-span-1">
          <label :for="`tag-name-${tag.id}`" class="sr-only">{{ t('tags.rename', { name: tag.name }) }}</label>
          <input
            :id="`tag-name-${tag.id}`"
            :value="tag.name"
            type="text"
            autocomplete="off"
            maxlength="30"
            :aria-invalid="errors[tag.id] ? 'true' : undefined"
            :aria-describedby="errors[tag.id] ? `tag-err-${tag.id}` : undefined"
            class="h-8 w-full rounded-md border border-transparent bg-transparent px-2 text-sm text-ink transition-colors duration-150 hover:border-line-strong focus:border-line-strong"
            @change="rename(tag, $event)"
            @keydown.enter="$event.target.blur()"
          />
          <p v-if="errors[tag.id]" :id="`tag-err-${tag.id}`" class="px-2 text-[12px] text-red-ink">{{ t('tags.error_' + errors[tag.id]) }}</p>
        </div>
        <div role="group" :aria-label="t('tags.color', { name: tag.name })" class="flex items-center gap-1">
          <button
            v-for="color in TAG_COLORS"
            :key="color"
            type="button"
            :aria-pressed="tag.color === color"
            :aria-label="t('tags.colors.' + color)"
            :title="t('tags.colors.' + color)"
            :class="[
              'flex size-6 items-center justify-center rounded-md transition-colors duration-150',
              tag.color === color ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:bg-surface-muted',
            ]"
            @click="updateTag(tag.id, { color })"
          >
            <span :class="['size-3.5 rounded-full', TAG_SWATCH_CLASSES[color]]" aria-hidden="true"></span>
          </button>
        </div>
        <span class="text-right font-mono text-[12px] text-ink-muted">{{ t('tags.usage', { count: usage.get(tag.id) || 0 }) }}</span>
        <button
          type="button"
          class="flex size-8 items-center justify-center rounded-md text-ink-muted transition-colors duration-150 hover:bg-red-soft hover:text-red-ink"
          :aria-label="t('tags.delete', { name: tag.name })"
          @click="remove(tag)"
        >
          <PhTrash class="size-4" aria-hidden="true" />
        </button>
      </li>
    </ul>
  </BaseCard>
</template>
