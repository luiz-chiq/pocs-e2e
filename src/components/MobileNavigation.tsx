import { ChevronUp, Trash2 } from 'lucide-react'
import { PolygonActions } from './PolygonActions'
import { useEditorContext } from './EditorContext'
import { SettingsButton } from './Settings'
import { CompassButton } from './CompassButton'

export function MobileNavigation({ open, toggle, openSettings }: { open: boolean; toggle(): void; openSettings(): void }) {
  const { state, actions } = useEditorContext()
  const editing = Boolean(state.action)
  return <>
    {!open && state.selectedVertexCount > 0 && <button id="delete-selected-vertex" className="mobile-delete-vertex danger" type="button"
      onPointerDown={event => event.preventDefault()} onClick={() => actions?.deleteSelectedVertices()}>
      <Trash2 aria-hidden="true" /><span>{state.selectedVertexCount > 1 ? 'Apagar vértices' : 'Apagar vértice'}</span>
    </button>}
    {!open && <div className="mobile-map-tools" role="group" aria-label="Configurações, menu e rotação do mapa">
      <div className="mobile-settings-slot"><SettingsButton open={openSettings} /></div>
      <button id="toggle-mobile-lists" className="mobile-menu-toggle" type="button"
        aria-label={editing ? 'Abrir detalhes da criação ou edição' : 'Abrir lista de áreas, pontos e avisos'} aria-controls="polygon-sidebar" aria-expanded={false} onClick={toggle}>
        <ChevronUp aria-hidden="true" /><span>{editing ? 'Detalhes' : 'Lista'}</span>
      </button>
      <CompassButton />
    </div>}
    <nav className="mobile-navigation" aria-label="Controles do mapa"><PolygonActions mobile /></nav>
  </>
}
