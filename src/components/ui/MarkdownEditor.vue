<script setup>
import { ref, computed, nextTick, onMounted, useId } from 'vue'
import { PhTextB, PhTextItalic, PhTextH, PhListBullets, PhListNumbers, PhLink, PhCode } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { renderMarkdown } from '../../utils/markdown.js'
import { wrapSelection, toggleLinePrefix, insertLink, continueList } from '../../utils/markdownEdit.js'

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
const emit = defineEmits(['submit'])
const model = defineModel({ type: String, default: '' })
const { t } = useLocale()

const id = `md-${useId()}`
const textarea = ref(null)
const editing = ref(props.startEditing || !model.value)
const html = computed(() => renderMarkdown(model.value))

// Opened on purpose ("+ Beschreibung"): the user wants to type right away
onMounted(() => { if (props.startEditing) textarea.value?.focus() })

async function startEdit() {
  editing.value = true
  await nextTick()
  textarea.value?.focus()
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
      <button
        v-if="!editing"
        type="button"
        class="rounded px-1 text-[13px] text-ink-muted underline-offset-4 hover:text-ink hover:underline"
        @click="startEdit"
      >{{ t('markdown.edit') }}</button>
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
      class="dd-prose cursor-text rounded-md border border-transparent px-3 py-2 -mx-3 text-sm text-ink transition-colors duration-150 hover:border-line"
      @click="(e) => !e.target.closest('a') && startEdit()"
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
