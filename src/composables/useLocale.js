/**
 * useLocale: the app's language switch and the `t()` function that turns a
 * text key like 'deadlines.title' into German or English text.
 *
 * Called by: almost every component and view, for example
 * src/App.vue:17, src/views/SettingsView.vue:12 (the language switch),
 * src/views/HomeView.vue:48, src/components/TaskDetail.vue:39,
 * src/components/ui/DueBadge.vue:20, and inside this folder by most other
 * composables.
 *
 * In: nothing. Out: `{ locale, setLocale, t }`. `locale` is a ref with 'de'
 * or 'en', `setLocale(code)` changes it, `t(key, params)` returns the text.
 *
 * In the background: `setLocale` writes `duedate.locale.v1` to localStorage
 * directly (no watch here). The dictionaries live in src/locales/.
 *
 * Why module level: `locale` exists once. Because `t()` reads `locale.value`,
 * every template that calls `t()` re-renders after a language switch.
 *
 * How to read this file: `t()` is what everybody uses; read it first, then
 * `resolve()` which walks the dotted key. `setLocale` is the only writer.
 */
import { ref } from 'vue'
import { de } from '../locales/de.js'
import { en } from '../locales/en.js'

const STORAGE_KEY = 'duedate.locale.v1'
const DICTIONARIES = { de, en }

/**
 * Shared module-level locale state (same singleton pattern as the other
 * composables), persisted to localStorage. Defaults to German — matches
 * the founder's context and most of the app's original copy.
 *
 * @returns {'de'|'en'} the saved language; anything other than 'en' is German
 */
function loadSavedLocale() {
  // Blocked storage: fall back to German instead of breaking every text.
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'de'
  } catch (e) {
    console.warn('[Locale] LocalStorage read failed:', e)
    return 'de'
  }
}

// `ref` is like a field in a React class component's `state`, but you read
// and write `.value` instead of calling `setState`.
// Module singleton: like a `static` field in Java, one language for the whole app.
const locale = ref(loadSavedLocale())

/**
 * Switches the language and remembers it.
 *
 * @param {string} code 'en' for English; every other value means German
 * @sideeffect sets `locale`, writes `duedate.locale.v1`
 */
function setLocale(code) {
  locale.value = code === 'en' ? 'en' : 'de'
  // The language already changed in memory; a failed save only means the
  // next start is German again.
  try {
    localStorage.setItem(STORAGE_KEY, locale.value)
  } catch (e) {
    console.warn('[Locale] LocalStorage write failed:', e)
  }
}

/**
 * Walks a dotted key through a nested dictionary:
 * 'common.days.Mon' -> dict.common.days.Mon.
 *
 * @param {string} key dotted key
 * @param {object} dict the dictionary
 * @returns {*} the value found, or undefined if any part is missing
 */
function resolve(key, dict) {
  // reduce goes one level deeper per key part; once a part is missing, `obj`
  // is undefined and stays undefined for the rest of the parts.
  return key.split('.').reduce((obj, part) => (obj && obj[part] !== undefined ? obj[part] : undefined), dict)
}

/**
 * Looks up `key` (dot-notation, e.g. "deadlines.title") in the active
 * dictionary, falling back to German if missing, then to the raw key if
 * still missing. Supports {placeholder} interpolation via `params`.
 *
 * @param {string} key dotted text key
 * @param {Object<string, *>} [params] values for `{name}` placeholders
 * @returns {string} the translated text, or the key itself if unknown
 */
function t(key, params = {}) {
  let str = resolve(key, DICTIONARIES[locale.value])
  // An English text that was not translated yet: show German rather than nothing.
  if (str === undefined) str = resolve(key, de)
  // The key exists in no dictionary (typo, or text not added yet): show the
  // key itself so the gap is visible on screen.
  if (str === undefined) {
    console.warn(`[Locale] Missing translation key: ${key}`)
    return key
  }
  // HINWEIS: If the key points to a group instead of a text (e.g. 'common'),
  // `str` is an object and str.replace throws a TypeError.
  // Regex: `{` + a word + `}`. Matches "{count}" and "{file}", not "{ count }"
  // (spaces) or "{}" (empty). Unknown placeholders stay as they are.
  return str.replace(/\{(\w+)\}/g, (_, name) => (params[name] !== undefined ? params[name] : `{${name}}`))
}

/**
 * Composable: a plain function that returns reactive state. Vue has no special
 * syntax for it, the `use` prefix is a convention.
 *
 * @returns {{ locale: import('vue').Ref<'de'|'en'>, setLocale: Function, t: Function }}
 */
export function useLocale() {
  return { locale, setLocale, t }
}
