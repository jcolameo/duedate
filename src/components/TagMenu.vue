<script setup>
import { ref, computed, watch, nextTick, onBeforeUnmount, useId } from 'vue'
import { PhCaretLeft, PhX, PhPencilSimple, PhCheck, PhTrash, PhPlus } from '@phosphor-icons/vue'
import { useTags } from '../composables/useTags.js'
import { useLocale } from '../composables/useLocale.js'
import { useToast } from '../composables/useToast.js'
import { TAG_COLORS, normalizeTagName, findTagByName, nextTagColor } from '../utils/tags.js'
import { TAG_COLOR_CLASSES, TAG_SWATCH_CLASSES } from './ui/tagColors.js'
import BaseButton from './ui/BaseButton.vue'
import TagChip from './ui/TagChip.vue'

/**
 * Trello-like tag menu (B5c): search, tick tags on/off for this task, edit a
 * tag (name, color, delete) or create a new one. Non-modal popover inside
 * the task panel: Esc / click outside closes it, focus returns to the button.
 */
const props = defineProps({
  modelValue: { type: Array, default: () => [] },
})
const emit = defineEmits(['update:modelValue'])
const { tags, usage, ensureTags, updateTag, deleteTag, restoreTag } = useTags()
const { t } = useLocale()
const toast = useToast()

const uid = useId()
const open = ref(false)
const view = ref('list') // 'list' | 'edit' | 'create'
const search = ref('')
const editId = ref(null)
const draftName = ref('')
const draftColor = ref('gray')
const error = ref(null)

const root = ref(null)
const trigger = ref(null)
const searchInput = ref(null)
const nameInput = ref(null)

const filtered = computed(() => {
  const q = normalizeTagName(search.value).toLocaleLowerCase('de-CH')
  return [...tags.value]
    .sort((a, b) => a.name.localeCompare(b.name, 'de-CH'))
    .filter(tag => !q || tag.name.toLocaleLowerCase('de-CH').includes(q))
})
const exactMatch = computed(() => findTagByName(tags.value, search.value))
const preview = computed(() => ({ name: normalizeTagName(draftName.value) || t('tags.previewName'), color: draftColor.value }))

async function focus(el) {
  await nextTick()
  el.value?.focus()
}

function toggleMenu() {
  open.value ? close() : openMenu()
}
function openMenu() {
  open.value = true
  view.value = 'list'
  search.value = ''
  focus(searchInput)
}
function close({ returnFocus = true } = {}) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function toggleTag(id) {
  const has = props.modelValue.includes(id)
  emit('update:modelValue', has ? props.modelValue.filter(x => x !== id) : [...props.modelValue, id])
}

function startEdit(tag) {
  view.value = 'edit'
  editId.value = tag.id
  draftName.value = tag.name
  draftColor.value = tag.color
  error.value = null
  focus(nameInput)
}
function startCreate() {
  view.value = 'create'
  editId.value = null
  draftName.value = normalizeTagName(search.value)
  draftColor.value = nextTagColor(tags.value)
  error.value = null
  focus(nameInput)
}
function back() {
  view.value = 'list'
  focus(searchInput)
}

function save() {
  if (view.value === 'create') {
    const name = normalizeTagName(draftName.value)
    if (!name) { error.value = 'empty'; return }
    if (findTagByName(tags.value, name)) { error.value = 'duplicate'; return }
    const [id] = ensureTags([name])
    updateTag(id, { color: draftColor.value })
    if (!props.modelValue.includes(id)) emit('update:modelValue', [...props.modelValue, id])
  } else {
    error.value = updateTag(editId.value, { name: draftName.value, color: draftColor.value })
    if (error.value) return
  }
  search.value = ''
  back()
}

function remove() {
  const tag = tags.value.find(x => x.id === editId.value)
  const removed = deleteTag(editId.value)
  if (!removed) return
  toast.show(t('tags.deleted', { name: tag.name, count: removed.taskIds.length }), {
    action: { label: t('ui.undo'), onClick: () => restoreTag(removed) },
  })
  back()
}

// Enter in the search: tick the exact match, or create the typed tag
function onSearchEnter() {
  if (!search.value.trim()) return
  if (exactMatch.value) { toggleTag(exactMatch.value.id); search.value = '' } else startCreate()
}

// Esc closes only the menu (or goes back), never the whole panel
function onKeydown(e) {
  if (e.key !== 'Escape') return
  e.preventDefault()
  e.stopPropagation()
  if (view.value !== 'list') back()
  else close()
}

function onPointerDown(e) {
  if (open.value && root.value && !root.value.contains(e.target)) close({ returnFocus: false })
}
watch(open, (isOpen) => {
  if (isOpen) document.addEventListener('pointerdown', onPointerDown, true)
  else document.removeEventListener('pointerdown', onPointerDown, true)
})
onBeforeUnmount(() => document.removeEventListener('pointerdown', onPointerDown, true))

defineExpose({ openMenu })
</script>

