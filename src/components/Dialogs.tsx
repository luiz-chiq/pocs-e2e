import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { Download, Pencil, Save, Trash2, X } from 'lucide-react'
import { useEditorContext } from './EditorContext'
import { ShortcutSwitch } from './Sidebar'
import type { PwaState } from '../hooks/usePwa'

function Dialog({ id, title, open, onCancel, children, className }: { id: string; title: string; open: boolean; onCancel(): void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = ref.current!
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return <dialog ref={ref} id={id} className={className} aria-labelledby={title} aria-describedby={id === 'keyboard-shortcuts-dialog' ? 'keyboard-shortcuts-description' : id === 'clear-dialog' || id === 'install-dialog' ? `${id}-description` : id.replace(/-dialog$/, '') + '-description'}
    onCancel={event => { event.preventDefault(); onCancel() }}>{children}</dialog>
}
const shortcuts: [string, string][] = [
  ['N', 'Novo polígono'], ['A', 'Ir para a lista de polígonos'], ['↑ / ↓ / ← / →', 'Navegar na lista ou nos modais'],
  ['E / Enter', 'Editar a seleção'], ['D', 'Na lista, excluir com confirmação'], ['C', 'Clonar a seleção'], ['L', 'Travar / destravar'],
  ['Enter', 'Concluir criação ou edição'], ['Esc', 'Sair da edição / limpar seleção'],
  ['Delete', 'Remover vértices selecionados; sem seleção, confirmar exclusão da área (também Backspace)'],
  ['1 – 6', 'Cor do polígono'], ['Z / Ctrl/⌘ Z', 'Desfazer'], ['R / Ctrl/⌘ ⇧ Z', 'Refazer (também Ctrl/⌘ Y)'],
  ['+ / −', 'Aumentar / diminuir zoom'], ['0', 'Retornar o norte para cima'], ['M', 'Separar / reunir mapa']
]
export function Dialogs({ pwa, shortcutsOpen, closeShortcuts }: { pwa: PwaState; shortcutsOpen: boolean; closeShortcuts(): void }) {
  const { state, actions } = useEditorContext()
  const all = state.pendingDeletionId === 'all'
  return <>
    <Dialog id="clear-dialog" title="clear-dialog-title" open={Boolean(state.pendingDeletionId)} onCancel={() => actions?.dismissDeletion()}>
      <div className="dialog-symbol is-danger" aria-hidden="true"><Trash2 /></div>
      <h2 id="clear-dialog-title">{all ? 'Apagar todos os polígonos?' : 'Apagar este polígono?'}</h2>
      <p id="clear-dialog-description">{all ? 'Essa ação removerá todos os polígonos desenhados no mapa.' : `Essa ação removerá “${state.pendingDeletionName}” do mapa.${state.action === 'update' ? ' Confirmar a exclusão também encerrará a edição.' : ''}`}</p>
      <div className="dialog-actions"><button id="dismiss-clear" type="button" className="secondary" onClick={() => actions?.dismissDeletion()}>Voltar</button><button id="confirm-clear" type="button" className="danger" onClick={() => actions?.confirmDeletion()}>{all ? 'Apagar todos' : 'Excluir polígono'}</button></div>
    </Dialog>
    <Dialog id="deleted-edit-dialog" title="deleted-edit-title" open={state.confirmingDeletedEdit} onCancel={() => void actions?.cancel()}>
      <div className="dialog-symbol is-danger" aria-hidden="true"><Trash2 /></div><h2 id="deleted-edit-title">Excluir este polígono?</h2>
      <p id="deleted-edit-description">O polígono foi apagado durante a edição. Deseja confirmar a exclusão ou cancelar a edição e restaurar o desenho original?</p>
      <div className="dialog-actions"><button id="restore-deleted-edit" type="button" className="secondary" onClick={() => void actions?.cancel()}>Cancelar edição</button><button id="confirm-deleted-edit" type="button" className="danger" onClick={() => actions?.confirmDeletedEdit()}>Excluir polígono</button></div>
    </Dialog>
    <Dialog id="switch-edit-dialog" title="switch-edit-title" open={Boolean(state.switchTargetName)} onCancel={() => void actions?.resolveSwitch('stay')}>
      <div className="dialog-symbol" aria-hidden="true"><Pencil /></div><h2 id="switch-edit-title">Trocar de polígono?</h2>
      <p id="switch-edit-description">Salve ou cancele a edição de “{state.draftName || 'polígono atual'}” antes de abrir “{state.switchTargetName}”.</p>
      <div className="dialog-actions switch-edit-actions"><button id="save-and-switch" type="button" onClick={() => void actions?.resolveSwitch('save')}>Salvar e trocar</button><button id="discard-and-switch" type="button" className="secondary" onClick={() => void actions?.resolveSwitch('discard')}>Cancelar edição e trocar</button><button id="dismiss-switch" type="button" className="secondary" onClick={() => void actions?.resolveSwitch('stay')}>Continuar editando</button></div>
    </Dialog>
    <Dialog id="unsaved-edit-dialog" title="unsaved-edit-title" open={state.confirmingExit} onCancel={() => void actions?.resolveExit('stay')}>
      <div className="dialog-symbol" aria-hidden="true"><Save /></div><h2 id="unsaved-edit-title">Salvar alterações antes de sair?</h2>
      <p id="unsaved-edit-description">Há alterações não salvas neste polígono. Você pode salvar, descartar ou continuar editando.</p>
      <div className="dialog-actions switch-edit-actions"><button id="save-and-exit" type="button" onClick={() => void actions?.resolveExit('save')}>Salvar e sair</button><button id="discard-and-exit" type="button" className="secondary" onClick={() => void actions?.resolveExit('discard')}>Descartar e sair</button><button id="stay-editing" type="button" className="secondary" onClick={() => void actions?.resolveExit('stay')}>Continuar editando</button></div>
    </Dialog>
    <Dialog id="keyboard-shortcuts-dialog" title="keyboard-shortcuts-title" className="keyboard-shortcuts-dialog" open={shortcutsOpen} onCancel={closeShortcuts}>
      <div className="keyboard-shortcuts-header"><h2 id="keyboard-shortcuts-title">Atalhos de teclado</h2><button id="close-keyboard-shortcuts" className="secondary icon-button" type="button" aria-label="Fechar atalhos de teclado" title="Fechar" onClick={closeShortcuts}><X aria-hidden="true" /></button></div>
      <div className="keyboard-shortcuts-body"><ShortcutSwitch inDialog /><p id="keyboard-shortcuts-description">Quando habilitados, funcionam fora dos campos de texto. Enter confirma. Esc solicita a saída e permite salvar ou descartar alterações pendentes, também no campo de nome.</p>
        <dl className="keyboard-shortcuts-list">{shortcuts.map(([key, description], index) => <Shortcut key={index} name={key} description={description} />)}</dl>
      </div>
    </Dialog>
    <Dialog id="install-dialog" title="install-dialog-title" open={Boolean(pwa.description)} onCancel={pwa.close}>
      <div className="dialog-symbol" aria-hidden="true"><Download /></div><h2 id="install-dialog-title">Instalar Polígonos</h2><p id="install-dialog-description">{pwa.description}</p>
      <form method="dialog" className="dialog-actions" onSubmit={event => { event.preventDefault(); pwa.close() }}><button type="submit">Entendi</button></form>
    </Dialog>
  </>
}
function Shortcut({ name, description }: { name: string; description: string }) { return <><dt><kbd>{name}</kbd></dt><dd>{description}</dd></> }
