import { hasSelectedVertices, selectedVertexCount, removeSelectedVertices } from '../sketch-handles'
import Map from '@arcgis/core/Map.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import TileLayer from '@arcgis/core/layers/TileLayer.js'
import MapView from '@arcgis/core/views/MapView.js'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js'
import Graphic from '@arcgis/core/Graphic.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js'
import Point from '@arcgis/core/geometry/Point.js'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'
import { validatePointsInAreas } from '../spatial-validation'
import * as labelPointOperator from '@arcgis/core/geometry/operators/labelPointOperator.js'
import Viewpoint from '@arcgis/core/Viewpoint.js'
import HighlightOptions from '@arcgis/core/views/support/HighlightOptions.js'
import type GraphicsLayerView from '@arcgis/core/views/layers/GraphicsLayerView.js'
import { watch } from '@arcgis/core/core/reactiveUtils.js'
import { createId, DetachedMap } from '../detached-map'
import { attachCompass } from '../compass'
import { cloneGeometryBeside, defaultPolygonColor, fillPolygonHoles, fixedPolygonColor, groupOverlappingPolygons, isPolygonColor, polygonPalette } from '../polygon-rules'
import { isValidPolygonName, nextCloneName, normalizePolygonName } from '../polygon-names.ts'
import { validatePolygonDocument } from '../polygon-document'
import { shortcutsEnabled } from '../keyboard-settings'

import type { EditorSnapshot, MapLabel } from './types'
import { initialEditorSnapshot } from './types'
import { loadPersistedPolygons, persistPolygons } from './storage'

