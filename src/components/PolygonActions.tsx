import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEditorContext, useShortcuts } from './EditorContext'
import { ShortcutBadge } from './ShortcutBadge'
import { shortcutAriaKeys, shortcutLabel } from '../shortcuts'
export function PolygonActions({ mobile = false }: { mobile?: boolean }) {
  const { state, actions } = useEditorContext()
  const { enabled } = useShortcuts()
  const selected = state.items.find(item => item.id === state.selectedId)
  const waiting = !state.ready || (state.mode !== 'main' && !state.connected)
  return <div className="polygon-actions" role="group" aria-label="Ações das áreas e pontos">
    <button id="clear-polygons" className="clear-all-button danger icon-button delete-all-button" type="button" hidden={Boolean(state.action)} disabled={waiting || !state.items.length}
      aria-label="Apagar áreas, pontos ou ambos" title="Apagar tudo: escolher áreas, pontos ou ambos" onClick={() => actions?.requestDeletion('all')}><Trash2 aria-hidden="true" /></button>
    <button id="create-feature" className="add-polygon-button" type="button" title={enabled ? `Criar área ou ponto (${shortcutLabel('create')})` : 'Criar área ou ponto'}
      aria-haspopup="dialog" aria-controls="creation-dialog" aria-keyshortcuts={enabled ? shortcutAriaKeys('create') : undefined} hidden={Boolean(state.action) || (mobile && Boolean(selected))} disabled={waiting} onClick={() => actions?.requestCreationMenu()}>
      <Plus aria-hidden="true" /><span>Criar</span><ShortcutBadge command="create" />
    </button>
    <button id="edit-feature" className={mobile ? 'add-polygon-button' : 'secondary'} type="button" hidden={Boolean(state.action) || !selected} disabled={waiting || selected?.locked}
      title={selected?.locked ? 'Destrave pelo cadeado na lista para editar.' : 'Editar seleção'} aria-keyshortcuts={enabled ? shortcutAriaKeys('edit') : undefined} onClick={() => selected && actions?.edit(selected.id)}>
      <Pencil aria-hidden="true" /><span>Editar</span><ShortcutBadge command="edit" />
    </button>
    <button id="finish-drawing" type="button" hidden={!state.action} disabled={waiting} title="Concluir a ação atual" aria-keyshortcuts={enabled ? shortcutAriaKeys('confirm') : undefined} onClick={() => actions?.finish()}><Check aria-hidden="true" /><span>Confirmar</span><ShortcutBadge command="confirm" /></button>
    <button id="cancel-editing" className="secondary" type="button" hidden={!state.action} disabled={waiting} title="Sair do desenho ou edição atual" aria-keyshortcuts={enabled ? shortcutAriaKeys('cancel') : undefined} onClick={() => void actions?.requestExit()}><X aria-hidden="true" /><span>Cancelar</span><ShortcutBadge command="cancel" /></button>
  </div>
}
