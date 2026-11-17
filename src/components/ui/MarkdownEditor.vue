<script setup>
/**
 * MarkdownEditor: the description field of a task. While you write it shows
 * a toolbar and a plain text box; otherwise it shows the formatted text, where
 * checklist boxes can be ticked directly (roadmap step B5b).
 *
 * Used by: src/components/TaskDetail.vue:294 (task panel) and
 * src/components/QuickAdd.vue:252 (quick capture dialog).
 *
 * Props: see the block above `defineProps`, plus `v-model` with the Markdown
 * text. Events: `submit` (Ctrl/Cmd+Enter), `checklist-toggled` (a box in the
 * formatted view was ticked), `update:modelValue`.
 *
 * In the background: switches between two modes (`editing`), moves focus with
 * `nextTick`, and renders HTML with v-html from `renderMarkdown`. Shortcuts:
 * Ctrl/Cmd+B, +I, +K, Enter continues lists, Esc leaves the editor.
 *
 * How to read this file: template first (two modes: textarea or formatted
 * view), then `startEdit` and `onFocusOut` (switching modes), then `apply` and
 * `tools` (toolbar), then `onKeydown` (shortcuts), and `onViewChange` last.
 * The text edits themselves live in src/utils/markdownEdit.js.
 */
// `<script setup>`: the whole file is one component; everything declared here
// is local to it, like the body of a React function component.
import { ref, computed, nextTick, onMounted, useId } from 'vue'
import { PhTextB, PhTextItalic, PhTextH, PhListBullets, PhListNumbers, PhListChecks, PhLink, PhCode } from '@phosphor-icons/vue'
import { useLocale } from '../../composables/useLocale.js'
import { renderMarkdown } from '../../utils/markdown.js'
import { wrapSelection, toggleLinePrefix, insertLink, continueList } from '../../utils/markdownEdit.js'
import { checklistProgress, toggleChecklistItem } from '../../utils/checklist.js'

/**
 * Props, like `props` in React, but declared as a typed object instead of
 * destructured parameters.
 * - label: name of the field, shown above it (or only for screen readers)
 * - hideLabel: keep the label for screen readers only
 * - placeholder: grey example text in the empty text box
 * - rows: visible height of the text box in lines
 * - startEditing: start in write mode and focus the box (e.g. right after
 *   "+ Beschreibung")
 */
const props = defineProps({
  label: { type: String, required: true },
  hideLabel: { type: Boolean, default: false },
  placeholder: { type: String, default: '' },
  rows: { type: Number, default: 5 },
  startEditing: { type: Boolean, default: false },
})
/**
 * Events, like a callback prop in React, but declared up front so the parent
 * can listen with `@submit="..."`.
 * - submit(): the user pressed Ctrl/Cmd+Enter (quick capture saves on it)
 * - checklist-toggled(text: string): a checkbox in the formatted view was
 *   ticked; carries the new Markdown so the parent can save it right away
 */
const emit = defineEmits(['submit', 'checklist-toggled'])
// `v-model`: two-way binding. The parent passes a value and a listener, the
// child emits the new value. Reading `model.value` gives the parent's text,
// assigning it emits `update:modelValue`.
const model = defineModel({ type: String, default: '' })
const { t } = useLocale()

// `useId()`: like React's `useId`, a unique id per instance, links the label,
// the toolbar (aria-controls) and the textarea.
const id = `md-${useId()}`
// `ref` on a DOM element: like `useRef` in React, but you read `.value`
// instead of `.current`. Filled by `ref="textarea"` in the template; it is
// null while the formatted view is shown, because the textarea is not rendered.
const textarea = ref(null)
// `ref` as state: like one field in a React class component's `state`.
// An empty text starts in write mode, because the formatted view of nothing
// would be an empty box.
const editing = ref(props.startEditing || !model.value)
// `computed`: like a value React would recompute in `render`, but cached
// until a dependency changes. The HTML for the formatted view.
// Safety: this string goes into v-html below. It is only safe because
// renderMarkdown in src/utils/markdown.js escapes everything it does not
// build itself; the security tests allow v-html in this file only.
const html = computed(() => renderMarkdown(model.value, { emptyItemLabel: t('checklist.emptyItem') }))
// `{ done, total, complete }` for the small "2/4" bar above the field, or null.
const progress = computed(() => checklistProgress(model.value))
// The formatted view's <div>, used to find a checkbox again after re-rendering.
const view = ref(null)

