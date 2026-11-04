import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronDown, FolderOpen, MapPin, Save, ShieldCheck, VectorPolygon } from 'lucide-react'
import { attachSidebarScrollbar } from '../sidebar-scroll'
import { ProjectButton } from './Projects'
import { PolygonList } from './PolygonList'
import { PolygonEditor } from './PolygonEditor'
import { PolygonActions } from './PolygonActions'
import { useEditorContext, useShortcuts } from './EditorContext'
import { SettingsButton } from './Settings'
import { ShortcutBadge } from './ShortcutBadge'
import { shortcutAriaKeys, shortcutBinding, shortcutLabel } from '../shortcuts'
import { SpatialValidation } from './SpatialValidation'

const pages = [
  { id: 'polygon', label: 'Áreas', Icon: VectorPolygon },
  { id: 'point', label: 'Pontos', Icon: MapPin },
  { id: 'validation', label: 'Avisos', Icon: ShieldCheck }
] as const
type SidebarPage = typeof pages[number]['id']

export function Sidebar({ openSettings, mobile, mobileOpen, openMobile, closeMobile }: { openSettings(): void; mobile: boolean; mobileOpen: boolean; openMobile(): void; closeMobile(): void }) {
  const { state, actions } = useEditorContext()
  const { enabled } = useShortcuts()
  const [page, setPage] = useState<SidebarPage>('polygon')
  const [listNavigationActive, setListNavigationActive] = useState(false)
  const viewport = useRef<HTMLDivElement>(null), scrollbar = useRef<HTMLDivElement>(null)
  const selectedKind = state.items.find(item => item.id === state.selectedId)?.kind
  const working = Boolean(state.action)
  const fileWaiting = state.fileBusy || !state.ready || working || (state.mode === 'detached' && !state.connected)
  const areaCount = state.items.filter(item => item.kind === 'polygon').length
  const pointCount = state.items.length - areaCount
  const counts = { polygon: areaCount, point: pointCount, validation: state.validationIssues.length }
  useEffect(() => {
    if (viewport.current && scrollbar.current) return attachSidebarScrollbar(viewport.current, scrollbar.current)
  }, [])
  useLayoutEffect(() => {
    const kind = state.action ? state.draftKind : selectedKind
    if (kind) setPage(kind)
  }, [state.action, state.draftKind, state.activeId, state.selectedId, selectedKind])
  useLayoutEffect(() => {
    const focus = state.focusRequest
    if (focus?.kind === 'lists') {
      if (mobile) openMobile()
      setListNavigationActive(true)
      const frame = requestAnimationFrame(() => {
        if (document.querySelector('dialog[open]')) return
        document.querySelector<HTMLButtonElement>('.sidebar-tabs [aria-selected="true"]')?.focus({ preventScroll: true })
        if (!working && page !== 'validation') actions?.focusList(page)
      })
      return () => cancelAnimationFrame(frame)
    }
    if (focus?.kind !== 'polygon') return
    const kind = state.items.find(item => item.id === focus.id)?.kind
    if (!kind) return
    if (mobile) openMobile()
    setPage(kind)
    // O painel precisa estar visível antes de focar o card solicitado.
    const frame = requestAnimationFrame(() => {
      if (document.querySelector('dialog[open]')) return
      const card = [...document.querySelectorAll<HTMLElement>('.polygon-list > .pin')].find(item => item.dataset.polygonId === focus.id)
      card?.focus({ preventScroll: true })
      card?.scrollIntoView({ block: 'nearest' })
    })
    return () => cancelAnimationFrame(frame)
  }, [state.focusRequest])
  useLayoutEffect(() => { viewport.current?.scrollTo({ top: 0 }) }, [page])
  function changePage(next: SidebarPage) {
    if (!working && next !== 'validation' && selectedKind && next !== selectedKind) void actions?.requestExit()
    setPage(next)
  }
  function navigatePages(event: KeyboardEvent<HTMLElement>) {
    if (mobile || working || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return
    const inTabs = Boolean(target?.closest('.sidebar-tabs'))
    if (!inTabs && !enabled) return
    if (!working && page !== 'validation' && shortcutBinding('listItems', event) && !target?.closest('.polygon-list') && target?.closest('.sidebar-tabs, .sidebar-panel, #sidebar-scroll-content')) {
      event.preventDefault()
      event.stopPropagation()
      setListNavigationActive(true)
      actions?.focusList(page)
      return
    }
    if (!inTabs && !shortcutBinding('listTabs', event)) return
    const available = pages.filter(item => !working || item.id === 'validation' || item.id === state.draftKind)
    const index = available.findIndex(item => item.id === page)
    let next: number
    const direction = shortcutBinding('listTabs', event)?.step
    if (direction) next = (index + direction + available.length) % available.length
    else if (shortcutBinding('firstTab', event)) next = 0
    else if (shortcutBinding('lastTab', event)) next = available.length - 1
    else return
    event.preventDefault()
    event.stopPropagation()
    setListNavigationActive(true)
    changePage(available[next].id)
    document.getElementById(`sidebar-tab-${available[next].id}`)?.focus()
    const nextKind = available[next].id
    if (!working && nextKind !== 'validation') actions?.focusList(nextKind)
  }
  const isPoint = page === 'point'
  const EmptyIcon = isPoint ? MapPin : VectorPolygon
  const listTabs = (
    <div className="sidebar-tabs" role="tablist" hidden={working} aria-label={`Listagens: use ${shortcutLabel('listTabs')} para trocar de aba`} aria-keyshortcuts={enabled && !working ? shortcutAriaKeys('focusLists', 'listTabs') : undefined}>
      {pages.map(({ id, label, Icon }) => <button key={id} id={`sidebar-tab-${id}`} type="button" role="tab"
        aria-selected={page === id} aria-controls={`sidebar-panel-${id}`} tabIndex={page === id ? 0 : -1}
        aria-keyshortcuts={enabled && page === id ? shortcutAriaKeys('focusLists') : undefined}
        disabled={working && id !== 'validation' && id !== state.draftKind} onClick={() => changePage(id)}>
        <Icon aria-hidden="true" /><span>{label}</span><small>{counts[id]}</small><ShortcutBadge command="focusLists" available={page === id} />
        {page === id && <span className="sidebar-tab-hints" aria-hidden="true" hidden={!enabled || !listNavigationActive}>
          <ShortcutBadge command="listTabs" /><ShortcutBadge command="listTabs" bindingIndex={1} />
        </span>}
      </button>)}
    </div>
  )
  return <aside id="polygon-sidebar" className={`polygon-sidebar${working ? ' is-working' : ''}${mobile && mobileOpen ? ' is-mobile-open' : ''}`} inert={mobile && !mobileOpen} aria-label="Áreas e pontos salvos" onKeyDown={navigatePages}
    onPointerDownCapture={() => setListNavigationActive(false)}
    onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setListNavigationActive(false) }}
    onFocusCapture={event => {
      const target = event.target
      if (target.closest('input, textarea, select')) { setListNavigationActive(false); return }
      if (target.closest('.sidebar-tabs, .sidebar-panel, #sidebar-scroll-content')) setListNavigationActive(target.matches(':focus-visible'))
    }}>
    <header className="sidebar-header"><div className="sidebar-heading">
      <h1 id="page-title">Mapa</h1><span id="polygon-count" className="polygon-count" aria-live="polite">{state.items.length}</span>
      <div className="sidebar-header-actions">
        <div id="polygon-file-actions" className="polygon-file-actions" role="group" aria-label="Gerenciar áreas e pontos" hidden={working || !window.polygonFiles || state.mode === 'map'} aria-busy={state.fileBusy}>
          <button id="import-polygons" className="secondary icon-button" type="button" disabled={fileWaiting} aria-label="Importar áreas e pontos" title="Importar áreas e pontos de JSON ou GeoJSON" onClick={() => void actions?.polygonFileOperation('import')}><FolderOpen aria-hidden="true" /></button>
          <button id="export-polygons" className="secondary icon-button" type="button" disabled={fileWaiting || !state.items.length}
            aria-label="Exportar áreas e pontos" title="Selecionar áreas e pontos para exportar em JSON ou GeoJSON" onClick={() => void actions?.polygonFileOperation('export')}><Save aria-hidden="true" /></button>
        </div>
        {state.mode !== 'map' && !mobile && <SettingsButton open={openSettings} />}
        {mobile && <button id="close-mobile-lists" className="mobile-drawer-close" type="button" aria-label="Recolher listagens e ver o mapa" aria-controls="polygon-sidebar" aria-expanded={mobileOpen} onClick={closeMobile}><ChevronDown aria-hidden="true" /></button>}
      </div>
    </div></header>
    <ProjectButton />
    {!mobile && listTabs}
    <div className="sidebar-scroll-area">
      <div ref={viewport} id="sidebar-scroll-content" className="sidebar-scroll" aria-label="Conteúdo do menu lateral" tabIndex={0}>
        {pages.filter(item => item.id !== page).map(item => <section key={item.id} id={`sidebar-panel-${item.id}`} role="tabpanel" aria-labelledby={`sidebar-tab-${item.id}`} hidden />)}
        {page === 'validation' ? <section id="sidebar-panel-validation" className="sidebar-panel" role="tabpanel" aria-labelledby="sidebar-tab-validation">
          <SpatialValidation />
        </section> : <section id={`sidebar-panel-${page}`} className="sidebar-panel" role="tabpanel" aria-labelledby={`sidebar-tab-${page}`} data-feature-kind={page}>
          <div className="collection-toolbar" hidden={working}>
            <h2 className="collection-heading"><span>{isPoint ? 'Pontos criados' : 'Áreas desenhadas'}</span></h2>

          </div>
          <div id="empty-state" className="empty-state" hidden={working || counts[page] > 0}>
            <span className="empty-symbol" aria-hidden="true"><EmptyIcon /></span><h2>{isPoint ? 'Nenhum ponto criado' : 'Nenhuma área desenhada'}</h2>
            <p>{isPoint ? 'Use Criar e escolha Ponto para marcar uma posição.' : 'Use Criar e escolha Área para desenhar no mapa.'}</p>
          </div>
          <PolygonList kind={page} compact={mobile} />
          <div className="sidebar-editor" hidden={!working || page !== state.draftKind}>{state.mode !== 'map' && <PolygonEditor />}</div>
        </section>}
      </div>
      <div ref={scrollbar} className="sidebar-scrollbar" role="scrollbar" tabIndex={-1} aria-controls="sidebar-scroll-content" aria-label="Rolar menu lateral" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={0} aria-valuenow={0} aria-disabled="true"><div className="sidebar-scrollbar-thumb" /></div>
    </div>
    {mobile && listTabs}
    {!mobile && <div className="sidebar-actions" aria-label="Ações da aplicação">
      {state.mode !== 'map' && <PolygonActions />}
    </div>}
  </aside>
}
