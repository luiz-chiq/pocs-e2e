const preferenceKey = 'polygon-keyboard-shortcuts'
let enabled = true
try { enabled = localStorage.getItem(preferenceKey) !== 'false' } catch { /* A preferência continua válida nesta janela. */ }

export function shortcutsEnabled() { return enabled }

export function attachKeyboardSettings(onChange: () => void) {
  const toggle = document.querySelector<HTMLInputElement>('#keyboard-shortcuts-enabled')!
  const status = document.querySelector<HTMLElement>('#keyboard-shortcuts-status')!
  const update = () => {
    toggle.checked = enabled
    status.textContent = enabled ? 'Ativos' : 'Desativados'
    status.dataset.enabled = String(enabled)
  }
  toggle.addEventListener('change', () => {
    enabled = toggle.checked
    try { localStorage.setItem(preferenceKey, String(enabled)) } catch { /* Armazenamento indisponível. */ }
    update()
    onChange()
  })
  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage || (event.key !== preferenceKey && event.key !== null)) return
    enabled = event.newValue !== 'false'
    update()
    onChange()
  })
  update()
}
