const preferenceKey = 'polygon-keyboard-shortcuts'
const mobileLayout = matchMedia('(max-width: 720px)')
let enabled = true
try { enabled = localStorage.getItem(preferenceKey) !== 'false' } catch { /* Preferência em memória. */ }
const listeners = new Set<() => void>()
export function shortcutsEnabled() { return enabled && !mobileLayout.matches }
function onLayoutChange() { listeners.forEach(listener => listener()) }
export function setShortcutsEnabled(value: boolean) {
  enabled = value
  try { localStorage.setItem(preferenceKey, String(value)) } catch { /* Armazenamento indisponível. */ }
  listeners.forEach(listener => listener())
}
function onStorage(event: StorageEvent) {
  if (event.storageArea !== localStorage || (event.key !== preferenceKey && event.key !== null)) return
  enabled = event.newValue !== 'false'
  listeners.forEach(listener => listener())
}
export function subscribeShortcuts(listener: () => void) {
  if (!listeners.size) {
    window.addEventListener('storage', onStorage)
    mobileLayout.addEventListener('change', onLayoutChange)
  }
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) {
      window.removeEventListener('storage', onStorage)
      mobileLayout.removeEventListener('change', onLayoutChange)
    }
  }
}
