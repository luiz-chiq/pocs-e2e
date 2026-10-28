import { ChevronRight, Copy, Lock, LockOpen, Trash2 } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { NameEditor } from './PolygonEditor'

export function PolygonList() {
  const { state, actions } = useEditorContext()
  const { enabled } = useShortcuts()
  return <ul id="polygon-list" className="polygon-list" hidden={state.action === 'create' || Boolean(state.deletedEditId)} inert={state.mode === 'detached' && !state.connected}>
    {state.items.map(item => {
      const editing = state.action === 'update' && state.activeId === item.id
      const expanded = state.expandedId === item.id
      return <li key={item.id} data-polygon-id={item.id} className={`pin${state.selectedId === item.id ? ' selected' : ''}`}
        hidden={Boolean(state.action) && !editing} onClick={event => {
          if ((event.target as Element).closest('button, .polygon-name-editor, .polygon-lock-editor')) return
          actions?.select(item.id)
        }}>
        <button type="button" className="icon-button expand-polygon" hidden={Boolean(state.action)} aria-expanded={expanded}
          aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} vértices de ${item.name}`} onClick={() => actions?.expand(item.id)}><ChevronRight aria-hidden="true" /></button>
        {editing && state.mode !== 'map' ? <NameEditor /> : <span className="polygon-label" tabIndex={0} role="button" aria-pressed={state.selectedId === item.id}
          onKeyDown={event => {
            if (event.key !== 'Enter' && event.key !== ' ') return
            event.preventDefault(); event.stopPropagation()
            if (event.repeat) return
            if (enabled && event.key === 'Enter' && !state.action) actions?.edit(item.id)
            else actions?.select(item.id)
          }}>{item.name}</span>}
        <div className="polygon-meta" aria-label={`${item.vertexCount} vértices`} title={`${item.vertexCount} vértices`}><span>{item.vertexCount}</span></div>
        <button type="button" className="icon-button clone-polygon" aria-label={`Clonar ${item.name}`} title="Clonar polígono (C)" hidden={Boolean(state.action)} onClick={() => actions?.clone(item.id)}><Copy aria-hidden="true" /></button>
        <button type="button" className="icon-button polygon-lock-button" hidden={Boolean(state.action)} disabled={Boolean(state.action)}
          aria-label={`${item.locked ? 'Destravar' : 'Travar'} ${item.name}`} title={`${item.locked ? 'Destravar' : 'Travar'} ${item.name}`} aria-pressed={item.locked} onClick={() => actions?.toggleLock(item.id)}>
          {item.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
        </button>
        <button type="button" className="icon-button delete-polygon" hidden={Boolean(state.action)} aria-label={`Excluir ${item.name}`} title={`Excluir ${item.name}`} onClick={() => actions?.requestDeletion(item.id)}><Trash2 aria-hidden="true" /></button>
        {(expanded || editing) && <ul className="vertex-list">{item.vertices.map(([x, y], index) => <li key={index}>Vértice {index + 1}: <code>{x.toFixed(5)}, {y.toFixed(5)}</code></li>)}</ul>}
      </li>
    })}
  </ul>
}
