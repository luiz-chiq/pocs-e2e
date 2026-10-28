import { useEffect, useRef, type RefObject } from 'react'
import { Minus, PanelsTopLeft, Plus } from 'lucide-react'
import { useEditorContext } from './EditorContext'
import { PolygonActions } from './PolygonActions'
import { PolygonEditor } from './PolygonEditor'
export function MapPanel({ mapRef }: { mapRef: RefObject<HTMLDivElement | null> }) {
  const { state, actions, controller } = useEditorContext()
  const compass = useRef<HTMLButtonElement>(null)
  useEffect(() => { if (compass.current && controller) return controller.attachCompass(compass.current) }, [controller])
  const waiting = !state.ready || (state.mode === 'map' && !state.connected)
  return <section className="map-panel" aria-label="Editor de polígonos">
    <div id="map" ref={mapRef} aria-label="Mapa para desenhar polígonos" />
    <div id="polygon-map-labels" className="polygon-map-labels" role="group" aria-label="Nomes dos polígonos no mapa">
      {state.labels.map(label => <span key={label.id} data-polygon-id={label.id} className={`polygon-map-label${label.selected ? ' is-selected' : ''}`} style={{ left: `${label.x}px`, top: `${label.y}px` }} hidden={label.hidden}>{label.name}</span>)}
    </div>
    <div className="map-controls" aria-label="Ferramentas do mapa"><div className="map-navigation" role="group" aria-label="Navegação do mapa">
      <button id="zoom-in" className="icon-button secondary" type="button" disabled={waiting || !state.canZoomIn} aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => void actions?.navigate('zoom-in')}><Plus aria-hidden="true" /></button>
      <button id="zoom-out" className="icon-button secondary" type="button" disabled={waiting || !state.canZoomOut} aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => void actions?.navigate('zoom-out')}><Minus aria-hidden="true" /></button>
      <button ref={compass} id="north-up" className="icon-button secondary compass-button" type="button" disabled={waiting} aria-label="Bússola: arraste para girar ou clique para retornar o norte para cima" title="Arraste para girar; clique para retornar o norte para cima. Use ← e → para girar pelo teclado.">
        <svg className="compass-dial" viewBox="0 0 24 24" aria-hidden="true"><circle className="compass-ring" cx="12" cy="12" r="10" />
          <g className="north-indicator" style={{ transform: `rotate(${state.rotation}deg)` }}><path className="compass-north" d="M12 3 16 12H8Z" /><path className="compass-south" d="m12 21-4-9h8Z" /></g><circle className="compass-pivot" cx="12" cy="12" r="1.5" /></svg>
      </button>
    </div></div>
    <div className="map-window-menu" aria-label="Ações do mapa separado" hidden={state.mode !== 'map'}>
      <button id="return-map" className="secondary" type="button" hidden={state.mode !== 'map' || Boolean(state.action)} disabled={Boolean(state.action)} title="Trazer o mapa de volta" onClick={() => actions?.reunite()}><PanelsTopLeft aria-hidden="true" /><span>Reunir telas</span></button>
      <div className="map-window-actions">{state.mode === 'map' && <><PolygonEditor /><PolygonActions /></>}</div>
    </div>
    <p id="map-ready" hidden={!state.ready}>Mapa ativo</p>
  </section>
}