export function createEditor(container: HTMLDivElement) {
  let disposed = false
  const lifetime = new AbortController()
  const subscriptions: { remove(): void }[] = []
  const listeners = new Set<() => void>()
  let snapshot = initialEditorSnapshot
  let scheduled = false
  let instructions = 'Pronto para desenhar.'
  let lastEditText = 'Nenhuma edição executada.'
  let feedback = ''
  let labels: MapLabel[] = []
  let validationIssues: EditorSnapshot['validationIssues'] = []
  let draftKind: 'polygon' | 'point' = 'polygon'
  let focusRequest: EditorSnapshot['focusRequest'] = null
  let focusSequence = 0
  function track(handle: { remove(): void }) { subscriptions.push(handle) }
  function requestFocus(kind: 'polygon' | 'name' | 'lists', id: string | null = null) {
    focusRequest = { kind, id, sequence: ++focusSequence }
    notify()
  }
  function notify() {
    if (disposed || scheduled) return
    scheduled = true
    queueMicrotask(() => {
      scheduled = false
      if (disposed) return
      snapshot = buildSnapshot()
      listeners.forEach(listener => listener())
    })
  }
  function publish() { notify(); detachedMap.publish() }
  function openMapWindow() { feedback = ''; detachedMap.open(); notify() }
  let fileOperationPending = false
  let fileDialog: 'import' | 'export' | null = null
  let pendingImport: { polygons: PolygonFileData[]; fileName: string } | null = null

  const layer = new GraphicsLayer({ title: 'Áreas' })
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
  const view = new MapView({ container, map, center: [-46.6333, -23.5505], zoom: 11, constraints: { snapToZoom: false } })
  view.highlights.push(new HighlightOptions({ name: 'polygon-selection', color: '#ffffff', haloColor: '#ffffff', haloOpacity: 1, fillOpacity: 0 }))
  const sketch = new SketchViewModel({
    view,
    layer,
    updateOnGraphicClick: false,
    polygonSymbol: polygonSymbol(defaultPolygonColor),
    pointSymbol: pointSymbol(defaultPolygonColor),
    defaultUpdateOptions: { tool: 'reshape', toggleToolOnClick: false }
  })

  const defaultColor = defaultPolygonColor
  let draftColor: string = defaultColor
  let colorChangeId: string | null = null
  let pendingColorChangeId: string | null = null
  let draftLocked = false
  let switchTargetId: string | null = null
  let switchAfterCommitId: string | null = null
  let switchingEdit = false
  const labelAnchors = new WeakMap<Graphic, { geometry: Graphic['geometry']; point: Point }>()
  let labelFrame: number | null = null
  let draftName = ''
  let shownNameError = ''
  let nameChangeId: string | null = null
  let pendingNameChangeId: string | null = null
  let activeAction: 'create' | 'update' | null = null
  let creationMenuOpen = false
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
  type DeletionScope = 'polygon' | 'point' | 'all'
  type MapCommand =
    | { type: 'open-create' | 'close-create' }
    | { type: 'create-feature'; kind: 'polygon' | 'point' }
    | { type: 'draw-point' }
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
  interface MapState {
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

  const detachedMap = new DetachedMap<MapState, MapCommand>({
    getState: () => ({
      polygons: orderedGraphics().map((graphic) => graphic.toJSON()),
      committed: committedPolygons,
      selectedId: graphicId(selectedGraphic),
      expandedId: graphicId(expandedGraphic),
      activeId: graphicId(activeGraphic),
      action: activeAction,
      creationMenuOpen,
      draftKind,
      instructions: instructions ?? '',
      lastEdit: lastEditText ?? '',
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
      if (command.type === 'open-create') requestCreationMenu()
      if (command.type === 'close-create') dismissCreationMenu()
      if (command.type === 'create-feature') chooseCreationType(command.kind)
      if (command.type === 'color' && command.id === graphicId(activeGraphic)) updateDraftColor(command.value, command.changeId)
      if (command.type === 'resolve-switch') void resolveSwitch(command.choice)
      if (command.type === 'toggle-lock') {
        const graphic = findGraphic(command.id)
        if (graphic) toggleLock(graphic, true)
      }
      if (command.type === 'draft-lock' && activeAction && command.id === graphicId(activeGraphic)) {
        draftLocked = command.value
        notify()
        publish()
      }
      if (command.type === 'import') addImportedPolygons(command.polygons, command.fileName, command.mode)
      if (command.type === 'draw') void beginDrawing()
      if (command.type === 'draw-point') void beginDrawing('point')
      if (command.type === 'finish') void finishActiveAction()
      if (command.type === 'cancel') void cancel()
      if (command.type === 'confirm-edit-deletion') confirmDeletedEdit()
      if (command.type === 'dismiss-deletion') dismissDeletion()
      if (command.type === 'confirm-deletion') confirmDeletion(command.scope)
      if (command.type === 'request-exit') void requestExit()
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
      if (command.type === 'clone') {
        const graphic = findGraphic(command.id)
        if (graphic) clonePolygon(graphic)
      }
      if (command.type === 'delete') {
        const target = command.id === 'all' ? 'all' : findGraphic(command.id)
        if (target) deletePolygons(target, command.scope)
      }
    },
    onModeChange: (mode, connected) => {
      windowMode = mode
      windowConnected = connected
      updateWindowControls()
      scheduleMapLabels()
    },
    onReturn: () => {
      creationMenuOpen = false
      // Uma edição ainda não confirmada segue a mesma regra do botão Cancelar.
      setActiveAction(null)
      forgetActiveEdit()
      restoreCommittedPolygons()
      void persistPolygons(committedPolygons)
      instructions = 'Mapa reunido à aplicação.'
      notify()
    },
    onError: (text) => {
      feedback = text
      notify()
    }
  })

  function graphicId(graphic: Graphic | null): string | null {
    return graphic?.attributes?.polygonId ?? null
  }

  function ensureGraphicIds() {
    layer.graphics.forEach((graphic) => {
      if (!graphicId(graphic)) graphic.attributes = { ...graphic.attributes, polygonId: createId() }
      if (typeof graphic.attributes?.name !== 'string' || validateName(graphic.attributes.name)) {
        graphic.attributes = { ...graphic.attributes, name: nextFeatureName(graphic.geometry?.type === 'point' ? 'point' : 'polygon') }
      }
    })
  }

  function nextFeatureName(kind: 'polygon' | 'point') {
    const prefix = kind === 'point' ? 'Ponto' : 'Área'
    let number = 1
    while (layer.graphics.some(item => item.attributes?.name === `${prefix} ${number}`)) number++
    return `${prefix} ${number}`
  }

  function featureLabel(graphic: Graphic | null = activeGraphic) { return graphic?.geometry?.type === 'point' ? 'Ponto' : 'Área' }

  function polygonName(graphic: Graphic) {
    return graphic.attributes?.name ?? `Área ${layer.graphics.toArray().indexOf(graphic) + 1}`
  }

  function isLocked(graphic: Graphic | null) {
    return graphic?.attributes?.locked === true
  }

  function lockedMessage(graphic: Graphic) {
    return graphic.geometry?.type === 'point'
      ? `O ponto “${polygonName(graphic)}” está travado. Destrave pelo cadeado da lista para editar.`
      : `A área “${polygonName(graphic)}” está travada. Destrave pelo cadeado da lista para editar.`
  }

  function warnLocked(graphic: Graphic) {
    if (!activeAction) selectedGraphic = graphic
    setWarning(true)
    instructions = lockedMessage(graphic)
    render()
  }

  function polygonColor(graphic: Graphic) {
    const stored = graphic.attributes?.color
    return fixedPolygonColor(stored ?? (graphic.symbol?.type === 'simple-fill' ? graphic.symbol.outline?.color?.toHex() : undefined))
  }

  function polygonSymbol(color: string) {
    return new SimpleFillSymbol({ color: `${color}80`, outline: { color, width: 2 } })
  }

  function pointSymbol(color: string, editing = false) {
    return new SimpleMarkerSymbol({ style: 'circle', size: 13, color, outline: editing ? { color: '#ffffff', width: 3 } : { style: 'none' } })
  }

  function featureSymbol(graphic: Graphic, color: string, editing = false) {
    return graphic.geometry?.type === 'point' ? pointSymbol(color, editing) : editing ? editingSymbol(color) : polygonSymbol(color)
  }

  function editingSymbol(color: string) {
    return new SimpleFillSymbol({ color: `${color}80`, outline: { color: '#ffffff', width: 3 } })
  }

  function updateColorControls() { notify() }

  function updateDraftColor(value: string, changeId: string) {
    if (!activeAction || deletedEditId || !isPolygonColor(value)) return
    draftColor = value.toLowerCase()
    colorChangeId = changeId
    const symbol = polygonSymbol(draftColor)
    sketch.polygonSymbol = symbol
    sketch.pointSymbol = pointSymbol(draftColor)
    // A ferramenta retém esta instância e a reaplica no primeiro vértice.
    // Atualizar suas propriedades mantém a cor escolhida antes de desenhar.
    const activeFill = sketch.activeFillSymbol
    if (activeFill?.type === 'simple-fill') {
      activeFill.color = symbol.color.clone()
      activeFill.outline = symbol.outline?.clone() ?? null
    } else {
      sketch.activeFillSymbol = symbol.clone()
    }
    if (activeAction === 'update' && activeGraphic) {
      activeGraphic.symbol = featureSymbol(activeGraphic, draftColor, true)
      activeGraphic.attributes = { ...activeGraphic.attributes, color: draftColor }
    }
    updateColorControls()
    updateSpatialValidation()
    publish()
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

  function toggleLock(graphic: Graphic, fromSidebar = false) {
    if (activeAction || (windowMode === 'map' && !fromSidebar)) return
    if (detachedMap.command({ type: 'toggle-lock', id: graphicId(graphic)! })) return
    graphic.attributes = { ...graphic.attributes, locked: !isLocked(graphic) }
    setWarning(false)
    instructions = isLocked(graphic)
      ? 'Elemento travado. Para editar, destrave pelo cadeado na lista.'
      : 'Elemento destravado. Toque nele no mapa para editar.'
    void syncCommittedPolygons()
    render()
  }

  function clonePolygon(source: Graphic) {
    if (activeAction || !mapInitialized) return
    if (detachedMap.command({ type: 'clone', id: graphicId(source)! })) return
    const geometry = source.geometry?.type === 'point'
      ? new Point({ x: source.geometry.x + Math.max(view.resolution * 24, 1), y: source.geometry.y, spatialReference: source.geometry.spatialReference })
      : cloneGeometryBeside(source, layer.graphics.toArray().filter(graphic => graphic.geometry?.type === 'polygon'))
    if (!geometry) {
      setWarning(true)
      instructions = 'Não foi possível encontrar espaço para a cópia sem sobrepor outra área.'
      publish()
      return
    }
    const name = nextCloneName(polygonName(source), orderedGraphics().map(polygonName))
    const copy = new Graphic({ geometry, attributes: { ...source.attributes, polygonId: createId(), name }, symbol: featureSymbol(source, polygonColor(source)) })
    layer.add(copy)
    selectedGraphic = copy
    syncCommittedPolygons(copy)
    instructions = source.geometry?.type === 'point' ? 'Ponto clonado ao lado do original.' : 'Área clonada ao lado da original.'
    render()
    void framePolygon(copy)
  }

  function toggleCurrentLock() {
    if (activeAction) {
      draftLocked = !draftLocked
      notify()
      if (!detachedMap.command({ type: 'draft-lock', id: graphicId(activeGraphic), value: draftLocked })) publish()
    } else if (selectedGraphic) toggleLock(selectedGraphic, true)
  }

  function setSwitchTarget(id: string | null) { switchTargetId = id; notify() }

  async function resolveSwitch(choice: 'save' | 'discard' | 'stay') {
    if (detachedMap.command({ type: 'resolve-switch', choice })) return
    if (!switchTargetId || switchingEdit) return
    const targetId = switchTargetId
    setSwitchTarget(null)
    if (choice === 'stay') { publish(); return }
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
    publish()
  }

  function continueAfterCommit() {
    const id = switchAfterCommitId
    switchAfterCommitId = null
    const target = findGraphic(id)
    if (target) void startEditing(target)
  }

  function normalizeName(value: string) {
    return normalizePolygonName(value)
  }

  function validateName(value: string) {
    const normalized = normalizeName(value)
    if (!normalized) return 'Informe um nome.'
    if ([...normalized].length > 30) return 'O nome deve ter no máximo 30 caracteres.'
    if (!isValidPolygonName(normalized)) return 'Use letras, números e espaços; cópias podem terminar com (1), (2), etc.'
    return ''
  }

  function updateNameField() {
    const error = validateName(draftName)
    if (activeAction === 'update' && !error && shownNameError && validationWarning && instructions === shownNameError) {
      setWarning(false)
      instructions = 'Modo de edição ativo: altere o nome, a cor ou o desenho e conclua para salvar.'
    }
    shownNameError = error
    notify()
  }



  function updateDraftName(value: string, changeId: string) {
    if (!activeAction || deletedEditId) return
    draftName = value
    nameChangeId = changeId
    updateNameField()
    updateSpatialValidation()
    scheduleMapLabels()
    publish()
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
    if (labelFrame !== null || disposed) return
    labelFrame = requestAnimationFrame(() => {
      labelFrame = null
      labels = []
      if (mapInitialized && view.ready && windowMode !== 'detached') {
        for (const graphic of orderedGraphics()) {
          const id = graphicId(graphic), geometry = graphic.geometry
          if (!id || !isValidFeature(geometry)) continue
          let anchor = labelAnchors.get(graphic)
          if (!anchor || anchor.geometry !== geometry) {
            anchor = { geometry, point: geometry?.type === 'point' ? geometry : labelPointOperator.execute(geometry as Polygon) }
            labelAnchors.set(graphic, anchor)
          }
          const point = view.toScreen(anchor.point)
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
          labels.push({ id, name: activeAction === 'update' && graphic === activeGraphic
            ? normalizeName(draftName) || polygonName(graphic) : polygonName(graphic),
            x: point.x, y: point.y - (geometry?.type === 'point' ? 19 : 0), selected: graphic === selectedGraphic,
            hidden: point.x < 0 || point.y < 0 || point.x > view.width || point.y > view.height })
        }
      }
      notify()
    })
  }

  function updateWindowControls() { notify() }



  function setWarning(warning: boolean) { validationWarning = warning; notify() }

  function showDrawingWarning() {
    setWarning(true)
    instructions = 'Desenhe pelo menos 3 pontos diferentes formando uma área antes de concluir.'
    publish()
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

  function isValidFeature(geometry: Graphic['geometry']) {
    return geometry?.type === 'point'
      ? Number.isFinite(geometry.x) && Number.isFinite(geometry.y)
      : isValidPolygon(geometry)
  }

  function updateSpatialValidation() {
    validationIssues = validatePointsInAreas(orderedGraphics().filter(graphic => isValidFeature(graphic.geometry)),
      activeAction === 'update' ? { id: graphicId(activeGraphic), name: normalizeName(draftName), color: draftColor } : undefined)
  }

  function fillDraftHoles(graphic: Graphic | null) {
    if (graphic?.geometry?.type !== 'polygon') return
    try {
      const filled = fillPolygonHoles(graphic.geometry)
      if (JSON.stringify(filled.rings) !== JSON.stringify(graphic.geometry.rings)) {
        graphic.geometry = filled
        labelAnchors.delete(graphic)
      }
    } catch { /* Um contorno incompleto será validado ao concluir a edição. */ }
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
      publish()
      return true
    }
    if (activeAction) {
      const error = validateName(draftName)
      if (error) {
        setWarning(true)
        instructions = error
        updateNameField()
        requestFocus('name')
        publish()
        return false
      }
    }
    if (activeAction === 'create' && draftKind === 'point') {
      setWarning(true)
      instructions = 'Clique no mapa para posicionar o ponto antes de confirmar.'
      publish()
      return false
    }
    if (activeAction === 'create' && !isValidVertices(draftVertices)) {
      showDrawingWarning()
      return false
    }
    if (activeAction === 'update' && !isValidFeature(activeGraphic?.geometry ?? null)) {
      showDrawingWarning()
      return false
    }
    if (activeAction === 'update' && activeGraphic) {
      activeGraphic.attributes = { ...activeGraphic.attributes, name: normalizeName(draftName), locked: draftLocked, color: draftColor }
      activeGraphic.symbol = featureSymbol(activeGraphic, draftColor)
      confirmingUpdate = true
    }
    sketch.complete()
    return true
  }

  function updateNavigationControls() { notify() }

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
      instructions = 'Não foi possível ajustar o mapa. Tente novamente.'
      publish()
    }
  }

  async function applyWindowState(state: MapState) {
    applyingWindowState = true
    try {
      // Uma resposta anterior do mapa não pode apagar letras digitadas mais recentemente.
      const keepLocalName = pendingNameChangeId && state.action === activeAction &&
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
      creationMenuOpen = state.creationMenuOpen ?? false
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
      draftKind = state.draftKind ?? 'polygon'
      setActiveAction(state.action)
      instructions = state.instructions
      setWarning(state.warning)
      lastEditText = state.lastEdit
      render()
      setDeletedEditConfirmation(state.confirmingDeletedEdit)
      updateDeletionDialog()
      if (detachedMap.isMapWindow && state.action === 'update' && activeGraphic) {
        await activateSketchUpdate(activeGraphic)
      } else if (detachedMap.isMapWindow && state.action === 'create') {
        // O rascunho incompleto não sobrevive ao recarregamento da janela.
        setActiveAction(null)
        instructions = 'Rascunho cancelado após recarregar. Pronto para desenhar.'
      }
    } finally {
      applyingWindowState = false
    }
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

  function setActiveAction(action: 'create' | 'update' | null) { setWarning(false); activeAction = action; notify() }

  function requestDeletion(target: Graphic | 'all') {
    const id = target === 'all' ? 'all' : graphicId(target)!
    if (detachedMap.command({ type: 'request-deletion', id })) return
    pendingDeletion = target
    updateDeletionDialog()
    publish()
  }

  function updateDeletionDialog() { notify() }

  function dismissDeletion() {
    if (detachedMap.command({ type: 'dismiss-deletion' })) return
    pendingDeletion = null
    updateDeletionDialog()
    publish()
  }

  function forgetActiveEdit() {
    selectedGraphic = null
    activeGraphic = null
    draftKind = 'polygon'
    pendingSketchUpdate = null
    draftName = ''
    draftLocked = false
    draftColor = defaultColor
    colorChangeId = null
    pendingColorChangeId = null
    shownNameError = ''
    setSwitchTarget(null)
    nameChangeId = null
    pendingNameChangeId = null
    deletedEditId = null
    setDeletedEditConfirmation(false)
  }

  function hasUnsavedChanges() {
    if (activeAction === 'create') return draftVertices.length > 0
    if (activeAction !== 'update' || !activeGraphic) return false
    const saved = committedPolygons.find(polygon => polygon.attributes?.polygonId === graphicId(activeGraphic))
    if (!saved || deletedEditId) return true
    const original = Graphic.fromJSON(saved)
    return normalizeName(draftName) !== polygonName(original) || draftLocked !== isLocked(original) ||
      draftColor !== polygonColor(original) || JSON.stringify(activeGraphic.geometry?.toJSON()) !== JSON.stringify(original.geometry?.toJSON())
  }

  async function requestExit() {
    if (detachedMap.command({ type: 'request-exit' })) return
    // Cancelar é uma ação explícita; só a troca de elemento pede confirmação.
    if (activeAction) await cancelActiveAction()
    clearSelection()
  }

  function setDeletedEditConfirmation(open: boolean) { confirmingDeletedEdit = open; notify() }

  function syncCommittedPolygons(preferred?: Graphic | null) {
    ensureGraphicIds()
    let groups: ReturnType<typeof groupOverlappingPolygons>
    try {
      groups = groupOverlappingPolygons(orderedGraphics().filter(graphic => graphic.geometry?.type === 'polygon'), preferred)
    } catch {
      // A geometria só é aplicada após preparar todas as uniões com sucesso.
      switchAfterCommitId = null
      setActiveAction(null)
      forgetActiveEdit()
      restoreCommittedPolygons()
      setWarning(true)
      instructions = 'Não foi possível fundir as áreas. As alterações não foram salvas; tente ajustar o desenho.'
      render()
      publish()
      return null
    }
    return applyPolygonGroups(groups)
  }

  function applyPolygonGroups(groups: ReturnType<typeof groupOverlappingPolygons>) {
    let merged = 0
    for (const group of groups) {
      const graphic = group.survivor
      graphic.attributes = { ...graphic.attributes, color: group.color, locked: group.locked }
      graphic.symbol = polygonSymbol(group.color)
      graphic.geometry = group.geometry
      labelAnchors.delete(graphic)
      if (group.members.length > 1) {
        for (const member of group.members) {
          if (selectedGraphic === member) selectedGraphic = graphic
          if (expandedGraphic === member) expandedGraphic = graphic
          if (switchAfterCommitId === graphicId(member)) switchAfterCommitId = graphicId(graphic)
          if (member !== graphic) { layer.remove(member); merged++ }
        }
      }
    }
    for (const graphic of layer.graphics) {
      if (graphic.geometry?.type !== 'point') continue
      graphic.attributes = { ...graphic.attributes, color: polygonColor(graphic) }
      graphic.symbol = pointSymbol(polygonColor(graphic))
    }
    committedPolygons = orderedGraphics().map((graphic) => graphic.toJSON())
    void persistPolygons(committedPolygons)
    if (merged) lastEditText = `${merged} área(s) incorporada(s) por fusão de áreas da mesma cor.`
    return merged
  }

  function fileFeedback(text: string) { feedback = text; notify() }

  function addImportedPolygons(polygons: PolygonFileData[], fileName: string, mode: 'add' | 'replace') {
    if (activeAction) {
      instructions = 'Conclua ou cancele a edição antes de importar. Nenhuma área ou ponto foi alterado.'
      publish()
      return false
    }
    try {
      const validated = validatePolygonDocument({ format: 'poligonos', version: 2, polygons })
      const imported = validated.map((polygon) => new Graphic({
        geometry: polygon.geometry.rings ? fillPolygonHoles(new Polygon(polygon.geometry)) : new Point(polygon.geometry),
        attributes: { polygonId: createId(), name: polygon.name, locked: polygon.locked === true, color: fixedPolygonColor(polygon.color) },
        symbol: polygon.geometry.rings ? polygonSymbol(fixedPolygonColor(polygon.color)) : pointSymbol(fixedPolygonColor(polygon.color))
      }))
      const importedKinds = new Set(imported.map(graphic => graphic.geometry?.type))
      const retained = orderedGraphics().filter(graphic => mode !== 'replace' || !importedKinds.has(graphic.geometry?.type))
      const candidates = [...retained, ...imported]
      // Validar a geometria e preparar todas as fusões antes de remover qualquer área.
      const groups = groupOverlappingPolygons(candidates.filter(graphic => graphic.geometry?.type === 'polygon'))
      layer.removeAll()
      layer.addMany(candidates)
      selectedGraphic = imported[0] ?? null
      expandedGraphic = null
      applyPolygonGroups(groups)
      setWarning(false)
      instructions = `${imported.length} área(s) ou ponto(s) importado(s) de ${fileName}. ${mode === 'replace' ? 'Os tipos presentes no arquivo substituíram os atuais.' : 'Itens acrescentados à coleção.'}`
      render()
      publish()
      void view.goTo(layer.graphics.toArray()).catch(() => { /* O usuário pode interromper o enquadramento. */ })
      return true
    } catch (error) {
      setWarning(true)
      instructions = error instanceof Error ? error.message : 'Não foi possível importar as áreas e pontos.'
      fileFeedback(instructions)
      publish()
      return false
    }
  }

  async function polygonFileOperation(action: 'import' | 'export') {
    if (!window.polygonFiles || fileOperationPending || fileDialog || activeAction || !mapInitialized || (windowMode !== 'main' && !windowConnected)) return
    feedback = ''
    if (action === 'export') {
      if (committedPolygons.length) fileDialog = 'export'
      notify()
      return
    }
    fileOperationPending = true
    updateWindowControls()
    try {
      const result = await window.polygonFiles.importPolygons()
      if (result.status === 'cancelled') {
        fileFeedback('Importação cancelada.')
      } else if (result.status === 'error') {
        fileFeedback(result.message)
      } else if (result.polygons) {
        pendingImport = { polygons: validatePolygonDocument({ format: 'poligonos', version: 2, polygons: result.polygons }), fileName: result.fileName }
        fileDialog = 'import'
      }
    } catch (error) {
      fileFeedback(error instanceof Error ? error.message : 'Não foi possível concluir a operação de arquivo. Tente novamente.')
    } finally {
      fileOperationPending = false
      updateWindowControls()
    }
  }

  function dismissFileDialog() {
    if (fileOperationPending) return
    fileDialog = null
    pendingImport = null
    notify()
  }

  function confirmImport(mode: 'add' | 'replace') {
    if (fileDialog !== 'import' || !pendingImport || activeAction || fileOperationPending || (windowMode !== 'main' && !windowConnected)) return
    const command = { type: 'import' as const, ...pendingImport, mode }
    if (detachedMap.command(command) || addImportedPolygons(command.polygons, command.fileName, mode)) dismissFileDialog()
  }

  async function exportPolygons(ids: string[]) {
    if (!window.polygonFiles || fileDialog !== 'export' || fileOperationPending || activeAction || (windowMode !== 'main' && !windowConnected)) return
    const selected = new Set(ids)
    const polygons = committedPolygons.filter(polygon => selected.has(polygon.attributes.polygonId))
    if (!polygons.length || polygons.length !== selected.size) { fileFeedback('Selecione as áreas ou pontos que deseja exportar.'); return }
    fileOperationPending = true
    feedback = ''
    notify()
    try {
      const result = await window.polygonFiles.exportPolygons(polygons.map(polygon => ({
        name: polygon.attributes.name, geometry: polygon.geometry?.rings ? fillPolygonHoles(new Polygon(polygon.geometry)).toJSON() : new Point(polygon.geometry).toJSON(),
        ...(polygon.attributes.locked === true ? { locked: true } : {}),
        ...(polygon.attributes.color ? { color: polygon.attributes.color } : {})
      })))
      if (result.status === 'success') {
        fileDialog = null
        fileFeedback(`${result.count} área(s) ou ponto(s) exportado(s) para ${result.fileName}.`)
      } else fileFeedback(result.status === 'cancelled' ? 'Exportação cancelada.' : result.message)
    } catch (error) { fileFeedback(error instanceof Error ? error.message : 'Não foi possível exportar as áreas e pontos.') }
    finally { fileOperationPending = false; notify() }
  }

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
    graphic.symbol = featureSymbol(graphic, draftColor, true)
    // Áreas e pontos em edição usam contorno branco de 3 pontos, sem halo adicional.
    const update = sketch.update(graphic, { tool: graphic.geometry?.type === 'point' ? 'move' : 'reshape', toggleToolOnClick: false, highlightOptions: { enabled: false } })
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
    if (isLocked(graphic)) { warnLocked(graphic); return }
    if (activeAction === 'update' && graphicId(activeGraphic) === graphicId(graphic)) return
    if (activeAction === 'update' && graphicId(activeGraphic) !== graphicId(graphic)) {
      if (hasUnsavedChanges()) {
        setSwitchTarget(graphicId(graphic))
        publish()
        return
      }
      const targetId = graphicId(graphic)
      switchingEdit = true
      try {
        await cancelActiveAction()
      } finally {
        switchingEdit = false
      }
      const target = findGraphic(targetId)
      if (target) await startEditing(target)
      return
    }
    selectedGraphic = graphic
    confirmingUpdate = false
    activeGraphic = graphic
    draftKind = graphic.geometry?.type === 'point' ? 'point' : 'polygon'
    draftName = polygonName(graphic)
    draftColor = polygonColor(graphic)
    colorChangeId = null
    pendingColorChangeId = null
    sketch.activeFillSymbol = polygonSymbol(draftColor)
    draftLocked = isLocked(graphic)
    nameChangeId = null
    pendingNameChangeId = null
    setActiveAction('update')
    instructions = draftKind === 'point'
      ? 'Edite o nome, a cor ou arraste o ponto. Use “Confirmar” para salvar.'
      : 'Modo de edição ativo: altere o nome ou arraste vértices e arestas. Use “Confirmar” para salvar.'
    render()
    try {
      await activateSketchUpdate(graphic)
    } catch {
      if (disposed || activeAction !== 'update' || activeGraphic !== graphic) return
      // Falha no carregamento do SDK não pode deixar a interface presa em
      // edição sem alças, nem modificar as áreas já salvos.
      await cancelActiveAction()
      setWarning(true)
      instructions = 'Não foi possível iniciar a edição. Atualize a página e tente novamente.'
      render()
    }
  }

  async function framePolygon(graphic: Graphic) {
    if (graphic.geometry?.type === 'point' && view.ready) {
      try { await view.goTo({ target: graphic.geometry, scale: Math.min(view.scale, 15000), rotation: view.rotation }, { duration: 400 }) } catch { /* Um gesto pode interromper o enquadramento. */ }
      return
    }
    const extent = graphic.geometry?.extent
    if (!extent || !view.ready) return
    try {
      await view.goTo({ target: extent.clone().expand(1.7), rotation: view.rotation }, { duration: 400 })
    } catch (error) {
      // Um novo card ou gesto pode interromper o enquadramento anterior.
      if (error instanceof Error && error.name === 'AbortError') return
      instructions = 'Não foi possível enquadrar o área. Tente selecionar o card novamente.'
      publish()
    }
  }

  function selectPolygon(graphic: Graphic) {
    selectedGraphic = graphic
    if (detachedMap.command({ type: 'select', id: graphicId(graphic)! })) { notify(); return }
    if (activeAction === null) {
      setWarning(isLocked(graphic))
      instructions = isLocked(graphic)
        ? lockedMessage(graphic)
        : 'Elemento selecionado. Toque nele no mapa, use Enter ou o botão Editar.'
    }
    render()
    if (activeAction === null) void framePolygon(graphic)
  }

  function clearSelection() {
    if (activeAction !== null || detachedMap.command({ type: 'deselect' })) return
    selectedGraphic = null
    setWarning(false)
    instructions = 'Seleção limpa. Pronto para desenhar uma nova área.'
    render()
  }

  function focusPolygonCard(id: string | null) { requestFocus('polygon', id) }

  function focusPolygonList(graphic?: Graphic) {
    const kind = document.querySelector<HTMLElement>('.sidebar-panel[data-feature-kind]')?.dataset.featureKind
      ?? selectedGraphic?.geometry?.type ?? 'polygon'
    graphic ??= selectedGraphic?.geometry?.type === kind ? selectedGraphic : orderedGraphics().find(item => item.geometry?.type === kind)
    if (activeAction !== null || windowMode === 'map' || (windowMode === 'detached' && !windowConnected) || !graphic) return
    selectPolygon(graphic)
    focusPolygonCard(graphicId(graphic))
  }

  function toggleVertices(graphic: Graphic) {
    if (detachedMap.command({ type: 'expand', id: graphicId(graphic)! })) return
    const closing = expandedGraphic === graphic
    expandedGraphic = closing ? null : graphic
    if (activeAction === null) {
      setWarning(false)
      instructions = closing ? 'Detalhes recolhidos.' : 'Detalhes da área abertos.'
    }
    render()
  }

  function deletePolygons(target: Graphic | 'all', scope: DeletionScope = 'all') {
    const targetId = target === 'all' ? 'all' : graphicId(target)!
    if (detachedMap.command({ type: 'delete', id: targetId, scope })) return
    // Descartar outras alterações ainda não confirmadas antes de excluir.
    applyingWindowState = true
    sketch.cancel()
    setActiveAction(null)
    forgetActiveEdit()
    const removedLabel = target === 'all' ? '' : featureLabel(target)
    const polygonNumber = target === 'all' ? 0 : committedPolygons.findIndex((polygon) => polygon.attributes?.polygonId === targetId) + 1
    restoreCommittedPolygons()
    if (target === 'all') {
      const removed = layer.graphics.toArray().filter(graphic => scope === 'all' || graphic.geometry?.type === scope)
      layer.removeMany(removed)
      if (selectedGraphic && removed.includes(selectedGraphic)) selectedGraphic = null
      if (expandedGraphic && removed.includes(expandedGraphic)) expandedGraphic = null
      instructions = scope === 'polygon' ? 'Áreas removidas.' : scope === 'point' ? 'Pontos removidos.' : 'Áreas e pontos removidos.'
    } else {
      const graphic = findGraphic(targetId)
      if (graphic) layer.remove(graphic)
      if (graphicId(selectedGraphic) === targetId) selectedGraphic = null
      if (graphicId(expandedGraphic) === targetId) expandedGraphic = null
      instructions = `${removedLabel} ${polygonNumber} ${removedLabel === 'Área' ? 'removida' : 'removido'}.`
    }
    applyingWindowState = false
    syncCommittedPolygons()
    render()
  }

  function render() {
    updateSpatialValidation()
    updateSelectionHighlight()
    notify()
    scheduleMapLabels()
    if (!applyingWindowState) publish()
  }

  async function beginDrawing(kind: 'polygon' | 'point' = 'polygon') {
    if (activeAction !== null) return
    selectedGraphic = null
    draftVertices = []
    draftHistory = [[]]
    draftHistoryIndex = 0
    forgetActiveEdit()
    draftKind = kind
    draftName = nextFeatureName(kind)
    sketch.pointSymbol = pointSymbol(defaultColor)
    sketch.polygonSymbol = polygonSymbol(defaultColor)
    sketch.activeFillSymbol = polygonSymbol(defaultColor)
    setActiveAction('create')
    instructions = kind === 'point'
      ? 'Escolha o nome e a cor, depois clique no mapa para posicionar o ponto.'
      : 'Clique para criar vértices; dê dois cliques ou use “Confirmar” para finalizar.'
    render()
    try { await sketch.create(kind, { mode: 'click' }) } catch {
      if (disposed) return
      await cancelActiveAction()
      setWarning(true)
      instructions = 'Não foi possível iniciar o desenho. Atualize a página e tente novamente.'
      render()
    }
  }
  function draw() {
    if (selectedGraphic) { void startEditing(selectedGraphic); return }
    if (!detachedMap.command({ type: 'draw' })) void beginDrawing()
  }
  function requestCreationMenu() {
    if (activeAction || !mapInitialized || fileOperationPending || fileDialog || pendingDeletion || (windowMode !== 'main' && !windowConnected)) return
    if (detachedMap.command({ type: 'open-create' })) return
    creationMenuOpen = true
    publish()
  }
  function dismissCreationMenu() {
    if (detachedMap.command({ type: 'close-create' })) return
    creationMenuOpen = false
    publish()
  }
  function chooseCreationType(kind: 'polygon' | 'point') {
    if (!creationMenuOpen || activeAction || !['polygon', 'point'].includes(kind)) return
    if (detachedMap.command({ type: 'create-feature', kind })) return
    creationMenuOpen = false
    void beginDrawing(kind)
  }
  function drawPoint() {
    if (activeAction || creationMenuOpen || !mapInitialized || (windowMode !== 'main' && !windowConnected)) return
    if (!detachedMap.command({ type: 'draw-point' })) void beginDrawing('point')
  }
  function rename(value: string) {
    draftName = value
    nameChangeId = createId()
    pendingNameChangeId = nameChangeId
    updateNameField()
    scheduleMapLabels()
    if (detachedMap.command({ type: 'rename', id: graphicId(activeGraphic)!, value: draftName, changeId: nameChangeId })) return
    pendingNameChangeId = null
    updateDraftName(draftName, nameChangeId)
  }
  function lockDraft(value: boolean) {
    if (!activeAction) return
    draftLocked = value
    if (!detachedMap.command({ type: 'draft-lock', id: graphicId(activeGraphic), value })) publish()
    notify()
  }
  function finish() { if (!detachedMap.command({ type: 'finish' })) void finishActiveAction() }
  function deleteSelectedVertices() {
    if (activeAction !== 'update' || activeGraphic?.geometry?.type !== 'polygon' || !hasSelectedVertices(sketch)) return
    if (!removeSelectedVertices(sketch)) {
      setWarning(true)
      instructions = 'A área precisa manter pelo menos três vértices em cada contorno.'
    } else {
      setWarning(false)
      instructions = 'Vértice removido. Confirme para salvar ou cancele para restaurar.'
    }
    render()
  }
  async function cancel() {
    if (detachedMap.command({ type: 'cancel' })) return
    confirmingUpdate = false
    await cancelActiveAction()
    instructions = 'Desenho ou edição cancelado.'
    notify()
  }
  function confirmDeletion(scope: DeletionScope = 'all') {
    if (!['polygon', 'point', 'all'].includes(scope)) return
    if (detachedMap.command({ type: 'confirm-deletion', scope })) return
    const target = pendingDeletion
    if (!target) return
    pendingDeletion = null
    deletePolygons(target, scope)
    publish()
  }
  function confirmDeletedEdit() {
    if (detachedMap.command({ type: 'confirm-edit-deletion' })) return
    if (activeAction !== 'update' || !deletedEditId) return
    const polygon = committedPolygons.find(item => item.attributes?.polygonId === deletedEditId)
    if (polygon) deletePolygons(Graphic.fromJSON(polygon))
    else {
      void cancelActiveAction().then(() => {
        instructions = 'Ponto não salvo removido.'
        render()
      })
    }
    continueAfterCommit()
  }
  track(sketch.on('create', (event) => {
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
        instructions = 'Continue adicionando pontos e use “Confirmar” para salvar.'
      }
    }
    if (event.state === 'complete') {
      const createdKind = draftKind
      if (event.graphic) {
        event.graphic.attributes = { ...event.graphic.attributes, polygonId: createId(), name: normalizeName(draftName) || nextFeatureName(createdKind), locked: draftLocked, color: draftColor }
        event.graphic.symbol = featureSymbol(event.graphic, draftColor)
      }
      if (createdKind === 'point' && event.graphic && isValidFeature(event.graphic.geometry)) {
        setActiveAction(null)
        // O clique posiciona o ponto; a confirmação salva e Cancelar o descarta.
        const locked = draftLocked
        event.graphic.attributes.locked = false
        void startEditing(event.graphic)
        draftLocked = locked
        return
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
      instructions = merged
        ? 'Áreas da mesma cor fundidas. O nome do desenho salvo foi mantido.'
        : 'Área criada. Toque nele no mapa para editar; se estiver travado, destrave pela lista.'
      render()
      continueAfterCommit()
    }
    if (event.state === 'cancel') setActiveAction(null)
    publish()
  }))
  track(sketch.on('undo', () => {
    if (activeAction === 'update') { render(); return }
    if (activeAction !== 'create') return
    draftHistoryIndex = Math.max(0, draftHistoryIndex - 1)
    draftVertices = draftHistory[draftHistoryIndex].map((point) => point.slice())
  }))
  track(sketch.on('redo', () => {
    if (activeAction === 'update') { render(); return }
    if (activeAction !== 'create') return
    draftHistoryIndex = Math.min(draftHistory.length - 1, draftHistoryIndex + 1)
    draftVertices = draftHistory[draftHistoryIndex].map((point) => point.slice())
  }))
  track(sketch.on('delete', (event) => {
    if (applyingWindowState || activeAction !== 'update') return
    const deleted = event.graphics.find((graphic) => graphicId(graphic) === graphicId(activeGraphic))
    if (!deleted) return
    deletedEditId = graphicId(deleted)
    if (graphicId(selectedGraphic) === deletedEditId) selectedGraphic = null
    if (graphicId(expandedGraphic) === deletedEditId) expandedGraphic = null
    setWarning(false)
    instructions = 'Elemento apagado nesta edição. Use “Confirmar” para confirmar a exclusão ou Cancelar para restaurá-lo.'
    render()
  }))
  track(sketch.on('update', (event) => {
    if (applyingWindowState) return
    event.graphics.forEach((graphic) => labelAnchors.delete(graphic))
    scheduleMapLabels()
    if (event.state === 'start') {
      activeGraphic = event.graphics[0] ?? null
      selectedGraphic = activeGraphic
      setActiveAction('update')
      render()
    }
    const type = event.toolEventInfo?.type
    if (type === 'move-stop') lastEditText = activeGraphic?.geometry?.type === 'point' ? 'Ponto movido.' : 'Área movida.'
    if (type === 'reshape-stop') lastEditText = 'Vértice ou aresta arrastada.'
    if (type === 'vertex-add') lastEditText = 'Novo vértice adicionado.'
    if (type === 'vertex-remove') lastEditText = 'Vértice removido.'
    if (type === 'move-stop' || type === 'reshape-stop' || type === 'vertex-add' || type === 'vertex-remove') {
      fillDraftHoles(activeGraphic)
      render()
    }
    if (event.state === 'complete') {
      if (cancellingUpdate) return
      // Delete encerra a operação do SDK, mas a exclusão ainda precisa ser confirmada.
      if (activeAction === 'update' && activeGraphic && !layer.graphics.includes(activeGraphic)) return
      if (activeAction === 'update' && !confirmingUpdate && activeGraphic) {
        instructions = 'Edição mantida ativa. Use Enter ou “Confirmar” para confirmar.'
        void activateSketchUpdate(activeGraphic)
        return
      }
      confirmingUpdate = false
      const editedKind = draftKind
      const merged = commitActiveEdit()
      if (merged === null) return
      setActiveAction(null)
      instructions = merged ? 'Áreas da mesma cor fundidas. O nome da área editada foi mantido.' : editedKind === 'point' ? 'Ponto salvo.' : 'Área editada.'
      render()
      continueAfterCommit()
    }
  }))
  function isDrawing() { return activeAction === 'create' }
  track(view.on('immediate-click', async (event) => {
    if (isDrawing() || switchingEdit || switchTargetId) return
    const result = await view.hitTest(event, { include: [layer] })
    if (isDrawing() || switchingEdit || switchTargetId) return
    const hits = result.results.filter(item => item.type === 'graphic' && item.graphic.layer === layer)
    const hit = hits.find(item => item.type === 'graphic' && item.graphic.geometry?.type === 'point') ?? hits[0]
    if (hit?.type === 'graphic') {
      if (isLocked(hit.graphic)) { warnLocked(hit.graphic); return }
      void startEditing(hit.graphic)
    }
    else clearSelection()
  }))
  function changeHistory(action: 'undo' | 'redo') {
    if (!activeAction || detachedMap.command({ type: 'history', action })) return
    if (action === 'undo' && sketch.canUndo()) sketch.undo()
    if (action === 'redo' && sketch.canRedo()) sketch.redo()
    render()
  }

  document.addEventListener('click', event => {
    if (!selectedGraphic || activeAction || event.button !== 0) return
    const target = event.target instanceof Element ? event.target : null
    if (!target || target.closest('.pin, #map, dialog, button, a, input, textarea, select, label, summary, [role="button"], [role="tab"], [role="scrollbar"]')) return
    clearSelection()
  }, { signal: lifetime.signal })

  window.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('dialog') || event.isComposing) return
    const control = target?.closest('button, a, summary, input, textarea, select, [contenteditable]:not([contenteditable="false"])')
    const textControl = target?.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable]:not([contenteditable="false"])')
    const key = event.key.toLowerCase()
    const modified = event.ctrlKey || event.metaKey || event.altKey
    const listItem = target?.closest<HTMLElement>('.polygon-list > .pin')
    const listGraphic = findGraphic(listItem?.dataset.polygonId ?? null)
    if (shortcutsEnabled() && !modified && !textControl && activeAction === null && listGraphic && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const graphics = orderedGraphics().filter(item => item.geometry?.type === listGraphic.geometry?.type)
      const direction = event.key === 'ArrowUp' ? -1 : 1
      focusPolygonList(graphics[(graphics.indexOf(listGraphic) + direction + graphics.length) % graphics.length])
      return
    }
    if (!shortcutsEnabled()) {
      // Desligar também os atalhos do SDK no canvas; Tab e ativação de botões
      // continuam disponíveis como navegação acessível, assim como a edição de texto.
      const nativeControl = target?.closest('button, a, summary, input, textarea, select, [role="button"], [contenteditable]:not([contenteditable="false"])')
      const sdkShortcut = key === 'delete' || key === 'backspace' || (!modified && ['enter', 'escape', 'z', 'r', 'f', '+', '=', '-', '0', 'h'].includes(key))
      const historyShortcut = (event.ctrlKey || event.metaKey) && activeAction && (key === 'z' || key === 'y')
      if (!nativeControl && (sdkShortcut || historyShortcut || (matchMedia('(max-width: 720px)').matches && event.key !== 'Tab'))) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      return
    }
    const deletionTarget = activeGraphic ?? selectedGraphic
    if ((event.key === 'Delete' || event.key === 'Backspace') && !textControl && activeAction !== 'create' && deletionTarget && !hasSelectedVertices(sketch)) {
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
    if (!textControl && key === 'l') {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || windowMode === 'map') return
      const tab = document.querySelector<HTMLButtonElement>('.sidebar-tabs [aria-selected="true"]')
      if (!tab || tab.disabled) return
      tab.focus({ preventScroll: true })
      requestFocus('lists')
      return
    }
    const colorOption = polygonPalette.find(([, , shortcut]) => !event.shiftKey && key === shortcut)
    if (!textControl && colorOption) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (activeAction && !event.repeat && mapInitialized && (windowMode === 'main' || windowConnected)) chooseColor(colorOption[1])
      return
    }
    if (key === 'd' && !textControl && activeAction === null && listGraphic) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) requestDeletion(listGraphic)
      return
    }
    if (!textControl && ['n', 'p', 'e', 'c', 't', 'm', 'z', 'r', '+', '=', '-', 'h'].includes(key)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || !mapInitialized || (windowMode !== 'main' && !windowConnected)) return
      if (key === 'n' && activeAction === null) {
        requestCreationMenu()
      }
      if (key === 'p' && activeAction === null) drawPoint()
      if (key === 'e' && activeAction === null && (listGraphic ?? selectedGraphic)) void startEditing((listGraphic ?? selectedGraphic)!)
      if (key === 'c' && activeAction === null && selectedGraphic) clonePolygon(selectedGraphic)
      if (key === 't') toggleCurrentLock()
      if (key === 'm') {
        if (windowMode === 'map') detachedMap.focusMenu()
        else if (activeAction === null) {
          if (windowMode === 'main') openMapWindow()
          else detachedMap.reunite()
        }
      }
      if ((key === 'z' || key === 'r') && activeAction) changeHistory(key === 'z' ? 'undo' : 'redo')
      if (key === '+' || key === '=') { if (mapInitialized && view.canZoomIn) void navigateMap('zoom-in') }
      if (key === '-') { if (mapInitialized && view.canZoomOut) void navigateMap('zoom-out') }
      if (key === 'h' && mapInitialized) void navigateMap('north-up')
      return
    }
    const checkbox = target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')
    if (event.key === 'Enter' && (!control || target?.id === 'polygon-name' || checkbox) && (activeAction !== null || (selectedGraphic && !target?.closest('.polygon-label')))) {
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
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) void requestExit()
    }
  }, { capture: true, signal: lifetime.signal })
  view.when(async () => {
    if (disposed) return
    view.ui.remove('zoom')
    graphicsLayerView = await view.whenLayerView(layer) as GraphicsLayerView
    if (disposed) return
    const stored = await loadPersistedPolygons()
    if (disposed) return
    committedPolygons = stored.filter((polygon) => {
      try { return isValidFeature(Graphic.fromJSON(polygon).geometry) } catch { return false }
    })
    if (committedPolygons.length !== stored.length) void persistPolygons(committedPolygons)
    committedPolygons.forEach((polygon) => layer.add(Graphic.fromJSON(polygon)))
    ensureGraphicIds()
    syncCommittedPolygons()
    mapInitialized = true
    notify()
    render()
    detachedMap.start()
  }).catch(() => {
    if (!disposed) { feedback = 'Não foi possível iniciar o mapa. Recarregue a aplicação para tentar novamente.'; notify() }
  })
  track(watch(() => view.stationary, (stationary) => {
    if (stationary && !applyingWindowState) publish()
  }))
  track(watch(() => [view.canZoomIn, view.canZoomOut, view.rotation], updateNavigationControls))
  track(watch(() => [view.extent, view.rotation, view.width, view.height], scheduleMapLabels))
  track(watch(() => selectedVertexCount(sketch), () => { if (!applyingWindowState) publish() }))

  function buildSnapshot(): EditorSnapshot {
    const nameError = validateName(draftName)
    const length = [...draftName.normalize('NFC')].length
    return {
      items: orderedGraphics().map(graphic => ({ kind: graphic.geometry?.type === 'point' ? 'point' : 'polygon', id: graphicId(graphic)!, name: polygonName(graphic),
        locked: isLocked(graphic), color: polygonColor(graphic),
        vertices: graphic.geometry?.type === 'point' ? [[graphic.geometry.x, graphic.geometry.y]] : (graphic.geometry as Polygon).rings[0]?.slice(0, -1).map(point => [...point]) ?? [],
        vertexCount: graphic.geometry?.type === 'point' ? 1 : (graphic.geometry as Polygon).rings.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0) })),
      draftKind, validationIssues, pendingDeletionKind: pendingDeletion === 'all' || !pendingDeletion ? 'all' : pendingDeletion.geometry?.type === 'point' ? 'point' : 'polygon',
      action: activeAction, creationMenuOpen, selectedId: graphicId(selectedGraphic), expandedId: graphicId(expandedGraphic), activeId: graphicId(activeGraphic),
      selectedVertexCount: activeAction === 'update' && draftKind === 'polygon' ? selectedVertexCount(sketch) : 0,
      draftName, draftColor, draftLocked, nameError,
      nameHint: activeAction ? nameError || (length >= 24 ? `${length}/30 caracteres. ${length >= 30 ? 'Limite atingido.' : `${30 - length} restantes.`}` : '') : '',
      mode: windowMode, connected: windowConnected, ready: mapInitialized, fileBusy: fileOperationPending,
      fileDialog, pendingImport: pendingImport ? { fileName: pendingImport.fileName, count: pendingImport.polygons.length, areaCount: pendingImport.polygons.filter(item => item.geometry.rings).length, pointCount: pendingImport.polygons.filter(item => !item.geometry.rings).length } : null,
      instructions, lastEdit: lastEditText, warning: validationWarning, feedback, labels,
      pendingDeletionId: pendingDeletion === 'all' ? 'all' : graphicId(pendingDeletion),
      pendingDeletionName: pendingDeletion && pendingDeletion !== 'all' ? polygonName(pendingDeletion) : '',
      confirmingDeletedEdit, deletedEditId,
      switchTargetName: polygonNameOrEmpty(findGraphic(switchTargetId)),
      rotation: view.rotation, canZoomIn: view.canZoomIn, canZoomOut: view.canZoomOut,
      focusRequest
    }
  }
  function polygonNameOrEmpty(graphic: Graphic | null) { return graphic ? polygonName(graphic) : '' }
  const withGraphic = (id: string, action: (graphic: Graphic) => unknown) => {
    const graphic = findGraphic(id)
    if (graphic) action(graphic)
  }
  const actions = {
    draw, drawPoint, requestCreationMenu, dismissCreationMenu, chooseCreationType, finish, cancel, rename, lockDraft, chooseColor, requestExit, resolveSwitch, deleteSelectedVertices,
    focusList: (kind: 'polygon' | 'point') => {
      const graphic = selectedGraphic?.geometry?.type === kind ? selectedGraphic : orderedGraphics().find(item => item.geometry?.type === kind)
      if (graphic) focusPolygonList(graphic)
    },
    select: (id: string) => withGraphic(id, selectPolygon),
    edit: (id: string) => withGraphic(id, graphic => void startEditing(graphic)),
    expand: (id: string) => withGraphic(id, toggleVertices),
    clone: (id: string) => withGraphic(id, clonePolygon),
    toggleLock: (id: string) => withGraphic(id, graphic => toggleLock(graphic, true)),
    requestDeletion: (id: string | 'all') => id === 'all' ? requestDeletion('all') : withGraphic(id, requestDeletion),
    dismissDeletion, confirmDeletion, confirmDeletedEdit, polygonFileOperation, dismissFileDialog, confirmImport, exportPolygons,
    navigate: navigateMap, detach: openMapWindow,
    reunite: () => detachedMap.reunite(), focusMap: () => detachedMap.focus(),
    focusMenu: () => detachedMap.focusMenu()
  }
  notify()
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener) } },
    actions,
    attachCompass: (button: HTMLButtonElement) => attachCompass(button, {
      getRotation: () => view.rotation, setRotation: rotation => { view.rotation = rotation },
      resetNorth: () => void navigateMap('north-up'), stopAnimation: () => view.animation?.stop(), onChange: publish
    }),
    destroy() {
      disposed = true
      lifetime.abort()
      subscriptions.forEach(handle => handle.remove())
      listeners.clear()
      if (labelFrame !== null) cancelAnimationFrame(labelFrame)
      detachedMap.destroy()
      selectionHighlight?.remove()
      sketch.destroy()
      view.destroy()
    }
  }
}
export type EditorController = ReturnType<typeof createEditor>
