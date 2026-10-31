import { useEffect, useState } from 'react'
import { ChevronRight, Copy, Lock, LockOpen, MapPin, Trash2, VectorPolygon } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { NameEditor } from './PolygonEditor'
import { ShortcutBadge } from './ShortcutBadge'

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
  const items = state.items.filter(item => item.kind === kind)
  const focusedId = focusTarget?.closest<HTMLElement>('.polygon-list > .pin')?.dataset.polygonId
  const blockedFocus = !focusTarget || Boolean(focusTarget.closest('dialog, input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable]:not([contenteditable="false"])'))
  const shortcutsAvailable = enabled && !blockedFocus && !state.action && state.ready && (state.mode === 'main' || state.connected)
  return <ul id={kind === 'point' ? 'point-list' : 'polygon-list'} className="polygon-list" aria-label={kind === 'point' ? 'Pontos criados' : 'Áreas desenhadas'} hidden={state.action === 'create' || Boolean(state.deletedEditId)} inert={state.mode === 'detached' && !state.connected}>
    {items.map(item => {
      const editing = state.action === 'update' && state.activeId === item.id
      const expanded = state.expandedId === item.id
      const selected = state.selectedId === item.id
      const cardShortcuts = shortcutsAvailable && selected && focusedId === item.id
      const navigationShortcuts = cardShortcuts && items.length > 1
      const vertices = <ul className="vertex-list">{item.vertices.map(([x, y], index) => <li key={index}>{item.kind === 'point' ? 'Posição' : `Vértice ${index + 1}`}: <code>{x.toFixed(5)}, {y.toFixed(5)}</code></li>)}</ul>
      return <li key={item.id} data-polygon-id={item.id} className={`pin${state.selectedId === item.id ? ' selected' : ''}`}
        tabIndex={-1} aria-keyshortcuts={navigationShortcuts ? 'ArrowUp ArrowDown' : undefined}
        onKeyDown={event => {
          if (event.target !== event.currentTarget && !(event.target as Element).matches('.polygon-label')) return
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault(); event.stopPropagation()
          if (event.repeat) return
          if (enabled && event.key === 'Enter' && !state.action) actions?.edit(item.id)
          else actions?.select(item.id)
        }}
        hidden={Boolean(state.action) && !editing} onClick={event => {
          if ((event.target as Element).closest('button, summary, .polygon-name-editor, .polygon-lock-editor')) return
          actions?.select(item.id)
        }}>
        <button type="button" className="icon-button expand-polygon" hidden={Boolean(state.action)} aria-expanded={expanded}
          aria-label={`${expanded ? 'Ocultar' : 'Mostrar'} ${item.kind === 'point' ? 'coordenadas' : 'vértices'} de ${item.name}`} onClick={() => actions?.expand(item.id)}><ChevronRight aria-hidden="true" /></button>
        {editing && state.mode !== 'map' ? <NameEditor /> : <span className="polygon-label" tabIndex={0} role="button" title={item.name} aria-pressed={state.selectedId === item.id}>{item.name}</span>}
        {navigationShortcuts && <span className="card-navigation-hints" role="note" aria-label="Use a seta para cima ou para baixo para trocar a área ou ponto selecionado">
          <ShortcutBadge>↑</ShortcutBadge><ShortcutBadge>↓</ShortcutBadge>
        </span>}
        <div className="polygon-meta" aria-label={item.kind === 'point' ? 'Ponto' : `Área com ${item.vertexCount} vértices`} title={item.kind === 'point' ? 'Ponto' : `Área com ${item.vertexCount} vértices`}>
          {item.kind === 'point' ? <MapPin aria-hidden="true" /> : <><VectorPolygon aria-hidden="true" /><span>{item.vertexCount}</span></>}
        </div>
        <button type="button" className="icon-button clone-polygon" aria-label={`Clonar ${item.name}`} title={item.kind === 'point' ? 'Clonar ponto' : 'Clonar área'} aria-keyshortcuts={cardShortcuts ? 'C' : undefined} hidden={Boolean(state.action)} onClick={() => actions?.clone(item.id)}><Copy aria-hidden="true" /><ShortcutBadge available={cardShortcuts}>C</ShortcutBadge></button>
        <button type="button" className="icon-button polygon-lock-button" hidden={Boolean(state.action)} disabled={Boolean(state.action)}
          aria-label={`${item.locked ? 'Destravar' : 'Travar'} ${item.name}`} title={`${item.locked ? 'Destravar' : 'Travar'} ${item.name}`} aria-pressed={item.locked} aria-keyshortcuts={cardShortcuts ? 'T' : undefined} onClick={() => actions?.toggleLock(item.id)}>
          {item.locked ? <Lock aria-hidden="true" /> : <LockOpen aria-hidden="true" />}
          <ShortcutBadge available={cardShortcuts}>T</ShortcutBadge>
        </button>
        <button type="button" className="icon-button delete-polygon" hidden={Boolean(state.action)} aria-label={`Excluir ${item.name}`} title={`Excluir ${item.name}`} aria-keyshortcuts={cardShortcuts ? 'D' : undefined} onClick={() => actions?.requestDeletion(item.id)}><Trash2 aria-hidden="true" /><ShortcutBadge available={cardShortcuts}>D</ShortcutBadge></button>
        {compact && editing ? <details className="editing-coordinates"><summary>{item.kind === 'point' ? 'Coordenadas' : `Vértices (${item.vertexCount})`}</summary>{vertices}</details> : (expanded || editing) && vertices}
      </li>
    })}
  </ul>
}
