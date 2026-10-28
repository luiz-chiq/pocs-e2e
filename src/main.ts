import '@arcgis/core/assets/esri/themes/light/main.css'
import './native-files'
import './sketch-handles'
import Map from '@arcgis/core/Map.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import TileLayer from '@arcgis/core/layers/TileLayer.js'
import MapView from '@arcgis/core/views/MapView.js'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js'
import Graphic from '@arcgis/core/Graphic.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js'
import type Point from '@arcgis/core/geometry/Point.js'
import * as labelPointOperator from '@arcgis/core/geometry/operators/labelPointOperator.js'
import Viewpoint from '@arcgis/core/Viewpoint.js'
import HighlightOptions from '@arcgis/core/views/support/HighlightOptions.js'
import type GraphicsLayerView from '@arcgis/core/views/layers/GraphicsLayerView.js'
import { watch } from '@arcgis/core/core/reactiveUtils.js'
import { Capacitor } from '@capacitor/core'
import { Check, ChevronRight, Download, ExternalLink, Focus, FolderOpen, Lock, LockOpen, Minus, PanelsTopLeft, Pencil, Plus, Save, Trash2, VectorPolygon, X, createIcons } from 'lucide'
import { createId, DetachedMap } from './detached-map'
import { attachCompass } from './compass'
import { attachSidebarScrollbar } from './sidebar-scroll'
import { defaultPolygonColor, fixedPolygonColor, groupOverlappingPolygons, isPolygonColor, polygonPalette } from './polygon-rules'
import { attachKeyboardSettings, shortcutsEnabled } from './keyboard-settings'

const fileActions = document.querySelector<HTMLDivElement>('#polygon-file-actions')!
const importButton = document.querySelector<HTMLButtonElement>('#import-polygons')!
const exportButton = document.querySelector<HTMLButtonElement>('#export-polygons')!
let fileOperationPending = false

const layer = new GraphicsLayer({ title: 'Polígonos' })
const map = new Map({
  basemap: {
    title: 'Satélite — Esri World Imagery',
    baseLayers: [new TileLayer({
      url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
      title: 'Esri World Imagery'
    })]
  },
  layers: [layer]
})
const view = new MapView({ container: 'map', map, center: [-46.6333, -23.5505], zoom: 11, constraints: { snapToZoom: false } })
view.highlights.push(new HighlightOptions({ name: 'polygon-selection', color: '#ffffff', haloColor: '#ffffff', haloOpacity: 1, fillOpacity: 0 }))
const sketch = new SketchViewModel({
  view,
  layer,
  updateOnGraphicClick: false,
  polygonSymbol: polygonSymbol(defaultPolygonColor),
  defaultUpdateOptions: { tool: 'reshape', toggleToolOnClick: false }
})

const drawButton = document.querySelector<HTMLButtonElement>('#draw-polygon')!
const finishButton = document.querySelector<HTMLButtonElement>('#finish-drawing')!
const cancelButton = document.querySelector<HTMLButtonElement>('#cancel-editing')!
const clearButton = document.querySelector<HTMLButtonElement>('#clear-polygons')!
const list = document.querySelector<HTMLUListElement>('#polygon-list')!
const empty = document.querySelector<HTMLElement>('#empty-state')!
const collectionHeading = document.querySelector<HTMLElement>('.collection-heading')!
const count = document.querySelector<HTMLSpanElement>('#polygon-count')!
const message = document.querySelector<HTMLParagraphElement>('#map-instructions')!
const mapStatus = document.querySelector<HTMLElement>('.map-status')!
const lastEdit = document.querySelector<HTMLParagraphElement>('#last-edit')!
const ready = document.querySelector<HTMLParagraphElement>('#map-ready')!
const clearDialog = document.querySelector<HTMLDialogElement>('#clear-dialog')!
const clearDialogTitle = document.querySelector<HTMLHeadingElement>('#clear-dialog-title')!
const clearDialogDescription = document.querySelector<HTMLParagraphElement>('#clear-dialog-description')!
const dismissClearButton = document.querySelector<HTMLButtonElement>('#dismiss-clear')!
const confirmClearButton = document.querySelector<HTMLButtonElement>('#confirm-clear')!
const deletedEditDialog = document.querySelector<HTMLDialogElement>('#deleted-edit-dialog')!
const restoreDeletedEditButton = document.querySelector<HTMLButtonElement>('#restore-deleted-edit')!
const confirmDeletedEditButton = document.querySelector<HTMLButtonElement>('#confirm-deleted-edit')!
const zoomInButton = document.querySelector<HTMLButtonElement>('#zoom-in')!
const zoomOutButton = document.querySelector<HTMLButtonElement>('#zoom-out')!
const northUpButton = document.querySelector<HTMLButtonElement>('#north-up')!
const northIndicator = document.querySelector<SVGElement>('.north-indicator')!
const detachButton = document.querySelector<HTMLButtonElement>('#detach-map')!
const returnButton = document.querySelector<HTMLButtonElement>('#return-map')!
const reuniteButton = document.querySelector<HTMLButtonElement>('#reunite-windows')!
const polygonActions = document.querySelector<HTMLElement>('.polygon-actions')!
const sidebarActions = document.querySelector<HTMLElement>('.sidebar-actions')!
const sidebarEditor = document.querySelector<HTMLElement>('.sidebar-editor')!
const sidebar = document.querySelector<HTMLElement>('.polygon-sidebar')!
attachSidebarScrollbar(document.querySelector<HTMLElement>('.sidebar-scroll')!, document.querySelector<HTMLElement>('.sidebar-scrollbar')!)
const mapWindowActions = document.querySelector<HTMLElement>('.map-window-actions')!
const mapWindowMenu = document.querySelector<HTMLElement>('.map-window-menu')!
const detachedTools = document.querySelector<HTMLElement>('#detached-tools')!
const connectionStatus = document.querySelector<HTMLElement>('#connection-status')!
const windowFeedback = document.querySelector<HTMLElement>('#window-feedback')!
const nameEditor = document.querySelector<HTMLElement>('#polygon-name-editor')!
const nameInput = document.querySelector<HTMLInputElement>('#polygon-name')!
const nameError = document.querySelector<HTMLElement>('#polygon-name-error')!
const colorEditor = document.querySelector<HTMLElement>('#polygon-color-editor')!
const colorOptions = document.querySelector<HTMLElement>('#polygon-color-options')!
const defaultColor = defaultPolygonColor
let draftColor: string = defaultColor
let colorChangeId: string | null = null
let pendingColorChangeId: string | null = null
const mapLabels = document.querySelector<HTMLElement>('#polygon-map-labels')!
const lockEditor = document.querySelector<HTMLElement>('#polygon-lock-editor')!
const lockInput = document.querySelector<HTMLInputElement>('#polygon-locked')!
const switchDialog = document.querySelector<HTMLDialogElement>('#switch-edit-dialog')!
const switchDescription = document.querySelector<HTMLElement>('#switch-edit-description')!
let draftLocked = false
let switchTargetId: string | null = null
let switchAfterCommitId: string | null = null
let switchingEdit = false
const labelNodes = new globalThis.Map<string, HTMLSpanElement>()
const labelAnchors = new WeakMap<Graphic, { geometry: Graphic['geometry']; point: Point }>()
let labelFrame: number | null = null
let draftName = ''
let shownNameError = ''
let nameChangeId: string | null = null
let pendingNameChangeId: string | null = null
let activeAction: 'create' | 'update' | null = null
let activeGraphic: Graphic | null = null
let selectedGraphic: Graphic | null = null
let expandedGraphic: Graphic | null = null
let committedPolygons: ReturnType<Graphic['toJSON']>[] = []
let pendingDeletion: Graphic | 'all' | null = null
let confirmingUpdate = false
let pendingSketchUpdate: Promise<void> | null = null
let cancellingUpdate = false
let deletedEditId: string | null = null
let confirmingDeletedEdit = false
let pendingPersistence: Promise<void> = Promise.resolve()
const storageDatabaseName = 'polygon-editor-poc'
const storageStoreName = 'state'
const storageKey = 'polygons'
let windowMode: 'main' | 'detached' | 'map' = 'main'
let windowConnected = false
let mapInitialized = false
let applyingWindowState = false
let graphicsLayerView: GraphicsLayerView | null = null
let selectionHighlight: { remove(): void } | null = null
let highlightedGraphic: Graphic | null = null
let validationWarning = false
let draftVertices: number[][] = []
let draftHistory: number[][][] = [[]]
let draftHistoryIndex = 0

