import type { SaveStatus } from './storage'
export interface PolygonItem {
  kind: 'polygon' | 'point'
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
  saveStatus: SaveStatus
  saveMessage: string
  items: PolygonItem[]
  draftKind: 'polygon' | 'point'
  validationIssues: SpatialValidationIssue[]
  pendingDeletionKind: 'polygon' | 'point' | 'all'
  action: 'create' | 'update' | null
  creationMenuOpen: boolean
  selectedId: string | null
  expandedId: string | null
  activeId: string | null
  selectedVertexCount: number
  draftName: string
  draftColor: string
  draftLocked: boolean
  nameError: string
  nameHint: string
  mode: 'main' | 'detached' | 'map'
  connected: boolean
  ready: boolean
  fileBusy: boolean
  fileDialog: 'import' | 'export' | null
  pendingImport: { fileName: string; count: number; areaCount: number; pointCount: number } | null
  instructions: string
  lastEdit: string
  warning: boolean
  feedback: string
  labels: MapLabel[]
  pendingDeletionId: string | 'all' | null
  pendingDeletionName: string
  confirmingDeletedEdit: boolean
  deletedEditId: string | null
  switchTargetName: string
  rotation: number
  canZoomIn: boolean
  canZoomOut: boolean
  focusRequest: { kind: 'name' | 'polygon' | 'lists'; id: string | null; sequence: number } | null
}
export interface SpatialValidationIssue {
  id: string
  severity: 'warning' | 'error'
  pointId: string
  areaId: string
  message: string
}
export const initialEditorSnapshot: EditorSnapshot = {
  saveStatus: 'idle', saveMessage: '',
  items: [], draftKind: 'polygon', validationIssues: [], pendingDeletionKind: 'all', action: null, creationMenuOpen: false, selectedId: null, expandedId: null, activeId: null, selectedVertexCount: 0,
  draftName: '', draftColor: '#1261a0', draftLocked: false, nameError: '', nameHint: '',
  mode: 'main', connected: false, ready: false, fileBusy: false, fileDialog: null, pendingImport: null,
  instructions: 'Pronto para desenhar.', lastEdit: 'Nenhuma edição executada.', warning: false, feedback: '', labels: [],
  pendingDeletionId: null, pendingDeletionName: '', confirmingDeletedEdit: false, deletedEditId: null,
  switchTargetName: '', rotation: 0, canZoomIn: false, canZoomOut: false, focusRequest: null
}