// Opened on purpose ("+ Beschreibung"): the user wants to type right away
// `onMounted`: like `componentDidMount` in a React class component; the
// textarea exists only from now on.
onMounted(() => { if (props.startEditing) textarea.value?.focus() })

/**
 * Switches to write mode and puts the cursor into the text box.
 *
 * @returns {Promise<void>}
 * @sideeffect sets `editing`, moves focus to the textarea
 */
async function startEdit() {
  editing.value = true
  // `nextTick`: wait until Vue has written the DOM changes, like `flushSync`
  // in reverse. Without it the textarea would not exist yet and `textarea.value`
  // would still be null.
  await nextTick()
  textarea.value?.focus()
}

// Checkboxes in the formatted text: flip the matching "[ ]" in the source.
// The view re-renders, so focus is put back on the same box afterwards.
/**
 * Handles a `change` event that bubbled up from a checkbox in the formatted view.
 *
 * @param {Event} e the change event; `e.target` is the clicked element
 * @returns {Promise<void>}
 * @sideeffect emits `update:modelValue` and `checklist-toggled`, moves focus
 */
async function onViewChange(e) {
  // Each checkbox rendered by renderMarkdown carries `data-check="<index>"`.
  // Any other change (there should be none) is ignored.
  const box = e.target.closest?.('input[data-check]')
  if (!box) return
  const index = Number(box.dataset.check)
  // Use the new text directly: model.value only updates after the parent re-renders
  const next = toggleChecklistItem(model.value, index)
  model.value = next
  emit('checklist-toggled', next)
  // The user just ticked a box with mouse or Space. The re-render replaces
  // that box with a new element, so focus would fall back to the page; wait
  // for the new DOM and put focus on the box with the same index.
  await nextTick()
  view.value?.querySelector(`input[data-check="${index}"]`)?.focus()
}

// Leaving the field shows the formatted text again (unless it is empty or
// focus moved to the toolbar)
/**
 * Called when focus leaves anything inside the write-mode box.
 *
 * @param {FocusEvent} e `currentTarget` is the box, `relatedTarget` where focus goes
 * @returns {void}
 * @sideeffect may set `editing` to false
 */
function onFocusOut(e) {
  // Focus moved from the textarea to a toolbar button (or back): still inside
  // the box, so stay in write mode.
  if (e.currentTarget.contains(e.relatedTarget)) return
  // An empty text stays in write mode, see the comment at `editing`.
  if (model.value.trim()) editing.value = false
}

/**
 * Runs one text edit (bold, list, link ...) on the textarea's current
 * selection, stores the result and restores the selection.
 *
 * @param {Function} edit a function from markdownEdit.js taking
 *   `{ value, start, end }` plus extra arguments, returning the same shape or null
 * @param {...*} args extra arguments for `edit`, e.g. the '**' marker
 * @returns {Promise<boolean|undefined>} true if the text changed, false if
 *   `edit` had nothing to do, undefined if there is no textarea
 * @sideeffect emits `update:modelValue`, moves focus and selection
 */
async function apply(edit, ...args) {
  const el = textarea.value
  // Only possible in view mode, where no textarea exists.
  if (!el) return
  const result = edit({ value: model.value, start: el.selectionStart, end: el.selectionEnd }, ...args)
  if (!result) return false
  model.value = result.value
  // Order matters: wait until Vue has written the new text into the textarea,
  // otherwise setSelectionRange would act on the old text and Vue would then
  // reset the cursor when it writes the value.
  await nextTick()
  el.focus()
  el.setSelectionRange(result.start, result.end)
  return true
}