type PolygonJSON = ReturnType<Graphic['toJSON']>
type MapCommand =
  | { type: 'draw' | 'finish' | 'cancel' | 'deselect' | 'confirm-edit-deletion' }
  | { type: 'select' | 'edit' | 'expand'; id: string }
  | { type: 'delete'; id: string | 'all' }
  | { type: 'request-deletion'; id: string | 'all' }
  | { type: 'dismiss-deletion' | 'confirm-deletion' }
  | { type: 'history'; action: 'undo' | 'redo' }
  | { type: 'navigate'; action: 'zoom-in' | 'zoom-out' | 'north-up' }
  | { type: 'rename'; id: string; value: string; changeId: string }
  | { type: 'import'; polygons: PolygonFileData[]; fileName: string }
  | { type: 'draft-lock'; id: string | null; value: boolean }
  | { type: 'color'; id: string | null; value: string; changeId: string }
  | { type: 'toggle-lock'; id: string }
  | { type: 'resolve-switch'; choice: 'save' | 'discard' | 'stay' }
interface MapState {
  polygons: PolygonJSON[]
  committed: PolygonJSON[]
  selectedId: string | null
  expandedId: string | null
  activeId: string | null
  action: 'create' | 'update' | null
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

const detachedMap = new DetachedMap<MapState, MapCommand>({
  getState: () => ({
    polygons: orderedGraphics().map((graphic) => graphic.toJSON()),
    committed: committedPolygons,
    selectedId: graphicId(selectedGraphic),
    expandedId: graphicId(expandedGraphic),
    activeId: graphicId(activeGraphic),
    action: activeAction,
    instructions: message.textContent ?? '',
    lastEdit: lastEdit.textContent ?? '',
    warning: validationWarning,
    deletedEditId,
    confirmingDeletedEdit,
    pendingDeletionId: pendingDeletion === 'all' ? 'all' : graphicId(pendingDeletion),
    draftName,
    draftLocked,
    draftColor,
    colorChangeId,
    switchTargetId,
    nameChangeId,
    viewpoint: view.viewpoint?.toJSON() ?? null
  }),
  applyState: applyWindowState,
  executeCommand: (command) => {
    if (command.type === 'color' && command.id === graphicId(activeGraphic)) updateDraftColor(command.value, command.changeId)
    if (command.type === 'resolve-switch') void resolveSwitch(command.choice)
    if (command.type === 'toggle-lock') {
      const graphic = findGraphic(command.id)
      if (graphic) toggleLock(graphic, true)
    }
    if (command.type === 'draft-lock' && activeAction && command.id === graphicId(activeGraphic)) {
      draftLocked = command.value
      lockInput.checked = draftLocked
      detachedMap.publish()
    }
    if (command.type === 'import') addImportedPolygons(command.polygons, command.fileName)
    if (command.type === 'draw') void beginDrawing()
    if (command.type === 'finish') finishButton.click()
    if (command.type === 'cancel') cancelButton.click()
    if (command.type === 'confirm-edit-deletion') confirmDeletedEditButton.click()
    if (command.type === 'dismiss-deletion') dismissDeletion()
    if (command.type === 'confirm-deletion') confirmClearButton.click()
    if (command.type === 'history') changeHistory(command.action)
    if (command.type === 'navigate') void navigateMap(command.action)
    if (command.type === 'request-deletion') {
      const target = command.id === 'all' ? 'all' : findGraphic(command.id)
      if (target) requestDeletion(target)
    }
    if (command.type === 'deselect') clearSelection()
    if (command.type === 'rename' && command.id === graphicId(activeGraphic)) updateDraftName(command.value, command.changeId)
    if (command.type === 'select') {
      const graphic = findGraphic(command.id)
      if (graphic) selectPolygon(graphic)
    }
    if (command.type === 'edit') {
      const graphic = findGraphic(command.id)
      if (graphic) void startEditing(graphic)
    }
    if (command.type === 'expand') {
      const graphic = findGraphic(command.id)
      if (graphic) toggleVertices(graphic)
    }
    if (command.type === 'delete') {
      const target = command.id === 'all' ? 'all' : findGraphic(command.id)
      if (target) deletePolygons(target)
    }
  },
  onModeChange: (mode, connected) => {
    windowMode = mode
    windowConnected = connected
    document.body.classList.toggle('map-window', mode === 'map')
    document.body.classList.toggle('map-detached', mode === 'detached')
    detachedTools.hidden = mode !== 'detached'
    mapWindowMenu.hidden = mode !== 'map'
    returnButton.hidden = mode !== 'map'
    detachButton.hidden = mode !== 'main' || Capacitor.isNativePlatform() || location.protocol === 'file:'
    // Os mesmos controles ficam acessíveis na janela que contém o mapa.
    const actionsContainer = mode === 'map' ? mapWindowActions : sidebarEditor
    const buttonsContainer = mode === 'map' ? mapWindowActions : sidebarActions
    buttonsContainer.append(polygonActions)
    actionsContainer.prepend(nameEditor)
    actionsContainer.prepend(lockEditor)
    actionsContainer.prepend(colorEditor)
    connectionStatus.textContent = connected ? 'Mapa conectado. Alterações sincronizadas.' : 'Conectando à janela do mapa…'
    document.title = mode === 'map' ? 'Mapa — Polígonos' : 'Polígonos no mapa'
    updateWindowControls()
    scheduleMapLabels()
  },
  onReturn: () => {
    // Uma edição ainda não confirmada segue a mesma regra do botão Cancelar.
    setActiveAction(null)
    forgetActiveEdit()
    restoreCommittedPolygons()
    pendingPersistence = persistPolygons(committedPolygons)
    message.textContent = 'Mapa reunido à aplicação.'
  },
  onError: (text) => {
    windowFeedback.textContent = text
    windowFeedback.hidden = false
  }
})

function graphicId(graphic: Graphic | null): string | null {
  return graphic?.attributes?.polygonId ?? null
}

function ensureGraphicIds() {
  layer.graphics.forEach((graphic) => {
    if (!graphicId(graphic)) graphic.attributes = { ...graphic.attributes, polygonId: createId() }
    if (typeof graphic.attributes?.name !== 'string' || validateName(graphic.attributes.name)) {
      let number = 1
      while (layer.graphics.some((item) => item.attributes?.name === `Polígono ${number}`)) number++
      graphic.attributes = { ...graphic.attributes, name: `Polígono ${number}` }
    }
  })
}

function polygonName(graphic: Graphic) {
  return graphic.attributes?.name ?? `Polígono ${layer.graphics.toArray().indexOf(graphic) + 1}`
}

function isLocked(graphic: Graphic | null) {
  return graphic?.attributes?.locked === true
}

function polygonColor(graphic: Graphic) {
  const stored = graphic.attributes?.color
  return fixedPolygonColor(stored ?? (graphic.symbol?.type === 'simple-fill' ? graphic.symbol.outline?.color?.toHex() : undefined))
}

function polygonSymbol(color: string) {
  return new SimpleFillSymbol({ color: `${color}80`, outline: { color, width: 2 } })
}

function editingSymbol(color: string) {
  return new SimpleFillSymbol({ color: `${color}80`, outline: { color: '#ffffff', width: 3 } })
}

function updateColorControls() {
  colorEditor.hidden = activeAction === null || Boolean(deletedEditId)
  colorOptions.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.color === draftColor))
  })
}

function updateDraftColor(value: string, changeId: string) {
  if (!activeAction || deletedEditId || !isPolygonColor(value)) return
  draftColor = value.toLowerCase()
  colorChangeId = changeId
  const symbol = polygonSymbol(draftColor)
  sketch.polygonSymbol = symbol
  sketch.activeFillSymbol = symbol.clone()
  if (activeAction === 'update' && activeGraphic) {
    activeGraphic.symbol = editingSymbol(draftColor)
    activeGraphic.attributes = { ...activeGraphic.attributes, color: draftColor }
  }
  updateColorControls()
  detachedMap.publish()
}

function chooseColor(value: string) {
  if (!activeAction || deletedEditId || !isPolygonColor(value)) return
  draftColor = value.toLowerCase()
  colorChangeId = createId()
  pendingColorChangeId = colorChangeId
  updateColorControls()
  if (detachedMap.command({ type: 'color', id: graphicId(activeGraphic), value: draftColor, changeId: colorChangeId })) return
  pendingColorChangeId = null
  updateDraftColor(draftColor, colorChangeId)
}

for (const [name, color] of polygonPalette) {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'color-swatch'
  button.dataset.color = color
  button.dataset.testid = 'polygon-color-option'
  button.setAttribute('aria-label', name)
  button.title = name
  button.style.setProperty('--swatch-color', color)
  button.addEventListener('click', () => chooseColor(color))
  colorOptions.append(button)
}

