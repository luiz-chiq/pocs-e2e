const preferenceKey = 'polygon-keyboard-shortcuts'
let enabled = true
try { enabled = localStorage.getItem(preferenceKey) !== 'false' } catch { /* Preferência em memória. */ }
const listeners = new Set<() => void>()
export function shortcutsEnabled() { return enabled }
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
  if (!listeners.size) window.addEventListener('storage', onStorage)
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
    if (!listeners.size) window.removeEventListener('storage', onStorage)
  }
}