// The toolbar buttons. `kbd` is the letter for Ctrl/Cmd+letter; tools without
// it have no shortcut. `run` applies the edit. This is a `computed` so labels
// follow a language switch.
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

// Only used for the tooltip text ("⌘B" on a Mac, "Ctrl+B" elsewhere); the
// shortcuts themselves accept both keys everywhere.
// Regex /Mac/: matches "MacIntel", does not match "Win32" or "Linux x86_64".
// HINWEIS: navigator.platform is deprecated; if a browser stops filling it,
// Mac users see "Ctrl+" in the tooltips.
const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform)
const mod = isMac ? '⌘' : 'Ctrl+'

/**
 * Keyboard handling inside the textarea: save, toolbar shortcuts, list
 * continuation and leaving the editor.
 *
 * @param {KeyboardEvent} e
 * @returns {Promise<void>}
 * @sideeffect may emit `submit`, change the text, or set `editing` to false
 */
async function onKeydown(e) {
  // Ctrl on Windows/Linux, Cmd (metaKey) on a Mac.
  const meta = e.ctrlKey || e.metaKey
  // The user wants to save from the keyboard; the parent decides what that means.
  if (meta && e.key === 'Enter') { e.preventDefault(); emit('submit'); return }
  // Ctrl/Cmd plus a letter, without Shift or Alt, so browser shortcuts like
  // Ctrl+Shift+I (developer tools) keep working.
  if (meta && !e.shiftKey && !e.altKey) {
    const tool = tools.value.find(x => x.kbd && x.kbd.toLowerCase() === e.key.toLowerCase())
    if (tool) { e.preventDefault(); tool.run(); return }
  }
  // Plain Enter inside a list item adds the next "- " or "2. ". Shift+Enter is
  // a normal line break. `isComposing` is true while an input method (e.g. for
  // Japanese) is still building a character; Enter then confirms it instead.
  if (e.key === 'Enter' && !e.shiftKey && !meta && !e.isComposing) {
    const el = textarea.value
    const result = continueList({ value: model.value, start: el.selectionStart, end: el.selectionEnd })
    // Not in a list: let the browser insert the line break as usual.
    if (result) { e.preventDefault(); await apply(() => result) }
  }
  // Esc with text: go back to the formatted view. With an empty text the
  // event is left alone, so the surrounding dialog closes on the first Esc.
  if (e.key === 'Escape' && model.value.trim()) {
    // Esc leaves the editor first; a second Esc closes the dialog
    e.preventDefault()
    e.stopPropagation()
    editing.value = false
  }
}

// Template notes for this file:
// - `v-if="editing"` / `v-else` switch between the two modes. The element of
//   the other mode is removed from the DOM, not just hidden.
// - `@mousedown.prevent` on toolbar buttons: `.prevent` calls
//   preventDefault(), so a mouse click does not take focus away from the
//   textarea. The selection stays, and focusout does not leave write mode.
// - `@focusout` (unlike `blur`) bubbles, so the wrapper hears focus leaving
//   any child.
// - `v-html="html"` inserts the rendered string as real HTML, like
//   `dangerouslySetInnerHTML` in React. See the safety note at `html`.
// - The click handler on the view skips links, labels and inputs, so a link
//   opens and a checkbox ticks instead of starting write mode.
// - `@change` on the view catches `change` events bubbling up from the
//   checkboxes inside the rendered HTML (see onViewChange).
// - `:deep(...)` in <style>: scoped styles normally stop at this component's
//   own elements; `:deep` lets them reach the rendered HTML too.
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
/* Typography for the rendered Markdown. :deep() reaches into the v-html content. */
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
/* Checklist items: no bullet, the checkbox takes its place. */
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