function toggleLock(graphic: Graphic, fromSidebar = false) {
  if (activeAction || (windowMode === 'map' && !fromSidebar)) return
  if (detachedMap.command({ type: 'toggle-lock', id: graphicId(graphic)! })) return
  graphic.attributes = { ...graphic.attributes, locked: !isLocked(graphic) }
  message.textContent = isLocked(graphic)
    ? 'Polígono travado. Para editar, destrave pelo cadeado na lista.'
    : 'Polígono destravado. Toque nele no mapa para editar.'
  void syncCommittedPolygons()
  render()
}

function setSwitchTarget(id: string | null) {
  switchTargetId = id
  const target = findGraphic(id)
  if (target) {
    switchDescription.textContent = `Salve ou cancele a edição de “${draftName || 'polígono atual'}” antes de abrir “${polygonName(target)}”.`
    if (!switchDialog.open) switchDialog.showModal()
  } else if (switchDialog.open) switchDialog.close()
}

async function resolveSwitch(choice: 'save' | 'discard' | 'stay') {
  if (detachedMap.command({ type: 'resolve-switch', choice })) return
  if (!switchTargetId || switchingEdit) return
  const targetId = switchTargetId
  setSwitchTarget(null)
  if (choice === 'stay') { detachedMap.publish(); return }
  if (choice === 'save') {
    switchAfterCommitId = targetId
    if (!await finishActiveAction()) switchAfterCommitId = null
  } else {
    switchingEdit = true
    await cancelActiveAction()
    switchingEdit = false
    const target = findGraphic(targetId)
    if (target) await startEditing(target)
  }
  detachedMap.publish()
}

function continueAfterCommit() {
  const id = switchAfterCommitId
  switchAfterCommitId = null
  const target = findGraphic(id)
  if (target) void startEditing(target)
}

function normalizeName(value: string) {
  return value.normalize('NFC').trim().replace(/ +/g, ' ')
}

function validateName(value: string) {
  const normalized = normalizeName(value)
  if (!normalized) return 'Informe um nome para o polígono.'
  if ([...normalized].length > 30) return 'O nome deve ter no máximo 30 caracteres.'
  if (!/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ]*$/u.test(normalized)) return 'Use apenas letras, números e espaços. Acentos são permitidos.'
  return ''
}

function updateNameField() {
  if (nameInput.value !== draftName) nameInput.value = draftName
  const error = validateName(draftName)
  if (activeAction === 'update' && !error && shownNameError && validationWarning && message.textContent === shownNameError) {
    setWarning(false)
    message.textContent = 'Modo de edição ativo: altere o nome, a cor ou o desenho e conclua para salvar.'
  }
  shownNameError = error
  const length = [...draftName.normalize('NFC')].length
  const hint = error || (length >= 24 ? `${length}/30 caracteres. ${length >= 30 ? 'Limite atingido.' : `${30 - length} restantes.`}` : '')
  nameError.textContent = hint
  nameError.hidden = !hint || activeAction !== 'update' || nameEditor.hidden
  if (nameError.hidden) nameEditor.style.paddingBottom = ''
  nameError.classList.toggle('is-error', Boolean(error))
  nameInput.setAttribute('aria-invalid', String(Boolean(error)))
  if (nameError.hidden) nameInput.removeAttribute('aria-describedby')
  else nameInput.setAttribute('aria-describedby', nameError.id)
  requestAnimationFrame(positionNameTooltip)
}

function positionNameTooltip() {
  if (nameError.hidden) return
  const box = nameInput.getBoundingClientRect()
  if (!box.width || !box.height) { nameError.hidden = true; return }
  const width = Math.min(280, innerWidth - 24)
  nameError.style.width = `${width}px`
  nameError.style.left = `${Math.min(Math.max(12, box.left), innerWidth - width - 12)}px`
  const height = nameError.getBoundingClientRect().height
  // Reservar o espaço do tooltip para não encobrir os controles abaixo do nome.
  nameEditor.style.paddingBottom = `${height + 7}px`
  nameError.style.top = `${box.bottom + height + 12 < innerHeight ? box.bottom + 7 : Math.max(8, box.top - height - 7)}px`
}
window.addEventListener('resize', positionNameTooltip)
window.addEventListener('scroll', positionNameTooltip, true)

function updateDraftName(value: string, changeId: string) {
  if (activeAction !== 'update' || deletedEditId) return
  draftName = value
  nameChangeId = changeId
  updateNameField()
  scheduleMapLabels()
  detachedMap.publish()
}

function findGraphic(id: string | null) {
  if (!id) return null
  return layer.graphics.find((graphic) => graphicId(graphic) === id) ?? null
}

function orderedGraphics() {
  // O SDK traz a área editada para frente no mapa; a lista mantém a ordem salva.
  const order = new globalThis.Map(committedPolygons.map((polygon, index) => [polygon.attributes?.polygonId, index]))
  return layer.graphics.toArray().sort((a, b) =>
    (order.get(graphicId(a)) ?? committedPolygons.length) - (order.get(graphicId(b)) ?? committedPolygons.length))
}

function scheduleMapLabels() {
  if (labelFrame !== null) return
  labelFrame = requestAnimationFrame(() => {
    labelFrame = null
    if (!mapInitialized || !view.ready || windowMode === 'detached') {
      mapLabels.replaceChildren()
      labelNodes.clear()
      return
    }
    const ids = new Set<string>()
    for (const graphic of orderedGraphics()) {
      const id = graphicId(graphic)
      const geometry = graphic.geometry
      if (!id || !isValidPolygon(geometry)) continue
      let anchor = labelAnchors.get(graphic)
      if (!anchor || anchor.geometry !== geometry) {
        anchor = { geometry, point: labelPointOperator.execute(geometry as Polygon) }
        labelAnchors.set(graphic, anchor)
      }
      const point = view.toScreen(anchor.point)
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
      ids.add(id)
      let label = labelNodes.get(id)
      if (!label) {
        label = document.createElement('span')
        label.className = 'polygon-map-label'
        label.dataset.testid = 'polygon-map-label'
        label.dataset.polygonId = id
        labelNodes.set(id, label)
        mapLabels.append(label)
      }
      label.textContent = activeAction === 'update' && graphic === activeGraphic
        ? normalizeName(draftName) || polygonName(graphic) : polygonName(graphic)
      label.classList.toggle('is-selected', graphic === selectedGraphic)
      label.style.left = `${point.x}px`
      label.style.top = `${point.y}px`
      label.hidden = point.x < 0 || point.y < 0 || point.x > view.width || point.y > view.height
    }
    for (const [id, label] of labelNodes) {
      if (ids.has(id)) continue
      label.remove()
      labelNodes.delete(id)
    }
  })
}

function updateWindowControls() {
  const focused = activeAction !== null
  sidebar.classList.toggle('is-working', focused)
  sidebarEditor.hidden = !focused
  collectionHeading.hidden = focused
  fileActions.hidden = focused || !window.polygonFiles || windowMode === 'map'
  detachButton.hidden = focused || windowMode !== 'main' || Capacitor.isNativePlatform() || location.protocol === 'file:'
  detachedTools.hidden = focused || windowMode !== 'detached'
  returnButton.hidden = focused || windowMode !== 'map'
  const fileWaiting = fileOperationPending || !mapInitialized || activeAction !== null || (windowMode === 'detached' && !windowConnected)
  importButton.disabled = fileWaiting
  exportButton.disabled = fileWaiting || committedPolygons.length === 0
  fileActions.setAttribute('aria-busy', String(fileOperationPending))
  detachButton.disabled = !mapInitialized || activeAction !== null
  detachButton.title = activeAction ? 'Conclua ou cancele a ação atual antes de separar o mapa' : 'Abrir o mapa em outra janela'
  const waiting = windowMode === 'detached' && !windowConnected
  clearButton.hidden = activeAction !== null
  const mapWaiting = !mapInitialized || (windowMode !== 'main' && !windowConnected)
  drawButton.disabled = mapWaiting
  if (isLocked(selectedGraphic)) drawButton.disabled = true
  finishButton.disabled = mapWaiting
  cancelButton.disabled = mapWaiting
  returnButton.disabled = activeAction !== null
  reuniteButton.disabled = activeAction !== null
  returnButton.title = reuniteButton.title = activeAction ? 'Conclua ou cancele a ação atual antes de reunir as telas' : 'Trazer o mapa de volta'
  list.inert = waiting
  clearButton.disabled = waiting || layer.graphics.length === 0
  updatePolygonButton()
  updateNavigationControls()
}