<template>
  <!-- Not "relative": the popover aligns to the positioned parent (TagPicker row),
       so it stays inside the panel even when the button sits far right -->
  <div ref="root" class="inline-block" @keydown="onKeydown">
    <button
      ref="trigger"
      type="button"
      :aria-expanded="open"
      :aria-controls="`tag-menu-${uid}`"
      class="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-line-strong px-1.5 text-[12px] text-ink-muted transition-colors duration-150 hover:border-ink-muted hover:text-ink"
      @click="toggleMenu"
    >
      <PhPlus class="size-3" aria-hidden="true" />{{ t('tags.add') }}
    </button>

    <div
      v-if="open"
      :id="`tag-menu-${uid}`"
      role="dialog"
      :aria-label="view === 'list' ? t('tags.title') : view === 'edit' ? t('tags.editTitle') : t('tags.createTitle')"
      class="dd-pop absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-line bg-surface p-3 shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
    >
      <!-- Header -->
      <div class="mb-3 flex items-center justify-between">
        <button
          v-if="view !== 'list'"
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
          :aria-label="t('tags.back')"
          @click="back"
        ><PhCaretLeft class="size-4" aria-hidden="true" /></button>
        <span v-else class="size-7"></span>
        <p class="text-[13px] font-semibold">{{ view === 'list' ? t('tags.title') : view === 'edit' ? t('tags.editTitle') : t('tags.createTitle') }}</p>
        <button
          type="button"
          class="flex size-7 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
          :aria-label="t('ui.close')"
          @click="close()"
        ><PhX class="size-4" aria-hidden="true" /></button>
      </div>

      <!-- List: search + tick tags -->
      <template v-if="view === 'list'">
        <label :for="`tag-search-${uid}`" class="sr-only">{{ t('tags.search') }}</label>
        <input
          :id="`tag-search-${uid}`"
          ref="searchInput"
          v-model="search"
          type="text"
          autocomplete="off"
          :placeholder="t('tags.search')"
          class="h-8 w-full rounded-md border border-line-strong bg-surface px-2.5 text-sm text-ink placeholder:text-ink-muted"
          @keydown.enter.prevent="onSearchEnter"
        />
        <ul v-if="filtered.length" class="mt-2 max-h-64 space-y-0.5 overflow-y-auto">
          <li v-for="tag in filtered" :key="tag.id" class="flex items-center gap-1">
            <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 py-1 hover:bg-surface-muted">
              <input type="checkbox" class="size-4 shrink-0 accent-[var(--dd-ink)]" :checked="modelValue.includes(tag.id)" @change="toggleTag(tag.id)" />
              <span :class="['flex h-7 min-w-0 flex-1 items-center rounded-md px-2 text-[13px] font-medium', TAG_COLOR_CLASSES[tag.color]]">
                <span class="truncate">{{ tag.name }}</span>
                <span class="ml-auto pl-2 font-mono text-[11px] opacity-80">{{ usage.get(tag.id) || 0 }}</span>
              </span>
            </label>
            <button
              type="button"
              class="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-muted hover:bg-surface-muted hover:text-ink"
              :aria-label="t('tags.edit', { name: tag.name })"
              @click="startEdit(tag)"
            ><PhPencilSimple class="size-3.5" aria-hidden="true" /></button>
          </li>
        </ul>
        <p v-else-if="!search" class="mt-3 text-[13px] text-ink-muted">{{ t('tags.noneYet') }}</p>
        <BaseButton class="mt-3 w-full justify-center" size="sm" :icon="PhPlus" @click="startCreate">
          {{ search.trim() && !exactMatch ? t('tags.createNamed', { name: normalizeTagName(search) }) : t('tags.create') }}
        </BaseButton>
      </template>

      <!-- Create / edit: name + color -->
      <form v-else @submit.prevent="save">
        <div class="mb-3 flex h-14 items-center justify-center rounded-lg bg-surface-muted/60">
          <TagChip :tag="preview" />
        </div>
        <label :for="`tag-name-${uid}`" class="text-[13px] font-medium">{{ t('tags.name') }}</label>
        <input
          :id="`tag-name-${uid}`"
          ref="nameInput"
          v-model="draftName"
          type="text"
          autocomplete="off"
          maxlength="30"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? `tag-err-${uid}` : undefined"
          :class="['mt-1 h-8 w-full rounded-md border bg-surface px-2.5 text-sm text-ink', error ? 'border-red-ink' : 'border-line-strong']"
        />
        <p v-if="error" :id="`tag-err-${uid}`" class="mt-1 text-[12px] text-red-ink">{{ t('tags.error_' + error) }}</p>

        <p :id="`tag-color-${uid}`" class="mt-3 text-[13px] font-medium">{{ t('tags.pickColor') }}</p>
        <div role="group" :aria-labelledby="`tag-color-${uid}`" class="mt-1.5 grid grid-cols-4 gap-1.5">
          <button
            v-for="color in TAG_COLORS"
            :key="color"
            type="button"
            :aria-pressed="draftColor === color"
            :aria-label="t('tags.colors.' + color)"
            :title="t('tags.colors.' + color)"
            :class="[
              'flex h-8 items-center justify-center rounded-md transition-[box-shadow] duration-150',
              TAG_COLOR_CLASSES[color],
              draftColor === color ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : 'hover:ring-1 hover:ring-line-strong',
            ]"
            @click="draftColor = color"
          >
            <PhCheck v-if="draftColor === color" weight="bold" class="size-3.5" aria-hidden="true" />
            <span v-else :class="['size-2.5 rounded-full', TAG_SWATCH_CLASSES[color]]" aria-hidden="true"></span>
          </button>
        </div>

        <div class="mt-4 flex items-center gap-2">
          <BaseButton v-if="view === 'edit'" variant="danger" size="sm" :icon="PhTrash" @click="remove">{{ t('tags.deleteShort') }}</BaseButton>
          <BaseButton type="submit" variant="primary" size="sm" class="ml-auto">{{ view === 'edit' ? t('tags.save') : t('tags.createShort') }}</BaseButton>
        </div>
      </form>
    </div>
  </div>
</template>

<style scoped>
.dd-pop {
  animation: dd-pop-in 140ms var(--ease-out-soft);
}
@keyframes dd-pop-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
</style>
