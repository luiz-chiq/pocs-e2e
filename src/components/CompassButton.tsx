import { useEffect, useRef } from 'react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { ShortcutBadge } from './ShortcutBadge'
import { shortcutAriaKeys, shortcutLabel } from '../shortcuts'

export function CompassButton() {
  const { state, controller } = useEditorContext()
  const { enabled } = useShortcuts()
  const compass = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (compass.current && controller) return controller.attachCompass(compass.current) }, [controller])
  const waiting = !state.ready || (state.mode === 'map' && !state.connected)
  return <button ref={compass} id="north-up" className="icon-button secondary compass-button" type="button" disabled={waiting}
    aria-label="Bússola: arraste para girar ou clique para retornar o norte para cima" aria-keyshortcuts={enabled ? shortcutAriaKeys('north', 'compassRotate') : undefined}
    title={enabled ? `Arraste para girar; clique ou use ${shortcutLabel('north')} para retornar o norte para cima. Use ${shortcutLabel('compassRotate')} para girar pelo teclado.` : 'Arraste para girar ou clique para retornar o norte para cima.'}>
    <svg className="compass-dial" viewBox="0 0 24 24" aria-hidden="true"><circle className="compass-ring" cx="12" cy="12" r="10" />
      <g className="north-indicator" style={{ transform: `rotate(${state.rotation}deg)` }}><path className="compass-north" d="M12 3 16 12H8Z" /><path className="compass-south" d="m12 21-4-9h8Z" /></g><circle className="compass-pivot" cx="12" cy="12" r="1.5" /></svg>
    <ShortcutBadge command="north" />
  </button>
}