function updatePolygonButton() {
  const mode = selectedGraphic ? 'edit' : 'create'
  if (drawButton.dataset.mode !== mode) {
    drawButton.dataset.mode = mode
    drawButton.innerHTML = `<i data-lucide="vector-polygon" aria-hidden="true"></i><i data-lucide="${mode === 'edit' ? 'pencil' : 'plus'}" aria-hidden="true"></i><span>${mode === 'edit' ? 'Editar' : 'Criar'}</span>`
    renderIcons()
  }
  const label = selectedGraphic ? 'Editar polígono selecionado' : 'Criar um novo polígono'
  drawButton.setAttribute('aria-label', label)
  drawButton.title = shortcutsEnabled()
    ? selectedGraphic ? `${label} (E ou Enter). Esc limpa a seleção; N cria outro polígono.` : `${label} (N)`
    : label
  if (shortcutsEnabled()) drawButton.setAttribute('aria-keyshortcuts', selectedGraphic ? 'E Enter' : 'N')
  else drawButton.removeAttribute('aria-keyshortcuts')
  if (isLocked(selectedGraphic)) drawButton.title = 'Destrave o polígono pelo cadeado na lista para editar.'
}

function setWarning(warning: boolean) {
  validationWarning = warning
  mapStatus.classList.toggle('is-warning', warning)
  if (warning) message.setAttribute('role', 'alert')
  else message.removeAttribute('role')
}

function showDrawingWarning() {
  setWarning(true)
  message.textContent = 'Desenhe pelo menos 3 pontos diferentes formando uma área antes de concluir.'
  detachedMap.publish()
}

function isValidVertices(vertices: number[][]) {
  const unique = [...new globalThis.Map<string, number[]>(vertices.filter(([x, y]) => Number.isFinite(x) && Number.isFinite(y))
    .map((point) => [`${point[0]},${point[1]}`, point] as const)).values()]
  if (unique.length < 3) return false
  const [originX, originY] = unique[0]
  const area = unique.reduce((sum, [x, y], index) => {
    const [nextX, nextY] = unique[(index + 1) % unique.length]
    return sum + (x - originX) * (nextY - originY) - (nextX - originX) * (y - originY)
  }, 0)
  // Pontos alinhados podem ter pequenas diferenças numéricas após a projeção.
  const span = unique.reduce((max, [x, y]) => Math.max(max, Math.abs(x - originX), Math.abs(y - originY)), 0)
  return Math.abs(area) > span * span * 1e-10
}

function isValidPolygon(geometry: Graphic['geometry']) {
  return geometry?.type === 'polygon' && geometry.rings.length > 0 && geometry.rings.every(isValidVertices)
}

async function finishActiveAction() {
  if (activeAction === null) return false
  if (activeAction === 'update' && pendingSketchUpdate) {
    const graphic = activeGraphic
    while (pendingSketchUpdate) {
      try { await pendingSketchUpdate } catch { return false }
      if (activeAction !== 'update' || activeGraphic !== graphic) return false
    }
  }
  if (activeAction === 'update' && deletedEditId) {
    setDeletedEditConfirmation(true)
    detachedMap.publish()
    return true
  }
  if (activeAction === 'update') {
    const error = validateName(draftName)
    if (error) {
      setWarning(true)
      message.textContent = error
      updateNameField()
      if (!nameEditor.hidden) nameInput.focus()
      detachedMap.publish()
      return false
    }
  }
  if (activeAction === 'create' && !isValidVertices(draftVertices)) {
    showDrawingWarning()
    return false
  }
  if (activeAction === 'update' && !isValidPolygon(activeGraphic?.geometry ?? null)) {
    showDrawingWarning()
    return false
  }
  if (activeAction === 'update' && activeGraphic) {
    activeGraphic.attributes = { ...activeGraphic.attributes, name: normalizeName(draftName), locked: draftLocked, color: draftColor }
    activeGraphic.symbol = polygonSymbol(draftColor)
    confirmingUpdate = true
  }
  sketch.complete()
  return true
}

function updateNavigationControls() {
  const waiting = !mapInitialized || (windowMode === 'map' && !windowConnected)
  zoomInButton.disabled = waiting || !view.canZoomIn
  zoomOutButton.disabled = waiting || !view.canZoomOut
  northUpButton.disabled = waiting
  northIndicator.style.transform = `rotate(${view.rotation}deg)`
}

async function navigateMap(action: 'zoom-in' | 'zoom-out' | 'north-up') {
  if (detachedMap.command({ type: 'navigate', action })) return
  try {
    if (action === 'zoom-in') await view.zoomIn()
    if (action === 'zoom-out') await view.zoomOut()
    if (action === 'north-up' && view.viewpoint) {
      const viewpoint = view.viewpoint.clone()
      viewpoint.rotation = 0
      await view.goTo(viewpoint)
    }
  } catch (error) {
    // Outro gesto ou clique pode interromper uma animação de navegação.
    if (error instanceof Error && error.name === 'AbortError') return
    message.textContent = 'Não foi possível ajustar o mapa. Tente novamente.'
    detachedMap.publish()
  }
}

async function applyWindowState(state: MapState) {
  applyingWindowState = true
  try {
    // Uma resposta anterior do mapa não pode apagar letras digitadas mais recentemente.
    const keepLocalName = pendingNameChangeId && state.action === 'update' &&
      state.activeId === graphicId(activeGraphic) && !state.deletedEditId && state.nameChangeId !== pendingNameChangeId
    const keepLocalColor = pendingColorChangeId && state.action === activeAction &&
      state.activeId === graphicId(activeGraphic) && state.colorChangeId !== pendingColorChangeId
    sketch.cancel()
    layer.removeAll()
    state.polygons.forEach((polygon) => layer.add(Graphic.fromJSON(polygon)))
    committedPolygons = state.committed
    selectedGraphic = findGraphic(state.selectedId)
    expandedGraphic = findGraphic(state.expandedId)
    activeGraphic = findGraphic(state.activeId)
    pendingDeletion = state.pendingDeletionId === 'all' ? 'all' : findGraphic(state.pendingDeletionId)
    deletedEditId = state.deletedEditId
    draftLocked = state.draftLocked
    if (!keepLocalColor) {
      draftColor = fixedPolygonColor(state.draftColor)
      colorChangeId = state.colorChangeId
      pendingColorChangeId = null
    }
    setSwitchTarget(state.switchTargetId)
    if (!keepLocalName) {
      draftName = state.draftName
      nameChangeId = state.nameChangeId
      pendingNameChangeId = null
    }
    if (state.viewpoint) view.viewpoint = Viewpoint.fromJSON(state.viewpoint)
    setActiveAction(state.action)
    message.textContent = state.instructions
    setWarning(state.warning)
    lastEdit.textContent = state.lastEdit
    render()
    setDeletedEditConfirmation(state.confirmingDeletedEdit)
    updateDeletionDialog()
    if (detachedMap.isMapWindow && state.action === 'update' && activeGraphic) {
      await activateSketchUpdate(activeGraphic)
    } else if (detachedMap.isMapWindow && state.action === 'create') {
      // O rascunho incompleto não sobrevive ao recarregamento da janela.
      setActiveAction(null)
      message.textContent = 'Rascunho cancelado após recarregar. Pronto para desenhar.'
    }
  } finally {
    applyingWindowState = false
  }
}

function localStorageFallbackLoad(): ReturnType<Graphic['toJSON']>[] {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function localStorageFallbackSave(polygons: ReturnType<Graphic['toJSON']>[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(polygons))
  } catch {
    // O mapa continua utilizável mesmo quando o armazenamento do dispositivo está cheio ou bloqueado.
  }
}

function openStorageDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const request = indexedDB.open(storageDatabaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storageStoreName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function loadPersistedPolygons() {
  try {
    const database = await openStorageDatabase()
    const polygons = await new Promise<ReturnType<Graphic['toJSON']>[]>((resolve, reject) => {
      const request = database.transaction(storageStoreName, 'readonly').objectStore(storageStoreName).get(storageKey)
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : [])
      request.onerror = () => reject(request.error)
    })
    database.close()
    return polygons
  } catch {
    return localStorageFallbackLoad()
  }
}

async function persistPolygons(polygons: ReturnType<Graphic['toJSON']>[]) {
  try {
    const database = await openStorageDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storageStoreName, 'readwrite')
      transaction.objectStore(storageStoreName).put(polygons, storageKey)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    database.close()
  } catch {
    localStorageFallbackSave(polygons)
  }
}

function renderIcons() {
  createIcons({ icons: { Check, ChevronRight, Download, ExternalLink, Focus, FolderOpen, Lock, LockOpen, Minus, PanelsTopLeft, Pencil, Plus, Save, Trash2, VectorPolygon, X } })
}

