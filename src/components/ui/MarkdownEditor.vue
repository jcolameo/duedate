<script setup>
import { ref, computed, nextTick, onMounted, useId } from 'vue'
import { PhTextB, PhTextItalic, PhTextH, PhListBullets, PhListNumbers, PhListChecks, PhLink, PhCode } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { renderMarkdown } from '../../utils/markdown.js'
import { wrapSelection, toggleLinePrefix, insertLink, continueList } from '../../utils/markdownEdit.js'
import { checklistProgress, toggleChecklistItem } from '../../utils/checklist.js'

/**
 * Description field with Markdown (B5b): toolbar + shortcuts while writing,
 * formatted view otherwise. Click on the view (or "Bearbeiten") to write.
 * Shortcuts: Ctrl/Cmd+B, +I, +K, Enter continues lists, Ctrl/Cmd+Enter
 * emits "submit" (used by quick capture to save).
 */
const props = defineProps({
  label: { type: String, required: true },
  hideLabel: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  rows: { type: Number, default: 5 },
  /** Start in write mode (e.g. right after "+ Beschreibung") */
  startEditing: { type: Boolean, default: false },
})
const emit = defineEmits(['submit', 'checklist-toggled'])
const model = defineModel({ type: String, default: '' })
const { t } = useLocale()

const id = `md-${useId()}`
const textarea = ref(null)
const editing = ref(props.startEditing || !model.value)
const html = computed(() => renderMarkdown(model.value, { emptyItemLabel: t('checklist.emptyItem') }))
const progress = computed(() => checklistProgress(model.value))
const view = ref(null)

// Opened on purpose ("+ Beschreibung"): the user wants to type right away
onMounted(() => { if (props.startEditing) textarea.value?.focus() })

async function startEdit() {
  editing.value = true
  await nextTick()
  textarea.value?.focus()
}

// Checkboxes in the formatted text: flip the matching "[ ]" in the source.
// The view re-renders, so focus is put back on the same box afterwards.
async function onViewChange(e) {
  const box = e.target.closest?.('input[data-check]')
  if (!box) return
  const index = Number(box.dataset.check)
  // Use the new text directly: model.value only updates after the parent re-renders
  const next = toggleChecklistItem(model.value, index)
  model.value = next
  emit('checklist-toggled', next)
  await nextTick()
  view.value?.querySelector(`input[data-check="${index}"]`)?.focus()
}

// Leaving the field shows the formatted text again (unless it is empty or
// focus moved to the toolbar)
function onFocusOut(e) {
  if (e.currentTarget.contains(e.relatedTarget)) return
  if (model.value.trim()) editing.value = false
}

async function apply(edit, ...args) {
  const el = textarea.value
  if (!el) return
  const result = edit({ value: model.value, start: el.selectionStart, end: el.selectionEnd }, ...args)
  if (!result) return false
  model.value = result.value
  await nextTick()
  el.focus()
  el.setSelectionRange(result.start, result.end)
  return true
}

const tools = computed(() => [
  { key: 'bold', icon: PhTextB, label: t('markdown.bold'), kbd: 'B', run: () => apply(wrapSelection, '**', t('markdown.boldText')) },
  { key: 'italic', icon: PhTextItalic, label: t('markdown.italic'), kbd: 'I', run: () => apply(wrapSelection, '*', t('markdown.italicText')) },
  { key: 'heading', icon: PhTextH, label: t('markdown.heading'), run: () => apply(toggleLinePrefix, 'heading') },
  { key: 'bullet', icon: PhListBullets, label: t('markdown.bullet'), run: () => apply(toggleLinePrefix, 'bullet') },
  { key: 'numbered', icon: PhListNumbers, label: t('markdown.numbered'), run: () => apply(toggleLinePrefix, 'numbered') },
  { key: 'check', icon: PhListChecks, label: t('markdown.checklist'), run: () => apply(toggleLinePrefix, 'check') },
  { key: 'link', icon: PhLink, label: t('markdown.link'), kbd: 'K', run: () => apply(insertLink, t('markdown.linkText')) },
  { key: 'code', icon: PhCode, label: t('markdown.code'), run: () => apply(wrapSelection, '`', 'code') },
])

const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl+'

