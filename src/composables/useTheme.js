/**
 * useTheme: dark or light mode. It remembers the choice and switches the
 * CSS by putting the class `light` on the <html> element.
 *
 * Called by: src/components/AppSidebar.vue:12 (toggle button),
 * src/views/SettingsView.vue:11 and src/views/DesignView.vue:24 (explicit
 * choice).
 *
 * In: nothing. Out: `{ theme, toggleTheme, setTheme }`. `theme` is a ref with
 * 'dark' or 'light'.
 *
 * In the background: a `watchEffect` applies the class and saves the value
 * under `duedate.theme.v1`, once at start and after every change.
 *
 * Why module level: one `theme` for the whole app; the sidebar button and the
 * settings page change the same value.
 *
 * How to read this file: `loadSavedTheme` (used one line above its
 * definition, which is fine for a `function` declaration), then the
 * `watchEffect`, which is the only place that touches the page and storage.
 */
import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'duedate.theme.v1'

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one theme for the whole app.
// loadSavedTheme is declared below; JavaScript hoists function declarations,
// so it can already be called here.
const theme = ref(loadSavedTheme())

/**
 * @returns {'dark'|'light'} the saved theme; anything other than 'light' is dark
 */
function loadSavedTheme() {
  // Blocked storage: start in the default dark theme.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' ? 'light' : 'dark'
  } catch (e) {
    console.warn('[Theme] LocalStorage read failed:', e)
    return 'dark'
  }
}

/**
 * Switches the page's CSS between dark and light.
 *
 * @param {string} value 'light' or 'dark'
 * @sideeffect adds or removes the class `light` on <html>
 */
function applyTheme(value) {
  document.documentElement.classList.toggle('light', value === 'light')
}

// `watchEffect` is like `watch` without a list: it tracks whatever you read
// inside (here `theme.value`), runs once right away and again on every change.
// The first run applies the saved theme before the page is shown.
watchEffect(() => {
  applyTheme(theme.value)
  // The theme still switches on screen if saving fails; it is just not
  // remembered after a reload.
  try {
    localStorage.setItem(STORAGE_KEY, theme.value)
  } catch (e) {
    console.warn('[Theme] LocalStorage write failed:', e)
  }
})

/** Switches dark -> light and light -> dark. */
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

/**
 * @param {string} value 'light' for light; every other value means dark
 */
function setTheme(value) {
  theme.value = value === 'light' ? 'light' : 'dark'
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ theme: import('vue').Ref<'dark'|'light'>, toggleTheme: Function, setTheme: Function }}
 */
export function useTheme() {
  return { theme, toggleTheme, setTheme }
}