function updateSelectionHighlight() {
  const target = activeAction === 'update' && selectedGraphic === activeGraphic ? null : selectedGraphic
  if (!graphicsLayerView || highlightedGraphic === target) return
  selectionHighlight?.remove()
  selectionHighlight = target
    ? graphicsLayerView.highlight(target, { name: 'polygon-selection' })
    : null
  highlightedGraphic = target
}

function setActiveAction(action: 'create' | 'update' | null) {
  setWarning(false)
  activeAction = action
  drawButton.hidden = action !== null
  finishButton.hidden = action === null
  cancelButton.hidden = action === null
  if (action) {
    finishButton.innerHTML = `<i data-lucide="check" aria-hidden="true"></i><span>${action === 'create' ? 'Concluir desenho' : 'Concluir edição'}</span>`
    renderIcons()
  }
  updateWindowControls()
}

function requestDeletion(target: Graphic | 'all') {
  const id = target === 'all' ? 'all' : graphicId(target)!
  if (detachedMap.command({ type: 'request-deletion', id })) return
  pendingDeletion = target
  updateDeletionDialog()
  detachedMap.publish()
}

function updateDeletionDialog() {
  const target = pendingDeletion
  if (!target) {
    if (clearDialog.open) clearDialog.close()
    return
  }
  const isAll = target === 'all'
  clearDialogTitle.textContent = isAll ? 'Apagar todos os polígonos?' : 'Apagar este polígono?'
  clearDialogDescription.textContent = isAll
    ? 'Essa ação removerá todos os polígonos desenhados no mapa.'
    : `Essa ação removerá “${polygonName(target)}” do mapa.${activeAction === 'update' ? ' Confirmar a exclusão também encerrará a edição.' : ''}`
  confirmClearButton.textContent = isAll ? 'Apagar todos' : 'Excluir polígono'
  if (!clearDialog.open) clearDialog.showModal()
}

function dismissDeletion() {
  if (detachedMap.command({ type: 'dismiss-deletion' })) return
  pendingDeletion = null
  updateDeletionDialog()
  detachedMap.publish()
}

function forgetActiveEdit() {
  activeGraphic = null
  pendingSketchUpdate = null
  draftName = ''
  draftLocked = false
  draftColor = defaultColor
  colorChangeId = null
  pendingColorChangeId = null
  colorEditor.hidden = true
  nameError.hidden = true
  shownNameError = ''
  lockEditor.hidden = true
  setSwitchTarget(null)
  nameChangeId = null
  pendingNameChangeId = null
  nameEditor.hidden = true
  deletedEditId = null
  setDeletedEditConfirmation(false)
}

function setDeletedEditConfirmation(open: boolean) {
  confirmingDeletedEdit = open
  if (open && !deletedEditDialog.open) deletedEditDialog.showModal()
  if (!open && deletedEditDialog.open) deletedEditDialog.close()
}

function syncCommittedPolygons(preferred?: Graphic | null) {
  ensureGraphicIds()
  let groups: ReturnType<typeof groupOverlappingPolygons>
  try {
    groups = groupOverlappingPolygons(orderedGraphics(), preferred)
  } catch {
    // A geometria só é aplicada após preparar todas as uniões com sucesso.
    switchAfterCommitId = null
    setActiveAction(null)
    forgetActiveEdit()
    restoreCommittedPolygons()
    setWarning(true)
    message.textContent = 'Não foi possível fundir os polígonos. As alterações não foram salvas; tente ajustar o desenho.'
    render()
    detachedMap.publish()
    return null
  }
  let merged = 0
  for (const group of groups) {
    const graphic = group.survivor
    graphic.attributes = { ...graphic.attributes, color: group.color, locked: group.locked }
    graphic.symbol = polygonSymbol(group.color)
    if (group.members.length > 1) {
      graphic.geometry = group.geometry
      labelAnchors.delete(graphic)
      for (const member of group.members) {
        if (selectedGraphic === member) selectedGraphic = graphic
        if (expandedGraphic === member) expandedGraphic = graphic
        if (switchAfterCommitId === graphicId(member)) switchAfterCommitId = graphicId(graphic)
        if (member !== graphic) { layer.remove(member); merged++ }
      }
    }
  }
  committedPolygons = orderedGraphics().map((graphic) => graphic.toJSON())
  pendingPersistence = persistPolygons(committedPolygons)
  if (merged) lastEdit.textContent = `${merged} área(s) incorporada(s) por fusão de polígonos da mesma cor.`
  return merged
}

function fileFeedback(text: string) {
  windowFeedback.textContent = text
  windowFeedback.hidden = false
}

function addImportedPolygons(polygons: PolygonFileData[], fileName: string) {
  if (activeAction) {
    fileFeedback('Conclua ou cancele a edição antes de importar. Nenhum polígono foi acrescentado.')
    return
  }
  const imported = polygons.map((polygon) => new Graphic({
    geometry: new Polygon(polygon.geometry),
    attributes: { polygonId: createId(), name: polygon.name, locked: polygon.locked === true, color: fixedPolygonColor(polygon.color) },
    symbol: polygonSymbol(fixedPolygonColor(polygon.color))
  }))
  // Construir todo o lote antes de alterar a coleção. IDs novos evitam colisões ao reimportar.
  layer.addMany(imported)
  selectedGraphic = imported[0] ?? null
  expandedGraphic = selectedGraphic
  setWarning(false)
  message.textContent = `${imported.length} polígono(s) importado(s) de ${fileName}.`
  if (syncCommittedPolygons() === null) return
  render()
  void view.goTo(layer.graphics.toArray()).catch(() => { /* O usuário pode interromper o enquadramento. */ })
}

async function polygonFileOperation(action: 'import' | 'export') {
  if (!window.polygonFiles || fileOperationPending || activeAction) return
  fileOperationPending = true
  windowFeedback.hidden = true
  updateWindowControls()
  try {
    const result = action === 'import'
      ? await window.polygonFiles.importPolygons()
      : await window.polygonFiles.exportPolygons(committedPolygons.map((polygon) => ({
        name: polygon.attributes.name, geometry: polygon.geometry,
        ...(polygon.attributes.locked === true ? { locked: true } : {}),
        ...(polygon.attributes.color ? { color: polygon.attributes.color } : {})
      })))
    if (result.status === 'cancelled') {
      fileFeedback(action === 'import' ? 'Importação cancelada.' : 'Exportação cancelada.')
    } else if (result.status === 'error') {
      fileFeedback(result.message)
    } else if (action === 'export') {
      fileFeedback(`${result.count} polígono(s) exportado(s) para ${result.fileName}.`)
    } else if (result.polygons) {
      const command = { type: 'import' as const, polygons: result.polygons, fileName: result.fileName }
      if (!detachedMap.command(command)) addImportedPolygons(command.polygons, command.fileName)
    }
  } catch {
    fileFeedback('Não foi possível concluir a operação de arquivo. Tente novamente.')
  } finally {
    fileOperationPending = false
    updateWindowControls()
  }
}

importButton.addEventListener('click', () => { void polygonFileOperation('import') })
exportButton.addEventListener('click', () => { void polygonFileOperation('export') })

function restoreCommittedPolygons() {
  const selectedId = graphicId(selectedGraphic)
  const expandedId = graphicId(expandedGraphic)
  layer.removeAll()
  committedPolygons.forEach((polygon) => layer.add(Graphic.fromJSON(polygon)))
  selectedGraphic = findGraphic(selectedId)
  expandedGraphic = findGraphic(expandedId)
  render()
}

async function cancelActiveAction() {
  switchAfterCommitId = null
  cancellingUpdate = activeAction === 'update'
  confirmingUpdate = false
  setActiveAction(null)
  sketch.cancel()
  forgetActiveEdit()
  await new Promise<void>((resolve) => requestAnimationFrame(() => {
    restoreCommittedPolygons()
    cancellingUpdate = false
    resolve()
  }))
}

function commitActiveEdit() {
  const merged = syncCommittedPolygons(activeGraphic)
  forgetActiveEdit()
  return merged
}

async function activateSketchUpdate(graphic: Graphic) {
  graphic.symbol = editingSymbol(draftColor)
  // A edição usa contorno branco; o halo fica reservado à seleção sem edição.
  const update = sketch.update(graphic, { tool: 'reshape', toggleToolOnClick: false, highlightOptions: { enabled: false } })
  pendingSketchUpdate = update
  try {
    await update
  } catch (error) {
    if (!(error instanceof Error && error.name === 'AbortError')) throw error
  } finally {
    if (pendingSketchUpdate === update) pendingSketchUpdate = null
  }
}

