import { Check, Pencil, Plus, Trash2, VectorPolygon, X } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
export function PolygonActions() {
  const { state, actions } = useEditorContext()
  const { enabled } = useShortcuts()
  const selected = state.items.find(item => item.id === state.selectedId)
  const waiting = !state.ready || (state.mode !== 'main' && !state.connected)
  const label = selected ? 'Editar polígono selecionado' : 'Criar um novo polígono'
  const title = selected?.locked ? 'Destrave o polígono pelo cadeado na lista para editar.' : enabled
    ? selected ? `${label} (E ou Enter). Esc limpa a seleção; N cria outro polígono.` : `${label} (N)` : label
  return <div className="polygon-actions" role="group" aria-label="Ações dos polígonos">
    <button id="clear-polygons" className="clear-all-button danger" type="button" title="Remover todos os polígonos"
      hidden={Boolean(state.action)} disabled={!state.items.length || (state.mode === 'detached' && !state.connected)} onClick={() => actions?.requestDeletion('all')}><Trash2 aria-hidden="true" />Apagar todos</button>
    <button id="draw-polygon" data-mode={selected ? 'edit' : 'create'} className="icon-button add-polygon-button" type="button"
      title={title} aria-label={label} aria-keyshortcuts={enabled ? selected ? 'E Enter' : 'N' : undefined} hidden={Boolean(state.action)} disabled={waiting || selected?.locked} onClick={() => actions?.draw()}>
      <VectorPolygon aria-hidden="true" />{selected ? <Pencil aria-hidden="true" /> : <Plus aria-hidden="true" />}<span>{selected ? 'Editar' : 'Criar'}</span>
    </button>
    <button id="finish-drawing" type="button" hidden={!state.action} disabled={waiting} title="Concluir a ação atual" onClick={() => actions?.finish()}><Check aria-hidden="true" /><span>Confirmar</span></button>
    <button id="cancel-editing" className="secondary" type="button" hidden={!state.action} disabled={waiting} title="Cancelar desenho ou edição atual" onClick={() => void actions?.cancel()}><X aria-hidden="true" /><span>Cancelar</span></button>
  </div>
}
