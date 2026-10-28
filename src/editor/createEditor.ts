import { hasSelectedVertices } from '../sketch-handles'
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
import { createId, DetachedMap } from '../detached-map'
import { attachCompass } from '../compass'
import { cloneGeometryBeside, defaultPolygonColor, fixedPolygonColor, groupOverlappingPolygons, isPolygonColor, polygonPalette } from '../polygon-rules'
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
  let focusRequest: EditorSnapshot['focusRequest'] = null
  let focusSequence = 0
  function track(handle: { remove(): void }) { subscriptions.push(handle) }
  function requestFocus(kind: 'polygon' | 'name', id: string | null = null) {
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
  const view = new MapView({ container, map, center: [-46.6333, -23.5505], zoom: 11, constraints: { snapToZoom: false } })
  view.highlights.push(new HighlightOptions({ name: 'polygon-selection', color: '#ffffff', haloColor: '#ffffff', haloOpacity: 1, fillOpacity: 0 }))
  const sketch = new SketchViewModel({
    view,
    layer,
    updateOnGraphicClick: false,
    polygonSymbol: polygonSymbol(defaultPolygonColor),
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
  let confirmingExit = false
  let exitAfterCommit = false
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
    | { type: 'clone'; id: string }
    | { type: 'delete'; id: string | 'all' }
    | { type: 'request-deletion'; id: string | 'all' }
    | { type: 'dismiss-deletion' | 'confirm-deletion' }
    | { type: 'request-exit' }
    | { type: 'resolve-exit'; choice: 'save' | 'discard' | 'stay' }
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
    confirmingExit: boolean
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
      instructions: instructions ?? '',
      lastEdit: lastEditText ?? '',
      warning: validationWarning,
      deletedEditId,
      confirmingDeletedEdit,
      pendingDeletionId: pendingDeletion === 'all' ? 'all' : graphicId(pendingDeletion),
      confirmingExit,
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
        notify()
        publish()
      }
      if (command.type === 'import') addImportedPolygons(command.polygons, command.fileName)
      if (command.type === 'draw') void beginDrawing()
      if (command.type === 'finish') void finishActiveAction()
      if (command.type === 'cancel') void cancel()
      if (command.type === 'confirm-edit-deletion') confirmDeletedEdit()
      if (command.type === 'dismiss-deletion') dismissDeletion()
      if (command.type === 'confirm-deletion') confirmDeletion()
      if (command.type === 'request-exit') void requestExit()
      if (command.type === 'resolve-exit') void resolveExit(command.choice)
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
        if (target) deletePolygons(target)
      }
    },
    onModeChange: (mode, connected) => {
      windowMode = mode
      windowConnected = connected
      updateWindowControls()
      scheduleMapLabels()
    },
    onReturn: () => {
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

  function updateColorControls() { notify() }

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
    instructions = isLocked(graphic)
      ? 'Polígono travado. Para editar, destrave pelo cadeado na lista.'
      : 'Polígono destravado. Toque nele no mapa para editar.'
    void syncCommittedPolygons()
    render()
  }

  function clonePolygon(source: Graphic) {
    if (activeAction || !mapInitialized) return
    if (detachedMap.command({ type: 'clone', id: graphicId(source)! })) return
    const geometry = cloneGeometryBeside(source, layer.graphics.toArray())
    if (!geometry) {
      setWarning(true)
      instructions = 'Não foi possível encontrar espaço para a cópia sem sobrepor outra área.'
      publish()
      return
    }
    let number = 1
    let name: string
    do {
      const suffix = number === 1 ? ' Cópia' : ` Cópia ${number}`
      name = [...polygonName(source)].slice(0, 30 - [...suffix].length).join('').trimEnd() + suffix
      number++
    } while (layer.graphics.some(graphic => polygonName(graphic) === name))
    const copy = new Graphic({ geometry, attributes: { ...source.attributes, polygonId: createId(), name }, symbol: polygonSymbol(polygonColor(source)) })
    layer.add(copy)
    selectedGraphic = copy
    syncCommittedPolygons(copy)
    instructions = 'Polígono clonado ao lado do original.'
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
    if (exitAfterCommit) {
      exitAfterCommit = false
      clearSelection()
    }
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
    const error = validateName(draftName)
    if (activeAction === 'update' && !error && shownNameError && validationWarning && instructions === shownNameError) {
      setWarning(false)
      instructions = 'Modo de edição ativo: altere o nome, a cor ou o desenho e conclua para salvar.'
    }
    shownNameError = error
    notify()
  }



  function updateDraftName(value: string, changeId: string) {
    if (activeAction !== 'update' || deletedEditId) return
    draftName = value
    nameChangeId = changeId
    updateNameField()
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
          if (!id || !isValidPolygon(geometry)) continue
          let anchor = labelAnchors.get(graphic)
          if (!anchor || anchor.geometry !== geometry) {
            anchor = { geometry, point: labelPointOperator.execute(geometry as Polygon) }
            labelAnchors.set(graphic, anchor)
          }
          const point = view.toScreen(anchor.point)
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
          labels.push({ id, name: activeAction === 'update' && graphic === activeGraphic
            ? normalizeName(draftName) || polygonName(graphic) : polygonName(graphic),
            x: point.x, y: point.y, selected: graphic === selectedGraphic,
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
    if (activeAction === 'update') {
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
      instructions = state.instructions
      setWarning(state.warning)
      lastEditText = state.lastEdit
      render()
      setDeletedEditConfirmation(state.confirmingDeletedEdit)
      updateDeletionDialog()
      setExitConfirmation(state.confirmingExit)
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
    activeGraphic = null
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
    setExitConfirmation(false)
  }

  function setExitConfirmation(open: boolean) { confirmingExit = open; notify() }

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
    if (activeAction && hasUnsavedChanges()) {
      setExitConfirmation(true)
      publish()
      return
    }
    if (activeAction) await cancelActiveAction()
    clearSelection()
  }

  async function resolveExit(choice: 'save' | 'discard' | 'stay') {
    if (detachedMap.command({ type: 'resolve-exit', choice }) || !confirmingExit) return
    setExitConfirmation(false)
    if (choice === 'save') {
      exitAfterCommit = true
      if (!await finishActiveAction()) exitAfterCommit = false
    } else if (choice === 'discard') {
      await cancelActiveAction()
      clearSelection()
    }
    publish()
  }

  function setDeletedEditConfirmation(open: boolean) { confirmingDeletedEdit = open; notify() }

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
      instructions = 'Não foi possível fundir os polígonos. As alterações não foram salvas; tente ajustar o desenho.'
      render()
      publish()
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
    void persistPolygons(committedPolygons)
    if (merged) lastEditText = `${merged} área(s) incorporada(s) por fusão de polígonos da mesma cor.`
    return merged
  }

  function fileFeedback(text: string) { feedback = text; notify() }

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
    setWarning(false)
    instructions = `${imported.length} polígono(s) importado(s) de ${fileName}.`
    if (syncCommittedPolygons() === null) return
    render()
    void view.goTo(layer.graphics.toArray()).catch(() => { /* O usuário pode interromper o enquadramento. */ })
  }

  async function polygonFileOperation(action: 'import' | 'export') {
    if (!window.polygonFiles || fileOperationPending || activeAction) return
    fileOperationPending = true
    feedback = ''
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
    exitAfterCommit = false
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
      publish()
      return
    }
    selectedGraphic = graphic
    if (isLocked(graphic)) {
      instructions = 'Polígono travado. Destrave pelo cadeado na lista para editar.'
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
    instructions = 'Modo de edição ativo: altere o nome ou arraste vértices e arestas. Use “Confirmar” para salvar.'
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
      instructions = 'Não foi possível enquadrar o polígono. Tente selecionar o card novamente.'
      publish()
    }
  }

  function selectPolygon(graphic: Graphic) {
    selectedGraphic = graphic
    if (detachedMap.command({ type: 'select', id: graphicId(graphic)! })) { notify(); return }
    if (activeAction === null) {
      setWarning(false)
      instructions = isLocked(graphic)
        ? 'Polígono travado. Destrave pelo cadeado na lista para editar.'
        : 'Polígono selecionado. Toque nele no mapa, use Enter ou o botão Editar.'
    }
    render()
    if (activeAction === null) void framePolygon(graphic)
  }

  function clearSelection() {
    if (activeAction !== null || detachedMap.command({ type: 'deselect' })) return
    selectedGraphic = null
    setWarning(false)
    instructions = 'Seleção limpa. Pronto para desenhar um novo polígono.'
    render()
  }

  function focusPolygonLabel(id: string | null) { requestFocus('polygon', id) }

  function focusPolygonList(graphic = selectedGraphic ?? orderedGraphics()[0]) {
    if (activeAction !== null || windowMode === 'map' || (windowMode === 'detached' && !windowConnected) || !graphic) return
    selectPolygon(graphic)
    focusPolygonLabel(graphicId(graphic))
  }

  function toggleVertices(graphic: Graphic) {
    if (detachedMap.command({ type: 'expand', id: graphicId(graphic)! })) return
    const closing = expandedGraphic === graphic
    expandedGraphic = closing ? null : graphic
    if (activeAction === null) {
      setWarning(false)
      instructions = closing ? 'Detalhes recolhidos.' : 'Detalhes do polígono abertos.'
    }
    render()
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
      instructions = 'Polígonos removidos.'
    } else {
      const graphic = findGraphic(targetId)
      if (graphic) layer.remove(graphic)
      if (graphicId(selectedGraphic) === targetId) selectedGraphic = null
      if (graphicId(expandedGraphic) === targetId) expandedGraphic = null
      instructions = `Polígono ${polygonNumber} removido.`
    }
    applyingWindowState = false
    syncCommittedPolygons()
    render()
  }

  function render() {
    updateSelectionHighlight()
    notify()
    scheduleMapLabels()
    if (!applyingWindowState) publish()
  }

  async function beginDrawing() {
    if (activeAction !== null) return
    selectedGraphic = null
    draftVertices = []
    draftHistory = [[]]
    draftHistoryIndex = 0
    forgetActiveEdit()
    sketch.polygonSymbol = polygonSymbol(defaultColor)
    sketch.activeFillSymbol = polygonSymbol(defaultColor)
    setActiveAction('create')
    instructions = 'Clique para criar vértices; dê dois cliques ou use “Confirmar” para finalizar.'
    render()
    await sketch.create('polygon', { mode: 'click' })
  }
  function draw() {
    if (selectedGraphic) { void startEditing(selectedGraphic); return }
    if (!detachedMap.command({ type: 'draw' })) void beginDrawing()
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
  async function cancel() {
    if (detachedMap.command({ type: 'cancel' })) return
    confirmingUpdate = false
    await cancelActiveAction()
    instructions = 'Desenho ou edição cancelado.'
    notify()
  }
  function confirmDeletion() {
    if (detachedMap.command({ type: 'confirm-deletion' })) return
    const target = pendingDeletion
    if (!target) return
    pendingDeletion = null
    deletePolygons(target)
    publish()
  }
  function confirmDeletedEdit() {
    if (detachedMap.command({ type: 'confirm-edit-deletion' })) return
    if (activeAction !== 'update' || !deletedEditId) return
    const polygon = committedPolygons.find(item => item.attributes?.polygonId === deletedEditId)
    if (polygon) deletePolygons(Graphic.fromJSON(polygon))
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
      if (merged) selectedGraphic = event.graphic ?? null
      instructions = merged
        ? 'Polígonos da mesma cor fundidos. O nome do desenho salvo foi mantido.'
        : 'Polígono criado. Toque nele no mapa para editar; se estiver travado, destrave pela lista.'
      render()
      continueAfterCommit()
    }
    if (event.state === 'cancel') setActiveAction(null)
    publish()
  }))
  track(sketch.on('undo', () => {
    if (activeAction !== 'create') return
    draftHistoryIndex = Math.max(0, draftHistoryIndex - 1)
    draftVertices = draftHistory[draftHistoryIndex].map((point) => point.slice())
  }))
  track(sketch.on('redo', () => {
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
    instructions = 'Polígono apagado nesta edição. Use “Confirmar” para confirmar a exclusão ou Cancelar para restaurá-lo.'
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
    if (type === 'move-stop') lastEditText = 'Polígono movido.'
    if (type === 'reshape-stop') lastEditText = 'Vértice ou aresta arrastada.'
    if (type === 'vertex-add') lastEditText = 'Novo vértice adicionado.'
    if (type === 'vertex-remove') lastEditText = 'Vértice removido.'
    if (type === 'move-stop' || type === 'reshape-stop' || type === 'vertex-add' || type === 'vertex-remove') render()
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
      const merged = commitActiveEdit()
      if (merged === null) return
      setActiveAction(null)
      instructions = merged ? 'Polígonos da mesma cor fundidos. O nome do polígono editado foi mantido.' : 'Polígono editado.'
      render()
      continueAfterCommit()
    }
  }))
  function isDrawing() { return activeAction === 'create' }
  track(view.on('immediate-click', async (event) => {
    if (isDrawing() || switchingEdit || switchTargetId) return
    const result = await view.hitTest(event, { include: [layer] })
    if (isDrawing() || switchingEdit || switchTargetId) return
    const hit = result.results.find((item) => item.type === 'graphic' && item.graphic.layer === layer)
    if (hit?.type === 'graphic') {
      if (isLocked(hit.graphic)) return
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

  window.addEventListener('keydown', (event) => {
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('dialog') || event.isComposing) return
    const control = target?.closest('button, a, summary, input, textarea, select, [contenteditable]:not([contenteditable="false"])')
    const textControl = target?.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable]:not([contenteditable="false"])')
    const key = event.key.toLowerCase()
    const modified = event.ctrlKey || event.metaKey || event.altKey
    const listItem = target?.closest<HTMLElement>('#polygon-list > .pin')
    const listGraphic = findGraphic(listItem?.dataset.polygonId ?? null)
    if (!modified && !textControl && activeAction === null && listGraphic && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const graphics = orderedGraphics()
      const direction = event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1
      focusPolygonList(graphics[(graphics.indexOf(listGraphic) + direction + graphics.length) % graphics.length])
      return
    }
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
    if (key === 'd' && !textControl && activeAction === null && listGraphic) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) requestDeletion(listGraphic)
      return
    }
    if (!textControl && ['a', 'n', 'e', 'c', 'l', 'm', 'z', 'r', '+', '=', '-', '0', '1', '2', '3', '4', '5', '6'].includes(key)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || !mapInitialized || (windowMode !== 'main' && !windowConnected)) return
      if (key === 'n' && activeAction === null) {
        if (!detachedMap.command({ type: 'draw' })) void beginDrawing()
      }
      if (key === 'a') focusPolygonList()
      if (key === 'e' && activeAction === null && (listGraphic ?? selectedGraphic)) void startEditing((listGraphic ?? selectedGraphic)!)
      if (key === 'c' && activeAction === null && selectedGraphic) clonePolygon(selectedGraphic)
      if (key === 'l') toggleCurrentLock()
      if (key === 'm' && activeAction === null) {
        if (windowMode === 'main') openMapWindow()
        else detachedMap.reunite()
      }
      if ((key === 'z' || key === 'r') && activeAction) changeHistory(key === 'z' ? 'undo' : 'redo')
      if (/^[1-6]$/.test(key) && activeAction) chooseColor(polygonPalette[Number(key) - 1][1])
      if (key === '+' || key === '=') { if (mapInitialized && view.canZoomIn) void navigateMap('zoom-in') }
      if (key === '-') { if (mapInitialized && view.canZoomOut) void navigateMap('zoom-out') }
      if (key === '0' && mapInitialized) void navigateMap('north-up')
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
      try { return isValidPolygon(Graphic.fromJSON(polygon).geometry) } catch { return false }
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

  function buildSnapshot(): EditorSnapshot {
    const nameError = validateName(draftName)
    const length = [...draftName.normalize('NFC')].length
    return {
      items: orderedGraphics().map(graphic => ({ id: graphicId(graphic)!, name: polygonName(graphic),
        locked: isLocked(graphic), color: polygonColor(graphic),
        vertices: (graphic.geometry as Polygon).rings[0]?.slice(0, -1).map(point => [...point]) ?? [],
        vertexCount: (graphic.geometry as Polygon).rings.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0) })),
      action: activeAction, selectedId: graphicId(selectedGraphic), expandedId: graphicId(expandedGraphic), activeId: graphicId(activeGraphic),
      draftName, draftColor, draftLocked, nameError,
      nameHint: activeAction === 'update' ? nameError || (length >= 24 ? `${length}/30 caracteres. ${length >= 30 ? 'Limite atingido.' : `${30 - length} restantes.`}` : '') : '',
      mode: windowMode, connected: windowConnected, ready: mapInitialized, fileBusy: fileOperationPending,
      instructions, lastEdit: lastEditText, warning: validationWarning, feedback, labels,
      pendingDeletionId: pendingDeletion === 'all' ? 'all' : graphicId(pendingDeletion),
      pendingDeletionName: pendingDeletion && pendingDeletion !== 'all' ? polygonName(pendingDeletion) : '',
      confirmingDeletedEdit, confirmingExit, deletedEditId,
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
    draw, finish, cancel, rename, lockDraft, chooseColor, requestExit, resolveExit, resolveSwitch,
    select: (id: string) => withGraphic(id, selectPolygon),
    edit: (id: string) => withGraphic(id, graphic => void startEditing(graphic)),
    expand: (id: string) => withGraphic(id, toggleVertices),
    clone: (id: string) => withGraphic(id, clonePolygon),
    toggleLock: (id: string) => withGraphic(id, graphic => toggleLock(graphic, true)),
    requestDeletion: (id: string | 'all') => id === 'all' ? requestDeletion('all') : withGraphic(id, requestDeletion),
    dismissDeletion, confirmDeletion, confirmDeletedEdit, polygonFileOperation,
    navigate: navigateMap, detach: openMapWindow,
    reunite: () => detachedMap.reunite(), focusMap: () => detachedMap.focus()
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