async function startEditing(graphic: Graphic) {
  if (switchingEdit) return
  if (detachedMap.command({ type: 'edit', id: graphicId(graphic)! })) return
  if (activeAction === 'create') return
  if (activeAction === 'update' && graphicId(activeGraphic) === graphicId(graphic)) return
  if (activeAction === 'update' && graphicId(activeGraphic) !== graphicId(graphic)) {
    setSwitchTarget(graphicId(graphic))
    detachedMap.publish()
    return
  }
  selectedGraphic = graphic
  expandedGraphic = graphic
  if (isLocked(graphic)) {
    message.textContent = 'Polígono travado. Destrave pelo cadeado na lista para editar.'
    render()
    return
  }
  confirmingUpdate = false
  activeGraphic = graphic
  draftName = polygonName(graphic)
  draftColor = polygonColor(graphic)
  colorChangeId = null
  pendingColorChangeId = null
  sketch.activeFillSymbol = polygonSymbol(draftColor)
  draftLocked = isLocked(graphic)
  nameChangeId = null
  pendingNameChangeId = null
  setActiveAction('update')
  message.textContent = 'Modo de edição ativo: altere o nome ou arraste vértices e arestas. Use “Concluir edição” para salvar.'
  render()
  await activateSketchUpdate(graphic)
}

async function framePolygon(graphic: Graphic) {
  const extent = graphic.geometry?.extent
  if (!extent || !view.ready) return
  try {
    await view.goTo({ target: extent.clone().expand(1.7), rotation: view.rotation }, { duration: 400 })
  } catch (error) {
    // Um novo card ou gesto pode interromper o enquadramento anterior.
    if (error instanceof Error && error.name === 'AbortError') return
    message.textContent = 'Não foi possível enquadrar o polígono. Tente selecionar o card novamente.'
    detachedMap.publish()
  }
}

function selectPolygon(graphic: Graphic) {
  if (detachedMap.command({ type: 'select', id: graphicId(graphic)! })) return
  selectedGraphic = graphic
  expandedGraphic = graphic
  if (activeAction === null) {
    setWarning(false)
    message.textContent = isLocked(graphic)
      ? 'Polígono travado. Destrave pelo cadeado na lista para editar.'
      : 'Polígono selecionado. Toque nele no mapa, use Enter ou o botão Editar.'
  }
  render()
  if (activeAction === null) void framePolygon(graphic)
}

function clearSelection() {
  if (activeAction !== null || detachedMap.command({ type: 'deselect' })) return
  selectedGraphic = null
  expandedGraphic = null
  setWarning(false)
  message.textContent = 'Seleção limpa. Pronto para desenhar um novo polígono.'
  render()
}

function toggleVertices(graphic: Graphic) {
  if (detachedMap.command({ type: 'expand', id: graphicId(graphic)! })) return
  const closing = expandedGraphic === graphic
  selectedGraphic = closing ? null : graphic
  expandedGraphic = closing ? null : graphic
  if (activeAction === null) {
    setWarning(false)
    message.textContent = closing
      ? 'Seleção limpa. Pronto para desenhar um novo polígono.'
      : 'Polígono selecionado. Use Enter ou o botão Editar para alterar o nome e o desenho.'
  }
  render()
  if (!closing && activeAction === null) void framePolygon(graphic)
}

function deletePolygons(target: Graphic | 'all') {
  const targetId = target === 'all' ? 'all' : graphicId(target)!
  if (detachedMap.command({ type: 'delete', id: targetId })) return
  // Descartar outras alterações ainda não confirmadas antes de excluir.
  applyingWindowState = true
  sketch.cancel()
  setActiveAction(null)
  forgetActiveEdit()
  const polygonNumber = target === 'all' ? 0 : committedPolygons.findIndex((polygon) => polygon.attributes?.polygonId === targetId) + 1
  restoreCommittedPolygons()
  if (target === 'all') {
    layer.removeAll()
    selectedGraphic = null
    expandedGraphic = null
    message.textContent = 'Polígonos removidos.'
  } else {
    const graphic = findGraphic(targetId)
    if (graphic) layer.remove(graphic)
    if (graphicId(selectedGraphic) === targetId) selectedGraphic = null
    if (graphicId(expandedGraphic) === targetId) expandedGraphic = null
    message.textContent = `Polígono ${polygonNumber} removido.`
  }
  applyingWindowState = false
  syncCommittedPolygons()
  render()
}

function render() {
  const nameFocused = document.activeElement === nameInput
  const selectionStart = nameInput.selectionStart
  const selectionEnd = nameInput.selectionEnd
  const actionsContainer = windowMode === 'map' ? mapWindowActions : sidebarEditor
  actionsContainer.prepend(nameEditor)
  actionsContainer.prepend(lockEditor)
  actionsContainer.prepend(colorEditor)
  updateColorControls()
  lockEditor.hidden = activeAction === null || Boolean(deletedEditId)
  lockInput.checked = draftLocked
  nameEditor.hidden = activeAction !== 'update' || !activeGraphic || Boolean(deletedEditId)
  updateNameField()
  list.replaceChildren()
  empty.hidden = activeAction !== null || layer.graphics.length > 0
  list.hidden = activeAction === 'create' || Boolean(deletedEditId)
  count.textContent = String(layer.graphics.length)
  clearButton.disabled = layer.graphics.length === 0
  orderedGraphics().forEach((graphic) => {
    const item = document.createElement('li')
    item.dataset.testid = 'polygon-item'
    item.className = 'pin'
    item.hidden = activeAction !== null && graphic !== activeGraphic
    if (graphic === selectedGraphic) item.classList.add('selected')
    const label = document.createElement('span')
    label.className = 'polygon-label'
    label.tabIndex = 0
    label.setAttribute('role', 'button')
    label.setAttribute('aria-expanded', String(graphic === expandedGraphic))
    const name = polygonName(graphic)
    label.textContent = name
    item.addEventListener('click', (event) => {
      if ((event.target as Element).closest('button, .polygon-name-editor, .polygon-lock-editor')) return
      selectPolygon(graphic)
    })
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        event.stopPropagation()
        if (event.repeat) return
        if (shortcutsEnabled() && event.key === 'Enter' && activeAction === null && selectedGraphic === graphic) void startEditing(graphic)
        else selectPolygon(graphic)
      }
    })
    const expand = document.createElement('button')
    expand.type = 'button'
    expand.dataset.testid = 'expand-polygon'
    expand.className = 'icon-button expand-polygon'
    expand.setAttribute('aria-expanded', String(graphic === expandedGraphic))
    expand.setAttribute('aria-label', graphic === expandedGraphic ? `Ocultar vértices de ${name}` : `Mostrar vértices de ${name}`)
    expand.innerHTML = '<i data-lucide="chevron-right" aria-hidden="true"></i>'
    expand.addEventListener('click', () => {
      toggleVertices(graphic)
    })
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.dataset.testid = 'delete-polygon'
    remove.className = 'icon-button delete-polygon'
    remove.title = `Excluir ${name}`
    remove.setAttribute('aria-label', `Excluir ${name}`)
    remove.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>'
    remove.addEventListener('click', () => {
      requestDeletion(graphic)
    })
    const editingName = windowMode !== 'map' && activeAction === 'update' && graphic === activeGraphic
    const lock = document.createElement('button')
    lock.type = 'button'
    lock.dataset.testid = 'toggle-polygon-lock'
    lock.className = 'icon-button polygon-lock-button'
    lock.setAttribute('aria-label', `${isLocked(graphic) ? 'Destravar' : 'Travar'} ${name}`)
    lock.setAttribute('aria-pressed', String(isLocked(graphic)))
    lock.title = `${isLocked(graphic) ? 'Destravar' : 'Travar'} ${name}`
    lock.disabled = activeAction !== null
    lock.innerHTML = `<i data-lucide="${isLocked(graphic) ? 'lock' : 'lock-open'}" aria-hidden="true"></i>`
    lock.addEventListener('click', () => toggleLock(graphic))
    item.append(expand, editingName ? nameEditor : label)
    const metadata = document.createElement('div')
    metadata.className = 'polygon-meta'
    const vertexCount = (graphic.geometry as Polygon).rings.reduce((total, ring) => total + Math.max(0, ring.length - 1), 0)
    const details = document.createElement('span')
    details.textContent = String(vertexCount)
    metadata.setAttribute('aria-label', `${vertexCount} vértices`)
    metadata.title = `${vertexCount} vértices`
    metadata.append(details)
    item.append(metadata, lock, remove)
    if (graphic === expandedGraphic) {
      const vertices = document.createElement('ul')
      vertices.className = 'vertex-list'
      const polygon = graphic.geometry as Polygon
      polygon.rings[0].slice(0, -1).forEach(([longitude, latitude], vertexIndex) => {
        const vertex = document.createElement('li')
        vertex.innerHTML = `Vértice ${vertexIndex + 1}: <code>${longitude.toFixed(5)}, ${latitude.toFixed(5)}</code>`
        vertices.append(vertex)
      })
      item.append(vertices)
    }
    list.append(item)
  })
  updateSelectionHighlight()
  renderIcons()
  updateWindowControls()
  scheduleMapLabels()
  if (nameFocused && !nameEditor.hidden) {
    nameInput.focus({ preventScroll: true })
    nameInput.setSelectionRange(selectionStart, selectionEnd)
  }
  if (!applyingWindowState) detachedMap.publish()
}

