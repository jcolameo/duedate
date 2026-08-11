import { ref } from 'vue'
import { de } from '../locales/de.js'
import { en } from '../locales/en.js'

const STORAGE_KEY = 'duedate.locale.v1'
const DICTIONARIES = { de, en }

/**
 * Shared module-level locale state (same singleton pattern as the other
 * composables), persisted to localStorage. Defaults to German — matches
 * the founder's context and most of the app's original copy.
 */
function loadSavedLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'en' ? 'en' : 'de'
  } catch (e) {
    console.warn('[Locale] LocalStorage read failed:', e)
    return 'de'
  }
}

const locale = ref(loadSavedLocale())

function setLocale(code) {
  locale.value = code === 'en' ? 'en' : 'de'
  try {
    localStorage.setItem(STORAGE_KEY, locale.value)
  } catch (e) {
    console.warn('[Locale] LocalStorage write failed:', e)
  }
}

function resolve(key, dict) {
  return key.split('.').reduce((obj, part) => (obj && obj[part] !== undefined ? obj[part] : undefined), dict)
}

/**
 * Looks up `key` (dot-notation, e.g. "deadlines.title") in the active
 * dictionary, falling back to German if missing, then to the raw key if
 * still missing. Supports {placeholder} interpolation via `params`.
 */
function t(key, params = {}) {
  let str = resolve(key, DICTIONARIES[locale.value])
  if (str === undefined) str = resolve(key, de)
  if (str === undefined) {
    console.warn(`[Locale] Missing translation key: ${key}`)
    return key
  }
  return str.replace(/\{(\w+)\}/g, (_, name) => (params[name] !== undefined ? params[name] : `{${name}}`))
}

export function useLocale() {
  return { locale, setLocale, t }
}
