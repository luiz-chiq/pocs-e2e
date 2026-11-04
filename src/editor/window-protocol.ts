import type { PlaceResult } from '../place-search'
import type { ProjectSummary } from './projects'
import type { SaveStatus } from './storage'
import type Graphic from '@arcgis/core/Graphic.js'
import type Viewpoint from '@arcgis/core/Viewpoint.js'

export type PolygonJSON = ReturnType<Graphic['toJSON']>
export type DeletionScope = 'polygon' | 'point' | 'all'
export type MapCommand =
  | { type: 'batch-mode'; enabled: boolean }
  | { type: 'batch-toggle'; id: string }
  | { type: 'batch-select'; ids: string[]; checked: boolean }
  | { type: 'batch-color'; value: string }
  | { type: 'batch-lock'; locked: boolean }
  | { type: 'batch-request-delete' | 'batch-dismiss-delete' | 'batch-confirm-delete' }
  | { type: 'open-create' | 'close-create' | 'retry-save' }
  | { type: 'create-feature'; kind: 'polygon' | 'point' }
  | { type: 'draw-point' }
  | { type: 'locate-search'; result: PlaceResult }
  | { type: 'clear-search' }
  | { type: 'focus-validation'; id: string }
  | { type: 'open-project'; id: string }
  | { type: 'create-project'; name: string }
  | { type: 'rename-project'; id: string; name: string }
  | { type: 'draw' | 'finish' | 'cancel' | 'deselect' | 'confirm-edit-deletion' }
  | { type: 'select' | 'edit' | 'expand'; id: string }
  | { type: 'clone'; id: string }
  | { type: 'delete'; id: string | 'all'; scope?: DeletionScope }
  | { type: 'request-deletion'; id: string | 'all' }
  | { type: 'dismiss-deletion' }
  | { type: 'confirm-deletion'; scope?: DeletionScope }
  | { type: 'request-exit' }
  | { type: 'history'; action: 'undo' | 'redo' }
  | { type: 'navigate'; action: 'zoom-in' | 'zoom-out' | 'north-up' }
  | { type: 'rename'; id: string; value: string; changeId: string }
  | { type: 'import'; polygons: PolygonFileData[]; fileName: string; mode: 'add' | 'replace' }
  | { type: 'draft-lock'; id: string | null; value: boolean }
  | { type: 'color'; id: string | null; value: string; changeId: string }
  | { type: 'toggle-lock'; id: string }
  | { type: 'resolve-switch'; choice: 'save' | 'discard' | 'stay' }
export interface MapState {
  multiSelect: boolean
  selectedIds: string[]
  batchDeletionIds: string[] | null
  searchLocation: PlaceResult | null
  activeProjectId: string | null
  projects: ProjectSummary[]
  projectsBusy: boolean
  projectsError: string
  focusedValidationId: string | null
  saveStatus: SaveStatus
  saveMessage: string
  polygons: PolygonJSON[]
  committed: PolygonJSON[]
  selectedId: string | null
  expandedId: string | null
  activeId: string | null
  action: 'create' | 'update' | null
  creationMenuOpen: boolean
  draftKind: 'polygon' | 'point'
  instructions: string
  lastEdit: string
  warning: boolean
  deletedEditId: string | null
  confirmingDeletedEdit: boolean
  pendingDeletionId: string | 'all' | null
  draftName: string
  draftLocked: boolean
  draftColor: string
  colorChangeId: string | null
  switchTargetId: string | null
  nameChangeId: string | null
  viewpoint: ReturnType<Viewpoint['toJSON']> | null
}
