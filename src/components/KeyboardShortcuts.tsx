import { Info } from 'lucide-react'
import { useShortcuts } from './EditorContext'

export function ShortcutSwitch({ inDialog = false }: { inDialog?: boolean }) {
  const { enabled, setEnabled } = useShortcuts()
  const id = inDialog ? 'keyboard-shortcuts-dialog-enabled' : 'keyboard-shortcuts-enabled'
  return <label className="keyboard-shortcuts-toggle">
    <input id={id} data-shortcuts-toggle type="checkbox" role="switch" aria-label="Habilitar atalhos de teclado"
      checked={enabled} onChange={event => setEnabled(event.target.checked)} /><span>{inDialog ? 'Habilitar atalhos' : 'Atalhos'}</span>
  </label>
}

export function KeyboardShortcuts({ open }: { open(): void }) {
  const { enabled } = useShortcuts()
  return <div id="keyboard-shortcuts" className="keyboard-shortcuts">
    <ShortcutSwitch />
    <span id="keyboard-shortcuts-status" data-shortcuts-status data-enabled={enabled} hidden>{enabled ? 'Ativos' : 'Desativados'}</span>
    <button id="open-keyboard-shortcuts" className="secondary icon-button" type="button" aria-label="Ver atalhos de teclado" aria-haspopup="dialog" aria-controls="keyboard-shortcuts-dialog" title="Ver atalhos de teclado" onClick={open}><Info aria-hidden="true" /></button>
  </div>
}
