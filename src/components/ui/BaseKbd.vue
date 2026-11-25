<!--
  * BaseKbd: a small grey key cap that shows a keyboard key, e.g. "N" or "Esc".
  *
  * Used by: src/components/AppSidebar.vue:58 (shortcut next to "new task"),
  * src/components/QuickAdd.vue:265 to :283 (syntax help and Shift+Enter),
  * src/views/DesignView.vue:210 to :213 (style guide).
  *
  * Props and events: none. The key text goes in the default slot, so
  * `<BaseKbd>Esc</BaseKbd>` shows "Esc". A `<slot />` is like
  * `props.children` in React.
  *
  * In the background: nothing. This file has no script at all.
  *
  * Why it is built this way: a semantic <kbd> element tells screen readers
  * that this is a key, and the shared classes keep every key cap the same.
  *
  * How to read this file: the template is the whole component. Attributes the
  * parent sets (e.g. aria-hidden in AppSidebar.vue) land on the <kbd>, because
  * Vue passes unknown attributes to the single root element.
  * The `><slot /><` without spaces is on purpose: whitespace there would show
  * up as extra space inside the key cap.
-->
<template>
  <kbd
    class="inline-flex min-w-5 items-center justify-center rounded border border-line bg-surface-muted px-1.5 text-[11px] leading-5 text-ink-muted"
  ><slot /></kbd>
</template>