async function beginDrawing() {
  if (activeAction !== null) return
  selectedGraphic = null
  expandedGraphic = null
  draftVertices = []
  draftHistory = [[]]
  draftHistoryIndex = 0
  forgetActiveEdit()
  sketch.polygonSymbol = polygonSymbol(defaultColor)
  sketch.activeFillSymbol = polygonSymbol(defaultColor)
  setActiveAction('create')
  message.textContent = 'Clique para criar vértices; dê dois cliques ou use “Concluir desenho” para finalizar.'
  render()
  await sketch.create('polygon', { mode: 'click' })
}
drawButton.addEventListener('click', () => {
  if (selectedGraphic) {
    void startEditing(selectedGraphic)
    return
  }
  if (!detachedMap.command({ type: 'draw' })) void beginDrawing()
})
nameInput.addEventListener('input', () => {
  draftName = nameInput.value
  nameChangeId = createId()
  pendingNameChangeId = nameChangeId
  updateNameField()
  scheduleMapLabels()
  if (detachedMap.command({ type: 'rename', id: graphicId(activeGraphic)!, value: draftName, changeId: nameChangeId })) return
  pendingNameChangeId = null
  updateDraftName(draftName, nameChangeId)
})
nameInput.addEventListener('keydown', (event) => {
  // As teclas de texto não devem acionar atalhos de edição do mapa.
  event.stopPropagation()
})
lockInput.addEventListener('change', () => {
  if (!activeAction) return
  draftLocked = lockInput.checked
  if (!detachedMap.command({ type: 'draft-lock', id: graphicId(activeGraphic), value: draftLocked })) detachedMap.publish()
})
for (const [id, choice] of [['save-and-switch', 'save'], ['discard-and-switch', 'discard'], ['dismiss-switch', 'stay']] as const) {
  document.getElementById(id)!.addEventListener('click', () => void resolveSwitch(choice))
}
switchDialog.addEventListener('cancel', (event) => {
  event.preventDefault()
  void resolveSwitch('stay')
})
finishButton.addEventListener('click', () => {
  if (detachedMap.command({ type: 'finish' })) return
  finishActiveAction()
})
cancelButton.addEventListener('click', () => {
  if (detachedMap.command({ type: 'cancel' })) return
  confirmingUpdate = false
  void cancelActiveAction()
  message.textContent = 'Desenho ou edição cancelado.'
})
clearButton.addEventListener('click', () => requestDeletion('all'))
dismissClearButton.addEventListener('click', dismissDeletion)
clearDialog.addEventListener('cancel', (event) => {
  event.preventDefault()
  dismissDeletion()
})
confirmClearButton.addEventListener('click', () => {
  if (detachedMap.command({ type: 'confirm-deletion' })) return
  const target = pendingDeletion
  if (!target) return
  pendingDeletion = null
  updateDeletionDialog()
  deletePolygons(target)
  detachedMap.publish()
})
restoreDeletedEditButton.addEventListener('click', () => cancelButton.click())
deletedEditDialog.addEventListener('cancel', (event) => {
  event.preventDefault()
  cancelButton.click()
})
confirmDeletedEditButton.addEventListener('click', () => {
  if (detachedMap.command({ type: 'confirm-edit-deletion' })) return
  if (activeAction !== 'update' || !deletedEditId) return
  const polygon = committedPolygons.find((item) => item.attributes?.polygonId === deletedEditId)
  if (polygon) deletePolygons(Graphic.fromJSON(polygon))
  continueAfterCommit()
})
zoomInButton.addEventListener('click', () => void navigateMap('zoom-in'))
zoomOutButton.addEventListener('click', () => void navigateMap('zoom-out'))
attachCompass(northUpButton, {
  getRotation: () => view.rotation,
  setRotation: (rotation) => { view.rotation = rotation },
  resetNorth: () => void navigateMap('north-up'),
  stopAnimation: () => view.animation?.stop(),
  onChange: () => detachedMap.publish()
})
detachButton.addEventListener('click', () => {
  windowFeedback.hidden = true
  detachedMap.open()
})
returnButton.addEventListener('click', () => detachedMap.reunite())
reuniteButton.addEventListener('click', () => detachedMap.reunite())
document.querySelector('#focus-map')!.addEventListener('click', () => detachedMap.focus())
sketch.on('create', (event) => {
  if (applyingWindowState) return
  if (event.state === 'start') setActiveAction('create')
  const info = event.toolEventInfo
  if (info?.type === 'vertex-add' || info?.type === 'vertex-remove') {
    const vertices = [...info.vertices].sort((a, b) => info.type === 'vertex-add'
      ? a.vertexIndex - b.vertexIndex : b.vertexIndex - a.vertexIndex)
    for (const vertex of vertices) {
      if (info.type === 'vertex-add') draftVertices.splice(vertex.vertexIndex, 0, vertex.coordinates.slice())
      else draftVertices.splice(vertex.vertexIndex, 1)
    }
    draftHistory = draftHistory.slice(0, draftHistoryIndex + 1)
    draftHistory.push(draftVertices.map((point) => point.slice()))
    draftHistoryIndex = draftHistory.length - 1
    if (validationWarning) {
      setWarning(false)
      message.textContent = 'Continue adicionando pontos e use “Concluir desenho” para salvar.'
    }
  }
  if (event.state === 'complete') {
    if (event.graphic) {
      event.graphic.attributes = { ...event.graphic.attributes, locked: draftLocked, color: draftColor }
      event.graphic.symbol = polygonSymbol(draftColor)
    }
    setActiveAction(null)
    forgetActiveEdit()
    if (!isValidPolygon(event.graphic?.geometry ?? null)) {
      restoreCommittedPolygons()
      showDrawingWarning()
      return
    }
    const merged = syncCommittedPolygons(event.graphic)
    if (merged === null) return
    if (merged) selectedGraphic = expandedGraphic = event.graphic ?? null
    message.textContent = merged
      ? 'Polígonos da mesma cor fundidos. O nome do desenho salvo foi mantido.'
      : 'Polígono criado. Toque nele no mapa para editar; se estiver travado, destrave pela lista.'
    render()
  }
  if (event.state === 'cancel') setActiveAction(null)
  detachedMap.publish()
})
sketch.on('undo', () => {
  if (activeAction !== 'create') return
  draftHistoryIndex = Math.max(0, draftHistoryIndex - 1)
  draftVertices = draftHistory[draftHistoryIndex].map((point) => point.slice())
})
sketch.on('redo', () => {
  if (activeAction !== 'create') return
  draftHistoryIndex = Math.min(draftHistory.length - 1, draftHistoryIndex + 1)
  draftVertices = draftHistory[draftHistoryIndex].map((point) => point.slice())
})
sketch.on('delete', (event) => {
  if (applyingWindowState || activeAction !== 'update') return
  const deleted = event.graphics.find((graphic) => graphicId(graphic) === graphicId(activeGraphic))
  if (!deleted) return
  deletedEditId = graphicId(deleted)
  if (graphicId(selectedGraphic) === deletedEditId) selectedGraphic = null
  if (graphicId(expandedGraphic) === deletedEditId) expandedGraphic = null
  setWarning(false)
  message.textContent = 'Polígono apagado nesta edição. Use “Concluir edição” para confirmar a exclusão ou Cancelar para restaurá-lo.'
  render()
})
sketch.on('update', (event) => {
  if (applyingWindowState) return
  event.graphics.forEach((graphic) => labelAnchors.delete(graphic))
  scheduleMapLabels()
  if (event.state === 'start') {
    activeGraphic = event.graphics[0] ?? null
    selectedGraphic = activeGraphic
    expandedGraphic = activeGraphic
    setActiveAction('update')
    render()
  }
  const type = event.toolEventInfo?.type
  if (type === 'move-stop') lastEdit.textContent = 'Polígono movido.'
  if (type === 'reshape-stop') lastEdit.textContent = 'Vértice ou aresta arrastada.'
  if (type === 'vertex-add') lastEdit.textContent = 'Novo vértice adicionado.'
  if (type === 'move-stop' || type === 'reshape-stop' || type === 'vertex-add') render()
  if (event.state === 'complete') {
    if (cancellingUpdate) return
    // Delete encerra a operação do SDK, mas a exclusão ainda precisa ser confirmada.
    if (activeAction === 'update' && activeGraphic && !layer.graphics.includes(activeGraphic)) return
    if (activeAction === 'update' && !confirmingUpdate && activeGraphic) {
      message.textContent = 'Edição mantida ativa. Use Enter ou “Concluir edição” para confirmar.'
      void activateSketchUpdate(activeGraphic)
      return
    }
    confirmingUpdate = false
    const merged = commitActiveEdit()
    if (merged === null) return
    setActiveAction(null)
    message.textContent = merged ? 'Polígonos da mesma cor fundidos. O nome do polígono editado foi mantido.' : 'Polígono editado.'
    render()
    continueAfterCommit()
  }
})
function isDrawing() { return activeAction === 'create' }
view.on('immediate-click', async (event) => {
  if (isDrawing() || switchingEdit || switchTargetId) return
  const result = await view.hitTest(event, { include: [layer] })
  if (isDrawing() || switchingEdit || switchTargetId) return
  const hit = result.results.find((item) => item.type === 'graphic' && item.graphic.layer === layer)
  if (hit?.type === 'graphic') {
    if (isLocked(hit.graphic)) return
    void startEditing(hit.graphic)
  }
  else clearSelection()
})
function changeHistory(action: 'undo' | 'redo') {
  if (!activeAction || detachedMap.command({ type: 'history', action })) return
  if (action === 'undo' && sketch.canUndo()) sketch.undo()
  if (action === 'redo' && sketch.canRedo()) sketch.redo()
  render()
}

