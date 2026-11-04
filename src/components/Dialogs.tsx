import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ChevronRight, FolderOpen, MapPin, Pencil, Save, Trash2, VectorPolygon, X } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { PlaceSearchContent } from './PlaceSearch'
import { ProjectsContent } from './Projects'
import { SettingsContent } from './Settings'

function Dialog({ id, title, open, onCancel, children, className, initialFocus = '.dialog-actions button' }: { id: string; title: string; open: boolean; onCancel(): void; children: ReactNode; className?: string; initialFocus?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  const { enabled } = useShortcuts()
  useLayoutEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) {
      dialog.showModal()
      if (enabled) {
        const options = [...dialog.querySelectorAll<HTMLElement>(initialFocus)]
        const option = options.find(control => !control.matches(':disabled') && !control.closest('[hidden], [inert]') && control.getClientRects().length > 0)
        option?.focus({ preventScroll: true })
      }
    }
    if (!open && dialog.open) dialog.close()
  }, [open, enabled, initialFocus])
  return <dialog ref={ref} id={id} className={className} data-shortcuts-active={enabled ? '' : undefined} aria-labelledby={title} aria-describedby={id === 'clear-dialog' ? `${id}-description` : id.replace(/-dialog$/, '') + '-description'}
    onCancel={event => { event.preventDefault(); onCancel() }}>{children}</dialog>
}
export function Dialogs({ settingsOpen, closeSettings }: { settingsOpen: boolean; closeSettings(): void }) {
  const { state, actions } = useEditorContext()
  const [exportFormat, setExportFormat] = useState<'json' | 'geojson'>('json')
  const [exportIds, setExportIds] = useState<string[]>([])
  const [importMode, setImportMode] = useState<'add' | 'replace'>('add')
  const [deletionScope, setDeletionScope] = useState<'polygon' | 'point' | 'all'>('all')
  useLayoutEffect(() => { if (state.pendingDeletionId === 'all') setDeletionScope('all') }, [state.pendingDeletionId])
  useLayoutEffect(() => {
    if (state.fileDialog === 'export') setExportIds(state.items.map(item => item.id))
    if (state.fileDialog === 'import') setImportMode('add')
  }, [state.fileDialog])
  const polygons = state.items.filter(item => item.kind === 'polygon')
  const points = state.items.filter(item => item.kind === 'point')
  const selectedIds = state.items.filter(item => exportIds.includes(item.id)).map(item => item.id)
  const deletionCount = deletionScope === 'all' ? state.items.length : deletionScope === 'point' ? points.length : polygons.length
  const replacementCount = (state.pendingImport?.areaCount ? polygons.length : 0) + (state.pendingImport?.pointCount ? points.length : 0)
  const fileWaiting = state.fileBusy || Boolean(state.action) || (state.mode !== 'main' && !state.connected)
  const all = state.pendingDeletionId === 'all'
  const deletingPoint = state.pendingDeletionKind === 'point'
  const draftLabel = state.draftKind === 'point' ? 'ponto' : 'área'
  return <>
    <Dialog id="search-dialog" title="search-title" className="file-dialog search-dialog" initialFocus="#place-query" open={state.searchDialogOpen} onCancel={() => actions?.dismissSearch()}>
      <div className="settings-header"><h2 id="search-title">Buscar no mapa</h2><button type="button" className="secondary icon-button" aria-label="Fechar busca" onClick={() => actions?.dismissSearch()}><X aria-hidden="true" /></button></div>
      <PlaceSearchContent />
    </Dialog>
    <Dialog id="projects-dialog" title="projects-title" className="file-dialog projects-dialog" initialFocus="#new-project-name" open={state.projectsDialogOpen} onCancel={() => actions?.dismissProjects()}>
      <div className="settings-header"><h2 id="projects-title">Projetos</h2><button type="button" className="secondary icon-button" aria-label="Fechar projetos" disabled={state.projectsBusy} onClick={() => actions?.dismissProjects()}><X aria-hidden="true" /></button></div>
      <ProjectsContent />
    </Dialog>
    <Dialog id="creation-dialog" title="creation-title" open={state.creationMenuOpen} initialFocus=".creation-type-option" onCancel={() => actions?.dismissCreationMenu()}>
      <h2 id="creation-title">O que deseja criar?</h2>
      <p id="creation-description">Escolha o tipo e depois desenhe no mapa.</p>
      <div className="creation-type-options">
        <button className="secondary creation-type-option" type="button" onClick={() => actions?.chooseCreationType('polygon')}><VectorPolygon aria-hidden="true" /><span><strong>Área</strong><small>Desenhe um contorno no mapa.</small></span></button>
        <button className="secondary creation-type-option" type="button" onClick={() => actions?.chooseCreationType('point')}><MapPin aria-hidden="true" /><span><strong>Ponto</strong><small>Marque uma posição no mapa.</small></span></button>
      </div>
      <div className="dialog-actions"><button className="secondary" type="button" onClick={() => actions?.dismissCreationMenu()}>Cancelar</button></div>
    </Dialog>
    <Dialog id="export-dialog" title="export-title" className="file-dialog" initialFocus=".file-select-all input" open={state.fileDialog === 'export'} onCancel={() => actions?.dismissFileDialog()}>
      <div className="settings-header"><h2 id="export-title">Exportar áreas e pontos</h2><button className="secondary icon-button" type="button" aria-label="Fechar exportação" disabled={state.fileBusy} onClick={() => actions?.dismissFileDialog()}><X aria-hidden="true" /></button></div>
      <p id="export-description">Escolha as áreas e os pontos que deseja salvar no arquivo. Nomes, cores e bloqueios serão preservados.</p>
      <label className="export-format">Formato<select value={exportFormat} disabled={fileWaiting} onChange={event => setExportFormat(event.target.value as 'json' | 'geojson')}><option value="json">JSON do Mapa</option><option value="geojson">GeoJSON · outros aplicativos</option></select></label>
      <label className="file-select-all"><input type="checkbox" checked={Boolean(state.items.length) && selectedIds.length === state.items.length}
        ref={input => { if (input) input.indeterminate = selectedIds.length > 0 && selectedIds.length < state.items.length }} disabled={fileWaiting}
        onChange={event => setExportIds(event.target.checked ? state.items.map(item => item.id) : [])} /><span>Selecionar todos</span><small>{selectedIds.length} de {state.items.length}</small></label>
      <div className="file-polygon-list" role="group" aria-label="Áreas e pontos para exportar">
        {(['polygon', 'point'] as const).map(kind => {
          const items = state.items.filter(item => item.kind === kind)
          if (!items.length) return null
          const selected = items.filter(item => exportIds.includes(item.id)).length
          return <details key={`${state.fileDialog}-${kind}`} className="file-export-group" aria-labelledby={`export-group-${kind}`}>
            <summary id={`export-group-${kind}`} className="file-export-group-heading"><input aria-label={kind === 'point' ? 'Selecionar todos os pontos' : 'Selecionar todas as áreas'} onClick={event => event.stopPropagation()} type="checkbox" checked={selected === items.length} disabled={fileWaiting}
              ref={input => { if (input) input.indeterminate = selected > 0 && selected < items.length }}
              onChange={event => { const checked = event.target.checked; setExportIds(ids => checked ? [...new Set([...ids, ...items.map(item => item.id)])] : ids.filter(id => !items.some(item => item.id === id))) }} />
              <span>{kind === 'point' ? 'Pontos' : 'Áreas'}</span><small>{selected} de {items.length}</small><ChevronRight aria-hidden="true" /></summary>
            {items.map(item => <label key={item.id} className="file-polygon-option"><input type="checkbox" checked={exportIds.includes(item.id)} disabled={fileWaiting}
              onChange={event => setExportIds(ids => event.target.checked ? [...ids, item.id] : ids.filter(id => id !== item.id))} />
              <span className="file-color-dot" style={{ '--polygon-color': item.color } as CSSProperties} aria-hidden="true" /><span>{item.name}</span><small>{kind === 'point' ? 'Ponto' : `${item.vertexCount} vértices`}</small></label>)}
          </details>
        })}
      </div>
      {state.feedback && <p className="file-feedback" role="status">{state.feedback}</p>}
      <div className="dialog-actions"><button className="secondary" type="button" disabled={state.fileBusy} onClick={() => actions?.dismissFileDialog()}>Cancelar</button>
        <button id="confirm-export" type="button" disabled={fileWaiting || !selectedIds.length} onClick={() => void actions?.exportPolygons(selectedIds, exportFormat)}><Save aria-hidden="true" /><span>{state.fileBusy ? 'Exportando…' : `Exportar (${selectedIds.length})`}</span></button></div>
    </Dialog>
    <Dialog id="import-dialog" title="import-title" className="file-dialog" initialFocus=".import-mode-option input[value='add']" open={state.fileDialog === 'import'} onCancel={() => actions?.dismissFileDialog()}>
      <div className="dialog-symbol" aria-hidden="true"><FolderOpen /></div><h2 id="import-title">Importar áreas e pontos</h2>
      <p id="import-description">O arquivo <strong>{state.pendingImport?.fileName}</strong> contém {state.pendingImport?.areaCount} área(s) e {state.pendingImport?.pointCount} ponto(s). Como deseja importar?</p>
      <fieldset className="import-mode-options" disabled={fileWaiting}><legend>Destino das áreas e pontos</legend>
        <label className="import-mode-option"><input type="radio" name="import-mode" value="add" checked={importMode === 'add'} onChange={() => setImportMode('add')} /><span><strong>Adicionar aos atuais</strong><small>Manter as áreas e pontos atuais e acrescentar os itens do arquivo.</small></span></label>
        <label className="import-mode-option"><input type="radio" name="import-mode" value="replace" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} /><span><strong>Substituir os atuais</strong><small>Apagar {replacementCount} item(ns) atual(is) dos tipos presentes no arquivo. Tipos ausentes serão preservados.</small></span></label>
      </fieldset>
      <p className="file-import-note">Buracos serão preenchidos. No GeoJSON, nomes podem ser adaptados ao formato do app. Áreas sobrepostas da mesma cor serão fundidas.</p>
      {state.feedback && <p className="file-feedback" role="status">{state.feedback}</p>}
      <div className="dialog-actions"><button type="button" className="secondary" disabled={state.fileBusy} onClick={() => actions?.dismissFileDialog()}>Cancelar</button>
        <button id="confirm-import" type="button" className={importMode === 'replace' ? 'danger' : undefined} disabled={fileWaiting} onClick={() => actions?.confirmImport(importMode)}>{importMode === 'replace' ? 'Substituir e importar' : 'Adicionar itens'}</button></div>
    </Dialog>
    <Dialog id="clear-dialog" title="clear-dialog-title" className={all ? 'file-dialog' : undefined} open={Boolean(state.pendingDeletionId)} onCancel={() => actions?.dismissDeletion()}>
      <div className="dialog-symbol is-danger" aria-hidden="true"><Trash2 /></div>
      <h2 id="clear-dialog-title">{all ? 'O que deseja apagar?' : deletingPoint ? 'Apagar este ponto?' : 'Apagar esta área?'}</h2>
      <p id="clear-dialog-description">{all ? 'Escolha os tipos que deseja remover do mapa. A exclusão só acontece ao confirmar.' : `Essa ação removerá “${state.pendingDeletionName}” do mapa.${state.action === 'update' ? ' Confirmar a exclusão também encerrará a edição.' : ''}`}</p>
      {all && <fieldset className="import-mode-options"><legend>Itens para excluir</legend>
        <label className="import-mode-option"><input type="radio" name="deletion-scope" value="all" checked={deletionScope === 'all'} onChange={() => setDeletionScope('all')} /><span><strong>Áreas e pontos</strong><small>{polygons.length} área(s) e {points.length} ponto(s).</small></span></label>
        <label className="import-mode-option"><input type="radio" name="deletion-scope" value="polygon" checked={deletionScope === 'polygon'} disabled={!polygons.length} onChange={() => setDeletionScope('polygon')} /><span><strong>Somente áreas</strong><small>{polygons.length} área(s). Os pontos serão mantidos.</small></span></label>
        <label className="import-mode-option"><input type="radio" name="deletion-scope" value="point" checked={deletionScope === 'point'} disabled={!points.length} onChange={() => setDeletionScope('point')} /><span><strong>Somente pontos</strong><small>{points.length} ponto(s). As áreas serão mantidas.</small></span></label>
      </fieldset>}
      <div className="dialog-actions"><button id="dismiss-clear" type="button" className="secondary" onClick={() => actions?.dismissDeletion()}>Voltar</button><button id="confirm-clear" type="button" className="danger" disabled={all && !deletionCount} onClick={() => actions?.confirmDeletion(all ? deletionScope : 'all')}>{all ? `Apagar (${deletionCount})` : deletingPoint ? 'Excluir ponto' : 'Excluir área'}</button></div>
    </Dialog>
    <Dialog id="deleted-edit-dialog" title="deleted-edit-title" open={state.confirmingDeletedEdit} onCancel={() => void actions?.cancel()}>
      <div className="dialog-symbol is-danger" aria-hidden="true"><Trash2 /></div><h2 id="deleted-edit-title">Excluir {draftLabel}?</h2>
      <p id="deleted-edit-description">Este item foi apagado durante a edição. Deseja confirmar a exclusão ou cancelar a edição e restaurar o desenho original?</p>
      <div className="dialog-actions"><button id="restore-deleted-edit" type="button" className="secondary" onClick={() => void actions?.cancel()}>Cancelar edição</button><button id="confirm-deleted-edit" type="button" className="danger" onClick={() => actions?.confirmDeletedEdit()}>Excluir {draftLabel}</button></div>
    </Dialog>
    <Dialog id="switch-edit-dialog" title="switch-edit-title" open={Boolean(state.switchTargetName)} onCancel={() => void actions?.resolveSwitch('stay')}>
      <div className="dialog-symbol" aria-hidden="true"><Pencil /></div><h2 id="switch-edit-title">Trocar de elemento?</h2>
      <p id="switch-edit-description">Salve ou cancele a edição de “{state.draftName || 'elemento atual'}” antes de abrir “{state.switchTargetName}”.</p>
      <div className="dialog-actions switch-edit-actions"><button id="save-and-switch" type="button" onClick={() => void actions?.resolveSwitch('save')}>Salvar e trocar</button><button id="discard-and-switch" type="button" className="secondary" onClick={() => void actions?.resolveSwitch('discard')}>Cancelar edição e trocar</button><button id="dismiss-switch" type="button" className="secondary" onClick={() => void actions?.resolveSwitch('stay')}>Continuar editando</button></div>
    </Dialog>
    <Dialog id="settings-dialog" title="settings-title" className="settings-dialog" initialFocus="[role='tab'][aria-selected='true'], .mobile-settings-content input:checked" open={settingsOpen} onCancel={closeSettings}>
      <div className="settings-header"><div><h2 id="settings-title">Configurações</h2><p id="settings-description">Personalize a aparência e os controles do aplicativo.</p><p id="map-ready" className="settings-map-status" role="status" data-ready={state.ready}>{state.ready ? 'Mapa ativo' : 'Aguardando o mapa'}</p></div><button id="close-settings" className="secondary icon-button" type="button" aria-label="Fechar configurações" title="Fechar" onClick={closeSettings}><X aria-hidden="true" /></button></div>
      <SettingsContent />
    </Dialog>
  </>
}
