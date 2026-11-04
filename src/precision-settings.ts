interface PrecisionPreferences { snapping: boolean; magnifier: boolean }
const key = 'mapa-precision'
let preferences: PrecisionPreferences = { snapping: false, magnifier: true }
const listeners = new Set<() => void>()
function read() {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? '{}')
    preferences = { snapping: value.snapping === true, magnifier: value.magnifier !== false }
  } catch { /* Mantém as preferências em memória. */ }
}
read()
export function precisionPreferences() { return preferences }
export function setPrecisionPreference(name: keyof PrecisionPreferences, enabled: boolean) {
  preferences = { ...preferences, [name]: enabled }
  try { localStorage.setItem(key, JSON.stringify(preferences)) } catch { /* Continua nesta sessão. */ }
  listeners.forEach(listener => listener())
}
function storageChanged(event: StorageEvent) {
  if (event.storageArea !== localStorage || (event.key !== key && event.key !== null)) return
  read(); listeners.forEach(listener => listener())
}
export function subscribePrecision(listener: () => void) {
  if (!listeners.size) window.addEventListener('storage', storageChanged)
  listeners.add(listener)
  return () => { listeners.delete(listener); if (!listeners.size) window.removeEventListener('storage', storageChanged) }
}