async function onKeydown(e) {
  const meta = e.ctrlKey || e.metaKey
  if (meta && e.key === 'Enter') { e.preventDefault(); emit('submit'); return }
  if (meta && !e.shiftKey && !e.altKey) {
    const tool = tools.value.find(x => x.kbd && x.kbd.toLowerCase() === e.key.toLowerCase())
    if (tool) { e.preventDefault(); tool.run(); return }
  }
  if (e.key === 'Enter' && !e.shiftKey && !meta && !e.isComposing) {
    const el = textarea.value
    const result = continueList({ value: model.value, start: el.selectionStart, end: el.selectionEnd })
    if (result) { e.preventDefault(); await apply(() => result) }
  }
  if (e.key === 'Escape' && model.value.trim()) {
    // Esc leaves the editor first; a second Esc closes the dialog
    e.preventDefault()
    e.stopPropagation()
    editing.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <label :for="id" :class="['text-[13px] font-medium text-ink', hideLabel && 'sr-only']" @click="startEdit">{{ label }}</label>
      <span class="flex items-center gap-3">
        <span v-if="progress" class="flex items-center gap-2 font-mono text-[12px] text-ink-muted">
          <span class="sr-only">{{ t('checklist.progressLabel', { done: progress.done, total: progress.total }) }}</span>
          <span aria-hidden="true">{{ progress.done }}/{{ progress.total }}</span>
          <span class="h-1.5 w-16 overflow-hidden rounded-full bg-line-strong/40" aria-hidden="true">
            <span class="block h-full rounded-full bg-green-ink transition-[width] duration-200" :style="{ width: `${(progress.done / progress.total) * 100}%` }"></span>
          </span>
        </span>
        <button
          v-if="!editing"
          type="button"
          class="rounded px-1 text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
          @click="startEdit"
        >{{ t('markdown.edit') }}</button>
      </span>
    </div>

    <div v-if="editing" class="rounded-md border border-line-strong bg-surface transition-colors duration-150 focus-within:border-ink-muted" @focusout="onFocusOut">
      <div role="toolbar" :aria-label="t('markdown.toolbar')" :aria-controls="id" class="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        <button
          v-for="tool in tools"
          :key="tool.key"
          type="button"
          class="flex size-7 items-center justify-center rounded text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink"
          :aria-label="tool.label"
          :title="tool.kbd ? `${tool.label} (${mod}${tool.kbd})` : tool.label"
          @mousedown.prevent
          @click="tool.run()"
        >
          <component :is="tool.icon" class="size-4" aria-hidden="true" />
        </button>
        <span class="ml-auto hidden pr-1 font-mono text-[11px] text-ink-muted sm:inline">Markdown</span>
      </div>
      <textarea
        :id="id"
        ref="textarea"
        v-model="model"
        :rows="rows"
        :placeholder="placeholder"
        class="block w-full resize-y rounded-b-md bg-transparent px-3 py-2 text-sm leading-6 text-ink placeholder:text-ink-muted focus:outline-none"
        @keydown="onKeydown"
      ></textarea>
    </div>

    <!-- Formatted view; clicking anywhere (except a link) starts editing -->
    <div
      v-else
      ref="view"
      class="dd-prose cursor-text rounded-md border border-transparent px-3 py-2 -mx-3 text-sm text-ink transition-colors duration-150 hover:border-line"
      @click="(e) => !e.target.closest('a, label, input') && startEdit()"
      @change="onViewChange"
      v-html="html"
    ></div>
  </div>
</template>

<style scoped>
.dd-prose :deep(p),
.dd-prose :deep(ul),
.dd-prose :deep(ol) {
  margin: 0 0 0.6em;
  line-height: 1.6;
}
.dd-prose :deep(:last-child) {
  margin-bottom: 0;
}
.dd-prose :deep(ul) {
  list-style: disc;
  padding-left: 1.25em;
}
.dd-prose :deep(ol) {
  list-style: decimal;
  padding-left: 1.4em;
}
.dd-prose :deep(li) {
  margin: 0.15em 0;
}
.dd-prose :deep(li::marker) {
  color: var(--dd-ink-muted);
}
.dd-prose :deep(li.dd-task) {
  margin-left: -1.25em;
  list-style: none;
}
.dd-prose :deep(li.dd-task label) {
  display: flex;
  cursor: pointer;
  align-items: flex-start;
  gap: 0.6em;
}
.dd-prose :deep(li.dd-task input) {
  margin-top: 0.3em;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  accent-color: var(--dd-green-ink);
}
.dd-prose :deep(li.dd-task input:checked + span) {
  color: var(--dd-ink-muted);
  text-decoration: line-through;
  text-decoration-color: var(--dd-line-strong);
}
.dd-prose :deep(h3),
.dd-prose :deep(h4),
.dd-prose :deep(h5) {
  margin: 0.9em 0 0.35em;
  font-weight: 600;
  line-height: 1.3;
}
.dd-prose :deep(h3:first-child),
.dd-prose :deep(h4:first-child),
.dd-prose :deep(h5:first-child) {
  margin-top: 0;
}
.dd-prose :deep(h3) {
  font-size: 1.05rem;
}
.dd-prose :deep(a) {
  color: var(--dd-blue-ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}
.dd-prose :deep(code) {
  border-radius: 4px;
  background: var(--dd-surface-muted);
  padding: 0.1em 0.35em;
  font-family: var(--font-mono);
  font-size: 0.85em;
}
</style>