attachKeyboardSettings(updatePolygonButton)
window.addEventListener('keydown', (event) => {
  const target = event.target instanceof Element ? event.target : null
  if (target?.closest('dialog') || event.isComposing) return
  const control = target?.closest('button, a, summary, input, textarea, select, [contenteditable]:not([contenteditable="false"])')
  const textControl = target?.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable]:not([contenteditable="false"])')
  const key = event.key.toLowerCase()
  const modified = event.ctrlKey || event.metaKey || event.altKey
  if (!shortcutsEnabled()) {
    // Desligar também os atalhos do SDK no canvas; Tab e ativação de botões
    // continuam disponíveis como navegação acessível, assim como a edição de texto.
    const nativeControl = target?.closest('button, a, summary, input, textarea, select, [role="button"], [contenteditable]:not([contenteditable="false"])')
    const sdkShortcut = key === 'delete' || key === 'backspace' || (!modified && ['enter', 'escape', 'z', 'r', 'f', '+', '=', '-', '0'].includes(key))
    const historyShortcut = (event.ctrlKey || event.metaKey) && activeAction && (key === 'z' || key === 'y')
    if (!nativeControl && (sdkShortcut || historyShortcut)) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    return
  }
  const deletionTarget = activeGraphic ?? selectedGraphic
  if (event.key === 'Delete' && !textControl && activeAction !== 'create' && deletionTarget) {
    event.preventDefault()
    // Interceptar antes do SDK remover o desenho ou os vértices selecionados.
    event.stopImmediatePropagation()
    if (!event.repeat) requestDeletion(deletionTarget)
    return
  }
  if (!textControl && !event.altKey && (event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
    if (!activeAction) return
    event.preventDefault()
    event.stopImmediatePropagation()
    if (!event.repeat) changeHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo')
    return
  }
  if (modified) return
  if (!textControl && ['n', 'e', 'm', 'z', 'r', '+', '=', '-', '0', '1', '2', '3', '4', '5', '6'].includes(key)) {
    event.preventDefault()
    event.stopImmediatePropagation()
    if (event.repeat || !mapInitialized || (windowMode !== 'main' && !windowConnected)) return
    if (key === 'n' && activeAction === null) {
      if (!detachedMap.command({ type: 'draw' })) void beginDrawing()
    }
    if (key === 'e' && activeAction === null && selectedGraphic) void startEditing(selectedGraphic)
    if (key === 'm' && activeAction === null) {
      const button = windowMode === 'main' ? detachButton : windowMode === 'map' ? returnButton : reuniteButton
      if (!button.hidden && !button.disabled) button.click()
    }
    if ((key === 'z' || key === 'r') && activeAction) changeHistory(key === 'z' ? 'undo' : 'redo')
    if (/^[1-6]$/.test(key) && activeAction) chooseColor(polygonPalette[Number(key) - 1][1])
    if (key === '+' || key === '=') { if (!zoomInButton.disabled) void navigateMap('zoom-in') }
    if (key === '-') { if (!zoomOutButton.disabled) void navigateMap('zoom-out') }
    if (key === '0' && !northUpButton.disabled) void navigateMap('north-up')
    return
  }
  const checkbox = target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')
  if (event.key === 'Enter' && (!control || target === nameInput || checkbox) && (activeAction !== null || (selectedGraphic && !target?.closest('.polygon-label')))) {
    event.preventDefault()
    event.stopPropagation()
    if (event.repeat) return
    if (activeAction === null && selectedGraphic) {
      void startEditing(selectedGraphic)
      return
    }
    if (detachedMap.command({ type: 'finish' })) return
    finishActiveAction()
  }
  if (event.key === 'Escape') {
    if (activeAction !== null) {
      event.preventDefault()
      event.stopPropagation()
      cancelButton.click()
    } else clearSelection()
  }
}, { capture: true })
renderIcons()
view.when(async () => {
  view.ui.remove('zoom')
  graphicsLayerView = await view.whenLayerView(layer) as GraphicsLayerView
  const stored = await loadPersistedPolygons()
  committedPolygons = stored.filter((polygon) => {
    try { return isValidPolygon(Graphic.fromJSON(polygon).geometry) } catch { return false }
  })
  if (committedPolygons.length !== stored.length) pendingPersistence = persistPolygons(committedPolygons)
  committedPolygons.forEach((polygon) => layer.add(Graphic.fromJSON(polygon)))
  ensureGraphicIds()
  syncCommittedPolygons()
  mapInitialized = true
  ready.hidden = false
  render()
  detachedMap.start()
})
watch(() => view.stationary, (stationary) => {
  if (stationary && !applyingWindowState) detachedMap.publish()
})
watch(() => [view.canZoomIn, view.canZoomOut, view.rotation], updateNavigationControls)
watch(() => [view.extent, view.rotation, view.width, view.height], scheduleMapLabels)

// Disponível somente no servidor de desenvolvimento ou na build temporária de E2E.
// A API apenas consulta estado e coordenadas; os testes continuam usando gestos reais.
if (import.meta.env.DEV || import.meta.env.VITE_E2E === 'true') {
  const testWindow = window as typeof window & {
    polygonTestApi?: {
      getSelectedScreenPoints: (id?: string) => {
        center: { x: number; y: number }
        vertices: Array<{ x: number; y: number }>
        edgeMidpoint: { x: number; y: number }
      }
      getMapState: () => { stationary: boolean; selectedId: string | null; editingReady: boolean }
      waitForPersistence: () => Promise<void>
      getDrawingState: () => { ready: boolean; vertices: number }
    }
  }
  testWindow.polygonTestApi = {
    getMapState: () => ({
      stationary: view.stationary && !view.animation,
      selectedId: graphicId(selectedGraphic),
      editingReady: activeAction !== 'update' || Boolean(activeGraphic && sketch.state === 'active' && sketch.updateGraphics.includes(activeGraphic) && !sketch.toolTransitionInProgress)
    }),
    getDrawingState: () => ({
      ready: activeAction === 'create' && sketch.state === 'active' && sketch.activeTool === 'polygon' && !sketch.toolTransitionInProgress,
      vertices: draftVertices.length
    }),
    getSelectedScreenPoints: (id?: string) => {
      const graphic = id ? layer.graphics.find(candidate => graphicId(candidate) === id) : activeGraphic ?? selectedGraphic
      if (!graphic) throw new Error('Nenhum polígono selecionado para teste.')
      const polygon = graphic.geometry as Polygon
      const points = polygon.rings[0]
        .slice(0, -1)
        .map((_, index) => polygon.getPoint(0, index))
        .filter((point): point is NonNullable<typeof point> => point != null)
      const vertices = points.map((point) => {
        const screenPoint = view.toScreen(point)!
        return { x: screenPoint.x, y: screenPoint.y }
      })
      const center = view.toScreen(polygon.extent!.center)!
      return {
        center: { x: center.x, y: center.y },
        vertices,
        edgeMidpoint: {
          x: (vertices[0].x + vertices[1].x) / 2,
          y: (vertices[0].y + vertices[1].y) / 2
        }
      }
    },
      waitForPersistence: () => pendingPersistence
  }
}
