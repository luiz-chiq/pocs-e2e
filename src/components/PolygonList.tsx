import { useEffect, useState } from 'react'
import { ChevronRight, Copy, Lock, LockOpen, MapPin, Trash2, VectorPolygon } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { AreaMeasurements } from './AreaMeasurements'
import { NameEditor } from './PolygonEditor'
import { ShortcutBadge } from './ShortcutBadge'
import { shortcutAriaKeys, shortcutBinding, shortcutLabel } from '../shortcuts'

export function PolygonList({ kind, compact = false }: { kind: 'polygon' | 'point'; compact?: boolean }) {
  const { state, actions } = useEditorContext()
  const { enabled } = useShortcuts()
  const [focusTarget, setFocusTarget] = useState<Element | null>(() => document.hasFocus() ? document.activeElement : null)
  useEffect(() => {
    const updateFocus = () => setFocusTarget(document.hasFocus() ? document.activeElement : null)
    document.addEventListener('focusin', updateFocus)
    document.addEventListener('focusout', updateFocus)
    window.addEventListener('focus', updateFocus)
    window.addEventListener('blur', updateFocus)
    updateFocus()
    return () => {
      document.removeEventListener('focusin', updateFocus)
      document.removeEventListener('focusout', updateFocus)
      window.removeEventListener('focus', updateFocus)
      window.removeEventListener('blur', updateFocus)
    }
  }, [])
  const selectedIds = new Set(state.selectedIds)
  const items = state.items.filter(item => item.kind === kind)
  const focusedId = focusTarget?.closest<HTMLElement>('.polygon-list > .pin')?.dataset.polygonId
  const blockedFocus = !focusTarget || Boolean(focusTarget.closest('dialog, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable]:not([contenteditable="false"])'))
  const shortcutsAvailable = !state.multiSelect && enabled && !blockedFocus && !state.action && state.ready && (state.mode === 'main' || state.connected)
  return <ul id={kind === 'point' ? 'point-list' : 'polygon-list'} className="polygon-list" aria-label={kind === 'point' ? 'Pontos criados' : 'Áreas desenhadas'} hidden={state.action === 'create' || Boolean(state.deletedEditId)} inert={state.mode === 'detached' && !state.connected}>
    {items.map(item => {
      const editing = state.action === 'update' && state.activeId === item.id
      const expanded = state.expandedId === item.id
      const selected = state.multiSelect ? selectedIds.has(item.id) : state.selectedId === item.id
      const cardShortcuts = shortcutsAvailable && selected && focusedId === item.id
      const navigationShortcuts = cardShortcuts && items.length > 1
      const vertices = !state.multiSelect && (expanded || editing) ? <ul className="vertex-list">{item.vertices.map(([x, y], index) => <li key={index}>{item.kind === 'point' ? 'Posição' : `Vértice ${index + 1}`}: <code>{x.toFixed(5)}, {y.toFixed(5)}</code></li>)}</ul> : null
      return <li key={item.id} data-polygon-id={item.id} className={`pin${selected ? ' selected' : ''}${state.multiSelect ? ' is-batch' : ''}`}
        tabIndex={-1} aria-keyshortcuts={navigationShortcuts ? shortcutAriaKeys('listItems') : undefined}
        onKeyDown={event => {
          if (event.target !== event.currentTarget && !(event.target as Element).matches('.polygon-label')) return
          if (!shortcutBinding('confirm', event) && event.key !== ' ') return
          event.preventDefault(); event.stopPropagation()
          if (event.repeat) return
          if (state.multiSelect) { actions?.toggleBatch(item.id); return }
          if (enabled && shortcutBinding('confirm', event) && !state.action) actions?.edit(item.id)
          else actions?.select(item.id)
        }}
        hidden={Boolean(state.action) && !editing} onClick={event => {
          if ((event.target as Element).closest('button, input, label, summary, .polygon-name-editor, .polygon-lock-editor')) return
          if (enabled && event.shiftKey && !state.action) actions?.toggleBatch(item.id)
          else actions?.select(item.id)
        }}>
        {state.multiSelect && <label className="batch-card-check"><input type="checkbox" checked={selected} disabled={state.projectsBusy || state.fileBusy || (state.mode !== 'main' && !state.connected)} aria-label={`Selecionar ${item.name}${item.locked ? ' (travado)' : ''}`} onChange={() => actions?.toggleBatch(item.id)} /></label>}
        <button type="button" className="icon-button expand-polygon" hidden={Boolean(state.action) || state.multiSelect} aria-expanded={expanded}
          aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} ${item.kind === 'point' ? 'coordenadas' : 'vértices'} de ${item.name}`} onClick={() => actions?.expand(item.id)}><ChevronRight aria-hidden="true" /></button>
        {editing && state.mode !== 'map' ? <NameEditor /> : <span className="polygon-label" tabIndex={state.multiSelect ? undefined : 0} role={state.multiSelect ? undefined : 'button'} title={item.name} aria-pressed={state.multiSelect ? undefined : selected}>{item.name}</span>}
        {navigationShortcuts && <span className="card-navigation-hints" role="note" aria-label={`Use ${shortcutLabel('listItems')} para trocar a área ou ponto selecionado`}>
          <ShortcutBadge command="listItems" /><ShortcutBadge command="listItems" bindingIndex={1} />
        </span>}
        <div className="polygon-meta" aria-label={item.kind === 'point' ? 'Ponto' : `Área com ${item.vertexCount} vértices`} title={item.kind === 'point' ? 'Ponto' : `Área com ${item.vertexCount} vértices`}>
          {state.multiSelect && item.locked && <Lock aria-label="Travado" />}
          {item.kind === 'point' ? <MapPin aria-hidden="true" /> : <><VectorPolygon aria-hidden="true" /><span>{item.vertexCount}</span></>}
        </div>
        <button type="button" className="icon-button clone-polygon" aria-label={`Clonar ${item.name}`} title={item.kind === 'point' ? 'Clonar ponto' : 'Clonar área'} aria-keyshortcuts={cardShortcuts ? shortcutAriaKeys('clone') : undefined} hidden={Boolean(state.action) || state.multiSelect} onClick={() => actions?.clone(item.id)}><Copy aria-hidden="true" /><ShortcutBadge command="clone" available={cardShortcuts} /></button>
        <button type="button" className="icon-button polygon-lock-button" hidden={Boolean(state.action) || state.multiSelect} disabled={Boolean(state.action)}
          aria-label={`${item.locked ? 'Destravar' : 'Travar'} ${item.name}`} title={`${item.locked ? 'Destravar' : 'Travar'} ${item.name}`} aria-pressed={item.locked} aria-keyshortcuts={cardShortcuts ? shortcutAriaKeys('lock') : undefined} onClick={() => actions?.toggleLock(item.id)}>
          {item.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          <ShortcutBadge command="lock" available={cardShortcuts} />
        </button>
        <button type="button" className="icon-button delete-polygon" hidden={Boolean(state.action) || state.multiSelect} aria-label={`Excluir ${item.name}`} title={`Excluir ${item.name}`} aria-keyshortcuts={cardShortcuts ? shortcutAriaKeys('deleteListItem') : undefined} onClick={() => actions?.requestDeletion(item.id)}><Trash2 aria-hidden="true" /><ShortcutBadge command="deleteListItem" available={cardShortcuts} /></button>
        {item.kind === 'polygon' && !state.multiSelect && (expanded || editing) && <AreaMeasurements area={item} />}
        {compact && editing ? <details className="editing-coordinates"><summary>{item.kind === 'point' ? 'Coordenadas' : `Vértices (${item.vertexCount})`}</summary>{vertices}</details> : !state.multiSelect && (expanded || editing) && vertices}
      </li>
    })}
  </ul>
}
