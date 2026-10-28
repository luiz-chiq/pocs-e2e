// Navegação dos diálogos permanece disponível mesmo com atalhos globais desligados.
export function attachDialogNavigation() {
  const lifetime = new AbortController()
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('keydown', event => {
      if (event.isComposing || event.altKey || event.ctrlKey || event.metaKey) return
      const controls = [...dialog.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]')]
        .filter(control => control.tabIndex >= 0 && !control.matches(':disabled') && !control.closest('[inert]') &&
          control.getClientRects().length > 0 && getComputedStyle(control).visibility === 'visible')
      if (!controls.length) return
      const index = controls.indexOf(document.activeElement as HTMLElement)
      if (event.key === 'Tab') {
        if (event.shiftKey && index <= 0) { event.preventDefault(); controls.at(-1)!.focus() }
        else if (!event.shiftKey && (index === -1 || index === controls.length - 1)) { event.preventDefault(); controls[0].focus() }
        return
      }
      if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return
      // Respeitar o cursor de texto e os controles que já usam setas nativamente.
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest('textarea, select, [contenteditable]:not([contenteditable="false"]), input:not([type="checkbox"]):not([type="button"]):not([type="submit"])')) return
      event.preventDefault()
      event.stopPropagation()
      const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1
      const next = index < 0 ? (direction === 1 ? 0 : controls.length - 1) : (index + direction + controls.length) % controls.length
      controls[next].focus()
    }, { signal: lifetime.signal })
  })
  return () => lifetime.abort()
}
