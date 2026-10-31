export type ThemePreference = 'light' | 'dark-black' | 'system'

const preferenceKey = 'polygon-theme'
const contrastKey = 'polygon-high-contrast'
const systemTheme = matchMedia('(prefers-color-scheme: dark)')
const listeners = new Set<() => void>()
function validPreference(value: string | null): ThemePreference {
  // Preferências dos temas removidos passam para Preto profundo.
  if (value === 'dark' || value === 'dark-soft') return 'dark-black'
  return value === 'dark-black' || value === 'system' ? value : 'light'
}
let preference: ThemePreference = 'light'
let highContrast = false
try {
  const saved = localStorage.getItem(preferenceKey)
  preference = validPreference(saved)
  if (saved && saved !== preference) localStorage.setItem(preferenceKey, preference)
} catch { /* Preferência em memória. */ }
try { highContrast = localStorage.getItem(contrastKey) === 'true' } catch { /* Preferência em memória. */ }

function applyTheme() {
  const dark = preference === 'dark-black' || (preference === 'system' && systemTheme.matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.dataset.contrast = highContrast ? 'high' : 'normal'
  document.documentElement.classList.toggle('calcite-mode-dark', dark)
  document.documentElement.classList.toggle('calcite-mode-light', !dark)
  document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', dark ? 'dark' : 'only light')
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', highContrast ? (dark ? '#000000' : '#ffffff') : (dark ? '#080808' : '#123c34'))
}
export function themePreference() { return preference }
export function highContrastEnabled() { return highContrast }
export function setHighContrast(value: boolean) {
  highContrast = value
  try { localStorage.setItem(contrastKey, String(value)) } catch { /* Armazenamento indisponível. */ }
  applyTheme()
  listeners.forEach(listener => listener())
}
export function setThemePreference(value: ThemePreference) {
  preference = value
  try { localStorage.setItem(preferenceKey, value) } catch { /* Armazenamento indisponível. */ }
  applyTheme()
  listeners.forEach(listener => listener())
}
export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
window.addEventListener('storage', event => {
  if (event.key !== preferenceKey && event.key !== contrastKey && event.key !== null) return
  // sessionStorage não compartilha as preferências entre janelas.
  try { if (event.storageArea !== localStorage) return } catch { return }
  if (event.key === preferenceKey || event.key === null) preference = validPreference(event.newValue)
  if (event.key === contrastKey || event.key === null) highContrast = event.newValue === 'true'
  applyTheme()
  listeners.forEach(listener => listener())
})
systemTheme.addEventListener('change', () => { if (preference === 'system') applyTheme() })
applyTheme()
