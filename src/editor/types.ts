export interface PolygonItem {
  id: string
  name: string
  locked: boolean
  color: string
  vertices: number[][]
  vertexCount: number
}
export interface MapLabel {
  id: string
  name: string
  x: number
  y: number
  selected: boolean
  hidden: boolean
}
export interface EditorSnapshot {
  items: PolygonItem[]
  action: 'create' | 'update' | null
  selectedId: string | null
  expandedId: string | null
  activeId: string | null
  draftName: string
  draftColor: string
  draftLocked: boolean
  nameError: string
  nameHint: string
  mode: 'main' | 'detached' | 'map'
  connected: boolean
  ready: boolean
  fileBusy: boolean
  instructions: string
  lastEdit: string
  warning: boolean
  feedback: string
  labels: MapLabel[]
  pendingDeletionId: string | 'all' | null
  pendingDeletionName: string
  confirmingDeletedEdit: boolean
  confirmingExit: boolean
  deletedEditId: string | null
  switchTargetName: string
  rotation: number
  canZoomIn: boolean
  canZoomOut: boolean
  focusRequest: { kind: 'name' | 'polygon'; id: string | null; sequence: number } | null
}
export const initialEditorSnapshot: EditorSnapshot = {
  items: [], action: null, selectedId: null, expandedId: null, activeId: null,
  draftName: '', draftColor: '#1261a0', draftLocked: false, nameError: '', nameHint: '',
  mode: 'main', connected: false, ready: false, fileBusy: false,
  instructions: 'Pronto para desenhar.', lastEdit: 'Nenhuma edição executada.', warning: false, feedback: '', labels: [],
  pendingDeletionId: null, pendingDeletionName: '', confirmingDeletedEdit: false, confirmingExit: false, deletedEditId: null,
  switchTargetName: '', rotation: 0, canZoomIn: false, canZoomOut: false, focusRequest: null
}
