import { type RefObject } from 'react'
import { Capacitor } from '@capacitor/core'
import { ExternalLink, Focus, Minus, Plus } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { PolygonActions } from './PolygonActions'
import { PolygonEditor } from './PolygonEditor'
import { ShortcutBadge } from './ShortcutBadge'
import { shortcutAriaKeys } from '../shortcuts'
import { CompassButton } from './CompassButton'
export function MapPanel({ mapRef, compact, onMapInteract }: { mapRef: RefObject<HTMLDivElement | null>; compact: boolean; onMapInteract(): void }) {
  const { state, actions } = useEditorContext()
  const { enabled } = useShortcuts()
  const waiting = !state.ready || (state.mode === 'map' && !state.connected)
  const mapWindow = state.mode === 'map'
  const canDetach = state.mode === 'main' && !compact && !Capacitor.isNativePlatform() && location.protocol !== 'file:'
  const windowActionLabel = mapWindow ? 'Focar menu' : 'Separar mapa'
  return <section className="map-panel" aria-label="Editor de áreas e pontos">
    <div id="map" ref={mapRef} aria-label="Mapa para desenhar áreas e pontos" onPointerDown={onMapInteract} />
    <div id="polygon-map-labels" className="polygon-map-labels" role="group" aria-label="Nomes das áreas e pontos no mapa">
      {state.labels.map(label => <span key={label.id} data-polygon-id={label.id} className={`polygon-map-label${label.selected ? ' is-selected' : ''}`} style={{ left: `${label.x}px`, top: `${label.y}px` }} hidden={label.hidden}>{label.name}</span>)}
    </div>
    <div className="map-controls" aria-label="Ferramentas do mapa"><div className="map-navigation" role="group" aria-label="Navegação e janelas do mapa">
      <button id="zoom-in" className="icon-button secondary" type="button" disabled={waiting || !state.canZoomIn} aria-label="Aumentar zoom" title="Aumentar zoom" aria-keyshortcuts={enabled ? shortcutAriaKeys('zoomIn') : undefined} onClick={() => void actions?.navigate('zoom-in')}><Plus aria-hidden="true" /><ShortcutBadge command="zoomIn" /></button>
      <button id="zoom-out" className="icon-button secondary" type="button" disabled={waiting || !state.canZoomOut} aria-label="Diminuir zoom" title="Diminuir zoom" aria-keyshortcuts={enabled ? shortcutAriaKeys('zoomOut') : undefined} onClick={() => void actions?.navigate('zoom-out')}><Minus aria-hidden="true" /><ShortcutBadge command="zoomOut" /></button>
      {!(compact && state.mode === 'main') && <CompassButton />}
      <button id={mapWindow ? 'focus-menu' : 'detach-map'} className="icon-button secondary map-window-toggle" type="button"
        hidden={!mapWindow && !canDetach} disabled={waiting || (!mapWindow && Boolean(state.action))} aria-label={windowActionLabel}
        title={mapWindow ? 'Trazer a janela do menu para frente' : 'Abrir o mapa em outra janela'} aria-keyshortcuts={enabled && (mapWindow || !state.action) ? shortcutAriaKeys('mapWindow') : undefined}
        onClick={() => mapWindow ? actions?.focusMenu() : actions?.detach()}>
        {mapWindow ? <Focus aria-hidden="true" /> : <ExternalLink aria-hidden="true" />}<ShortcutBadge command="mapWindow" />
      </button>
    </div></div>
    <div className="map-window-menu" aria-label="Ações do mapa separado" hidden={state.mode !== 'map'}>
      <div className="map-window-actions">{state.mode === 'map' && <><PolygonEditor /><PolygonActions /></>}</div>
    </div>
  </section>
}
