import { useId } from 'react'
import { ListChecks, Lock, LockOpen, Trash2, X } from 'lucide-react'
import { polygonPalette } from '../polygon-rules'
import { useEditorContext } from './EditorContext'

export function BatchToggle() {
  const { state, actions } = useEditorContext()
  return <button type="button" className="secondary selection-toggle" aria-pressed={state.multiSelect} disabled={!state.ready || !state.items.length || state.projectsBusy || state.fileBusy} onClick={() => actions?.setMultiSelect(!state.multiSelect)}>
    {state.multiSelect ? <X aria-hidden="true" /> : <ListChecks aria-hidden="true" />}<span>{state.multiSelect ? 'Sair' : 'Selecionar'}</span>
  </button>
}
export function BatchSelectAll({ kind }: { kind: 'polygon' | 'point' }) {
  const { state, actions } = useEditorContext()
  const ids = new Set(state.selectedIds)
  const items = state.items.filter(item => item.kind === kind), selected = items.filter(item => ids.has(item.id))
  if (!state.multiSelect || !items.length) return null
  return <label className="batch-select-all"><input type="checkbox" checked={selected.length === items.length} disabled={state.projectsBusy || state.fileBusy || (state.mode !== 'main' && !state.connected)}
    ref={input => { if (input) input.indeterminate = selected.length > 0 && selected.length < items.length }}
    onChange={event => actions?.selectBatch(items.map(item => item.id), event.target.checked)} /><span>Selecionar {kind === 'point' ? 'todos os pontos' : 'todas as áreas'}</span></label>
}
export function BatchActions() {
  const { state, actions } = useEditorContext()
  const colorId = useId()
  if (!state.multiSelect) return null
  const ids = new Set(state.selectedIds)
  const selected = state.items.filter(item => ids.has(item.id)), editable = selected.filter(item => !item.locked)
  const locked = selected.length - editable.length
  const commonColor = editable.length > 0 && editable.every(item => item.color === editable[0].color) ? editable[0].color : ''
  const waiting = !state.ready || state.projectsBusy || state.fileBusy || (state.mode !== 'main' && !state.connected)
  return <section className="batch-actions" aria-label="Ações da seleção múltipla">
    <div className="batch-summary"><span role="status">{selected.length} selecionado(s)</span><button type="button" className="secondary" disabled={!selected.length || waiting} onClick={() => actions?.selectBatch(state.selectedIds, false)}>Limpar</button></div>
    <div className="batch-controls"><label className="visually-hidden" htmlFor={colorId}>Cor dos selecionados</label>
      <select id={colorId} value={commonColor} disabled={waiting || !editable.length} title="Alterar cor dos itens destravados. Áreas sobrepostas da mesma cor serão fundidas." onChange={event => { if (event.target.value) actions?.colorBatch(event.target.value) }}>
        <option value="" disabled>{editable.length ? 'Cores diferentes' : 'Cor'}</option>{polygonPalette.map(([name, color]) => <option key={color} value={color}>{name}</option>)}
      </select>
      <button type="button" className="secondary icon-button" disabled={waiting || !editable.length} aria-label="Travar selecionados" title="Travar selecionados" onClick={() => actions?.lockBatch(true)}><Lock aria-hidden="true" /></button>
      <button type="button" className="secondary icon-button" disabled={waiting || !locked} aria-label="Destravar selecionados" title="Destravar selecionados" onClick={() => actions?.lockBatch(false)}><LockOpen aria-hidden="true" /></button>
      <button type="button" className="danger icon-button" disabled={waiting || !selected.length} aria-label={`Excluir selecionados (${selected.length})`} title="Excluir selecionados" onClick={() => actions?.requestBatchDeletion()}><Trash2 aria-hidden="true" /></button>
    </div>
    {locked > 0 && <small>{locked} travado(s). A cor só muda nos destravados.</small>}
  </section>
}
