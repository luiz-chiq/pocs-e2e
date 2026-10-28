const preferenceKey = 'polygon-keyboard-shortcuts'
let enabled = true
try { enabled = localStorage.getItem(preferenceKey) !== 'false' } catch { /* A preferência continua válida nesta janela. */ }

export function shortcutsEnabled() { return enabled }

export function attachKeyboardSettings(onChange: () => void) {
  const toggles = document.querySelectorAll<HTMLInputElement>('[data-shortcuts-toggle]')
  const statuses = document.querySelectorAll<HTMLElement>('[data-shortcuts-status]')
  const dialog = document.querySelector<HTMLDialogElement>('#keyboard-shortcuts-dialog')!
  const openButton = document.querySelector<HTMLButtonElement>('#open-keyboard-shortcuts')!
  openButton.addEventListener('click', () => { if (!dialog.open) dialog.showModal() })
  document.querySelector('#close-keyboard-shortcuts')!.addEventListener('click', () => dialog.close())
  dialog.addEventListener('close', () => openButton.focus({ preventScroll: true }))
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return
    const controls = [...dialog.querySelectorAll<HTMLElement>('button, input')]
    const first = controls[0], last = controls.at(-1)!
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  })
  const update = () => {
    toggles.forEach(toggle => { toggle.checked = enabled })
    statuses.forEach(status => {
      status.textContent = enabled ? 'Ativos' : 'Desativados'
      status.dataset.enabled = String(enabled)
    })
  }
  toggles.forEach(toggle => toggle.addEventListener('change', () => {
    enabled = toggle.checked
    try { localStorage.setItem(preferenceKey, String(enabled)) } catch { /* Armazenamento indisponível. */ }
    update()
    onChange()
  }))
  window.addEventListener('storage', event => {
    if (event.storageArea !== localStorage || (event.key !== preferenceKey && event.key !== null)) return
    enabled = event.newValue !== 'false'
    update()
    onChange()
  })
  update()
}
