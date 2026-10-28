import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { Download, ExternalLink, FolderOpen, Save, VectorPolygon } from 'lucide-react'
import { attachSidebarScrollbar } from '../sidebar-scroll'
import { PolygonList } from './PolygonList'
import { PolygonEditor } from './PolygonEditor'
import { PolygonActions } from './PolygonActions'
import { useEditorContext } from './EditorContext'
import { KeyboardShortcuts } from './KeyboardShortcuts'
import type { PwaState } from '../hooks/usePwa'

export function Sidebar({ pwa, openShortcuts }: { pwa: PwaState; openShortcuts(): void }) {
  const { state, actions } = useEditorContext()
  const viewport = useRef<HTMLDivElement>(null), scrollbar = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (viewport.current && scrollbar.current) return attachSidebarScrollbar(viewport.current, scrollbar.current)
  }, [])
  const working = Boolean(state.action)
  const fileWaiting = state.fileBusy || !state.ready || working || (state.mode === 'detached' && !state.connected)
  const canDetach = !working && state.mode === 'main' && !Capacitor.isNativePlatform() && location.protocol !== 'file:'
  return <aside className={`polygon-sidebar${working ? ' is-working' : ''}`} aria-label="Polígonos salvos">
    <header className="sidebar-header"><div className="sidebar-heading">
      <h1 id="page-title">Polígonos</h1><span id="polygon-count" className="polygon-count" aria-live="polite">{state.items.length}</span>
      <button id="install-app" className="icon-button install-app-button" type="button" hidden={!pwa.visible} disabled={pwa.busy}
        aria-label="Instalar aplicativo" title="Instalar aplicativo" onPointerUp={event => void pwa.install(event)}><Download aria-hidden="true" /></button>
    </div></header>
    <div className="sidebar-scroll-area">
      <div ref={viewport} id="sidebar-scroll-content" className="sidebar-scroll" aria-label="Conteúdo do menu lateral" tabIndex={0}>
        <p className="collection-heading" hidden={working}>Áreas desenhadas</p>
        <div id="empty-state" className="empty-state" hidden={working || Boolean(state.items.length)}>
          <span className="empty-symbol" aria-hidden="true"><VectorPolygon /></span><h2>Seu mapa começa aqui</h2><p>Crie um polígono para delimitar<br />sua primeira área.</p>
        </div>
        <PolygonList />
        <div className="sidebar-editor" hidden={!working}>{state.mode !== 'map' && <PolygonEditor />}</div>
      </div>
      <div ref={scrollbar} className="sidebar-scrollbar" role="scrollbar" tabIndex={-1} aria-controls="sidebar-scroll-content" aria-label="Rolar menu lateral" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={0} aria-valuenow={0} aria-disabled="true"><div className="sidebar-scrollbar-thumb" /></div>
    </div>
    <div className="sidebar-actions" aria-label="Ações da aplicação">
      <div id="polygon-file-actions" className="polygon-file-actions" role="group" aria-label="Arquivos de polígonos" hidden={working || !window.polygonFiles || state.mode === 'map'} aria-busy={state.fileBusy}>
        <button id="import-polygons" className="secondary" type="button" disabled={fileWaiting} title="Acrescentar polígonos de um arquivo JSON" onClick={() => void actions?.polygonFileOperation('import')}><FolderOpen aria-hidden="true" /><span>Importar</span></button>
        <button id="export-polygons" className="secondary" type="button" disabled={fileWaiting || !state.items.length}
          title={Capacitor.getPlatform() === 'android' ? 'Escolher uma pasta, permitir o acesso e exportar os polígonos em JSON' : 'Salvar todos os polígonos em um arquivo JSON'} onClick={() => void actions?.polygonFileOperation('export')}><Save aria-hidden="true" /><span>Exportar</span></button>
      </div>
      {state.mode !== 'detached' && <div className="sidebar-utility-row" hidden={working}>
        <button id="detach-map" className="secondary detach-button" type="button" hidden={!canDetach} disabled={!state.ready} title="Abrir o mapa em outra janela" onClick={() => actions?.detach()}><ExternalLink aria-hidden="true" /><span>Separar mapa</span></button>
        <KeyboardShortcuts open={openShortcuts} />
      </div>}
      {state.mode !== 'map' && <PolygonActions />}
    </div>
  </aside>
}
