import { ref, watchEffect } from 'vue'

const STORAGE_KEY = 'duedate.theme.v1'

const theme = ref(loadSavedTheme())

function loadSavedTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved === 'light' ? 'light' : 'dark'
  } catch (e) {
    console.warn('[Theme] LocalStorage read failed:', e)
    return 'dark'
  }
}

function applyTheme(value) {
  document.documentElement.classList.toggle('light', value === 'light')
}

watchEffect(() => {
  applyTheme(theme.value)
  try {
    localStorage.setItem(STORAGE_KEY, theme.value)
  } catch (e) {
    console.warn('[Theme] LocalStorage write failed:', e)
  }
})

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

function setTheme(value) {
  theme.value = value === 'light' ? 'light' : 'dark'
}

export function useTheme() {
  return { theme, toggleTheme, setTheme }
}
