import { Focus, PanelsTopLeft } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { ShortcutBadge } from './ShortcutBadge'
import { MapStatus } from './MapStatus'

export function DetachedControls() {
  const { state, actions } = useEditorContext()
  const { enabled } = useShortcuts()
  const working = Boolean(state.action)
  return <section className="detached-control-panel" aria-label="Controles da tela dividida">
    <MapStatus />
    <div className="detached-control-settings" hidden={working}>
      <div id="detached-tools" className="detached-tools" hidden={working}>
        <p id="connection-status" role="status">{state.connected ? 'Mapa conectado. Alterações sincronizadas.' : 'Conectando à janela do mapa…'}</p>
        <p className="window-hint">Arraste a janela do mapa para o outro monitor. As ações nas duas telas ficam sincronizadas.</p>
        <div className="detached-actions">
          <button id="focus-map" type="button" className="secondary" onClick={() => actions?.focusMap()}><Focus aria-hidden="true" /><span>Focar mapa</span></button>
          <button id="reunite-windows" type="button" className="secondary" title="Trazer o mapa de volta" aria-keyshortcuts={enabled ? 'M' : undefined} onClick={() => actions?.reunite()}><PanelsTopLeft aria-hidden="true" /><span>Reunir telas</span><ShortcutBadge>M</ShortcutBadge></button>
        </div>
      </div>
    </div>
  </section>
}
