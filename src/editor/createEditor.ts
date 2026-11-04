import type { PlaceResult } from '../place-search'
import { createPlaceFocus } from './place-focus'
import { hasSelectedVertices, selectedVertexCount, removeSelectedVertices } from '../sketch-handles'
import Graphic from '@arcgis/core/Graphic.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import Point from '@arcgis/core/geometry/Point.js'
import { createSpatialValidator } from '../spatial-validation'
import Viewpoint from '@arcgis/core/Viewpoint.js'
import type GraphicsLayerView from '@arcgis/core/views/layers/GraphicsLayerView.js'
import { watch } from '@arcgis/core/core/reactiveUtils.js'
import { createId, DetachedMap } from '../detached-map'
import { attachCompass } from '../compass'
import { cloneGeometryBeside, defaultPolygonColor, fillPolygonHoles, fixedPolygonColor, groupOverlappingPolygons, isPolygonColor } from '../polygon-rules'
import { isValidPolygonName, nextCloneName, normalizePolygonName } from '../polygon-names.ts'
import { validatePolygonDocument } from '../polygon-document'

import type { EditorSnapshot } from './types'
import { initialEditorSnapshot } from './types'
import type { SaveStatus } from './storage'
import { createProjectStore } from './projects'
import { createMapView } from './map-view'
import { attachPrecision } from './precision'
import { createFeatureItems } from './feature-items'
import { attachEditorKeyboard } from './keyboard'
import { createFileController } from './files'
import { createMapPresentation } from './map-presentation'
import type { DeletionScope, MapCommand, MapState } from './window-protocol'
import { sameFeatureGeometry, graphicId, isLocked, polygonColor, polygonSymbol, pointSymbol, featureSymbol, isValidVertices, isValidPolygon, isValidFeature } from './features'

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
  let saveStatus: SaveStatus = 'idle'
  let saveMessage = ''
  let saveSequence = 0
  let storageLoaded = false
  let projectsBusy = false
  let projectsError = ''
  let projectsDialogOpen = false
  let viewSaveTimer: ReturnType<typeof setTimeout> | null = null
  const projects = createProjectStore(notify)
  let focusedValidationId: string | null = null
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
  window.addEventListener('beforeunload', event => {
    if (storageLoaded && (saveStatus === 'saving' || saveStatus === 'error')) { event.preventDefault(); event.returnValue = '' }
  }, { signal: lifetime.signal })

  const { layer, view, sketch } = createMapView(container)

  let searchDialogOpen = false
  const placeFocus = createPlaceFocus(view)
  const disposePrecision = attachPrecision(view, layer, sketch)
  const spatialValidator = createSpatialValidator()
  const featureItems = createFeatureItems()

  const defaultColor = defaultPolygonColor
  let draftColor: string = defaultColor
  let colorChangeId: string | null = null
  let pendingColorChangeId: string | null = null
  let draftLocked = false
  let switchTargetId: string | null = null
  let switchAfterCommitId: string | null = null
  let switchingEdit = false
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
  let validationWarning = false
  let draftVertices: number[][] = []
  let draftHistory: number[][][] = [[]]
  let draftHistoryIndex = 0

  const files = createFileController({
    getState: () => ({ action: activeAction, ready: mapInitialized, mode: windowMode,
      connected: windowConnected, committed: committedPolygons }),
    feedback: fileFeedback, clearFeedback: () => { feedback = '' }, changed: notify,
    importPolygons: addImportedPolygons, sendImport: command => detachedMap.command(command)
  })
  const { polygonFileOperation, dismissFileDialog, confirmImport, exportPolygons } = files

  const presentation = createMapPresentation(view, {
    getState: () => ({ ready: mapInitialized, mode: windowMode, action: activeAction,
      selected: selectedGraphic, active: activeGraphic, emphasized: focusedValidationGraphics(), draftName }),
    getGraphics: orderedGraphics, getLayerView: () => graphicsLayerView,
    name: polygonName, changed: notify
  })
  const scheduleMapLabels = presentation.scheduleLabels

  const detachedMap = new DetachedMap<MapState, MapCommand>({
    getState: () => ({
      searchLocation: placeFocus.current,
      saveStatus, saveMessage, focusedValidationId,
      activeProjectId: projects.activeId, projects: projects.summaries, projectsBusy, projectsError,
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
      if (command.type === 'locate-search') void locateSearch(command.result)
      if (command.type === 'clear-search') clearSearch()
      if (command.type === 'open-project') void openProject(command.id)
      if (command.type === 'create-project') void createProject(command.name)
      if (command.type === 'rename-project') void renameProject(command.id, command.name)
      if (command.type === 'focus-validation') void focusValidation(command.id)
      if (command.type === 'retry-save') retrySave()
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
      void saveCommitted()
      instructions = 'Mapa reunido à aplicação.'
      notify()
    },
    onError: (text) => {
      feedback = text
      notify()
    }
  })

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

  function updateWindowControls() { notify() }

  function setWarning(warning: boolean) { validationWarning = warning; notify() }

  function showDrawingWarning() {
    setWarning(true)
    instructions = 'Desenhe pelo menos 3 pontos diferentes formando uma área antes de concluir.'
    publish()
  }

  function updateSpatialValidation() {
    validationIssues = spatialValidator.validate(orderedGraphics().filter(graphic => isValidFeature(graphic.geometry)),
      activeAction === 'update' ? { id: graphicId(activeGraphic), name: normalizeName(draftName), color: draftColor } : undefined)
  }

  function focusedValidationGraphics() {
    const issue = validationIssues.find(item => item.id === focusedValidationId)
    return issue ? [findGraphic(issue.pointId), findGraphic(issue.areaId)].filter((graphic): graphic is Graphic => graphic !== null) : []
  }
  async function focusValidation(id: string) {
    if (activeAction || detachedMap.command({ type: 'focus-validation', id })) return
    const issue = validationIssues.find(item => item.id === id)
    if (!issue) return
    placeFocus.set(null)
    focusedValidationId = id
    selectedGraphic = null
    setWarning(false)
    instructions = issue.message
    render()
    try { await view.goTo(focusedValidationGraphics(), { duration: 400 }) } catch { /* Um gesto pode interromper o enquadramento. */ }
  }

  function fillDraftHoles(graphic: Graphic | null) {
    if (graphic?.geometry?.type !== 'polygon') return
    try {
      const filled = fillPolygonHoles(graphic.geometry)
      if (JSON.stringify(filled.rings) !== JSON.stringify(graphic.geometry.rings)) {
        graphic.geometry = filled
        presentation.invalidate(graphic)
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
      if (state.activeProjectId) {
        if (projects.activeId !== state.activeProjectId) projectsDialogOpen = false
        projects.adopt(state.activeProjectId, state.projects, state.committed, state.viewpoint)
      }
      placeFocus.set(state.searchLocation)
      projectsBusy = state.projectsBusy
      projectsError = state.projectsError
      committedPolygons = state.committed
      focusedValidationId = state.focusedValidationId
      saveStatus = state.saveStatus
      saveMessage = state.saveMessage
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
    focusedValidationId = null
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
      draftColor !== polygonColor(original) || !sameFeatureGeometry(activeGraphic.geometry, original.geometry)
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
      presentation.invalidate(graphic)
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
    void saveCommitted()
    if (merged) lastEditText = `${merged} área(s) incorporada(s) por fusão de áreas da mesma cor.`
    return merged
  }

  async function saveCommitted() {
    const sequence = ++saveSequence
    saveStatus = 'saving'
    saveMessage = 'Salvando alterações…'
    notify()
    const result = await projects.saveActive(committedPolygons, view.viewpoint?.toJSON() ?? null)
    if (disposed || sequence !== saveSequence) return result
    saveStatus = result.status
    saveMessage = result.message
    publish()
    return result
  }
  function retrySave() {
    if (detachedMap.command({ type: 'retry-save' })) return
    if (!storageLoaded) { location.reload(); return }
    void saveCommitted()
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
    if (projectsBusy) return
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
    placeFocus.set(null); searchDialogOpen = false
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
    focusedValidationId = null
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
    focusedValidationId = null
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
    presentation.updateSelection()
    notify()
    scheduleMapLabels()
    if (!applyingWindowState) publish()
  }

  async function beginDrawing(kind: 'polygon' | 'point' = 'polygon') {
    if (activeAction !== null || projectsBusy) return
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
    placeFocus.set(null); searchDialogOpen = false
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
    if (projectsBusy || activeAction || !mapInitialized || files.busy || files.dialog || pendingDeletion || (windowMode !== 'main' && !windowConnected)) return
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
  track(sketch.on('undo', (event) => {
    event.graphics.forEach(graphic => { spatialValidator.invalidate(graphic); featureItems.invalidate(graphic) })
    if (activeAction === 'update') { render(); return }
    if (activeAction !== 'create') return
    draftHistoryIndex = Math.max(0, draftHistoryIndex - 1)
    draftVertices = draftHistory[draftHistoryIndex].map((point) => point.slice())
  }))
  track(sketch.on('redo', (event) => {
    event.graphics.forEach(graphic => { spatialValidator.invalidate(graphic); featureItems.invalidate(graphic) })
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
    const geometryChanged = ['move', 'move-stop', 'reshape', 'reshape-stop', 'vertex-add', 'vertex-remove'].includes(event.toolEventInfo?.type ?? '')
    event.graphics.forEach(graphic => {
      presentation.invalidate(graphic)
      if (geometryChanged) { spatialValidator.invalidate(graphic); featureItems.invalidate(graphic) }
    })
    scheduleMapLabels()
    if (event.state === 'start') {
      activeGraphic = event.graphics[0] ?? null
      selectedGraphic = activeGraphic
      placeFocus.set(null); searchDialogOpen = false
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

  attachEditorKeyboard({
    getState: () => ({ activeAction, activeGraphic, selectedGraphic, windowMode, windowConnected,
      mapInitialized, canZoomIn: view.canZoomIn, canZoomOut: view.canZoomOut }),
    findGraphic, orderedGraphics, focusPolygonList, requestDeletion, changeHistory,
    requestFocusLists: () => requestFocus('lists'), chooseColor, requestCreationMenu, drawPoint,
    startEditing, clonePolygon, toggleCurrentLock, openMapWindow, navigateMap, requestExit, finish,
    hasSelectedVertices: () => hasSelectedVertices(sketch),
    focusMenu: () => detachedMap.focusMenu(), reunite: () => detachedMap.reunite()
  }, lifetime.signal)
  view.when(async () => {
    if (disposed) return
    view.ui.remove('zoom')
    graphicsLayerView = await view.whenLayerView(layer) as GraphicsLayerView
    if (disposed) return
    const project = await projects.initialize()
    const stored = project.polygons
    if (project.viewpoint) view.viewpoint = Viewpoint.fromJSON(project.viewpoint)
    storageLoaded = true
    if (disposed) return
    committedPolygons = stored.filter((polygon) => {
      try { return isValidFeature(Graphic.fromJSON(polygon).geometry) } catch { return false }
    })
    if (committedPolygons.length !== stored.length) void saveCommitted()
    committedPolygons.forEach((polygon) => layer.add(Graphic.fromJSON(polygon)))
    ensureGraphicIds()
    syncCommittedPolygons()
    mapInitialized = true
    notify()
    render()
    detachedMap.start()
  }).catch(() => {
    if (!disposed) {
      saveStatus = 'error'
      saveMessage = storageLoaded ? 'Não foi possível iniciar o mapa. Recarregue a aplicação.' : 'Não foi possível recuperar seus dados. Tente novamente antes de editar.'
      notify()
    }
  })
  track(watch(() => view.stationary, (stationary) => {
    if (stationary && !applyingWindowState) {
      publish()
      if (viewSaveTimer !== null) clearTimeout(viewSaveTimer)
      if (mapInitialized && storageLoaded && windowMode !== 'detached' && !activeAction && !projectsBusy) {
        viewSaveTimer = setTimeout(() => { viewSaveTimer = null; if (!disposed && !activeAction && !projectsBusy) void saveCommitted() }, 600)
      }
    }
  }))
  track(watch(() => [view.canZoomIn, view.canZoomOut, view.rotation], updateNavigationControls))
  track(watch(() => [view.extent, view.rotation, view.width, view.height], scheduleMapLabels))
  track(watch(() => selectedVertexCount(sketch), () => { if (!applyingWindowState) publish() }))

  async function projectOperation(operation: () => Promise<unknown>) {
    if (projectsBusy || activeAction || files.busy || !mapInitialized) return
    if (viewSaveTimer !== null) { clearTimeout(viewSaveTimer); viewSaveTimer = null }
    projectsBusy = true; projectsError = ''; publish()
    try {
      const saved = await saveCommitted()
      if (!saved || saved.status === 'error') throw new Error(saveMessage)
      await operation()
    } catch (error) {
      projectsError = error instanceof Error ? error.message : 'Não foi possível abrir o projeto.'
      feedback = projectsError
    } finally { projectsBusy = false; render(); publish() }
  }
  function activateProject(record: Awaited<ReturnType<typeof projects.open>>) {
    layer.removeAll()
    record.polygons.forEach(polygon => {
      try { const graphic = Graphic.fromJSON(polygon); if (isValidFeature(graphic.geometry)) layer.add(graphic) } catch { /* Preserva no arquivo; ignora geometria inválida na visualização. */ }
    })
    committedPolygons = layer.graphics.map(graphic => graphic.toJSON()).toArray()
    selectedGraphic = null; expandedGraphic = null; focusedValidationId = null
    forgetActiveEdit()
    ensureGraphicIds()
    projectsDialogOpen = false
    placeFocus.set(null); searchDialogOpen = false
    if (record.viewpoint) view.viewpoint = Viewpoint.fromJSON(record.viewpoint)
    else if (layer.graphics.length) void view.goTo(layer.graphics.toArray()).catch(() => undefined)
    else void view.goTo({ center: [-46.6333, -23.5505], zoom: 11, rotation: 0 }).catch(() => undefined)
    instructions = `Projeto “${record.name}” aberto.`
    syncCommittedPolygons()
  }
  function openProject(id: string) {
    if (detachedMap.command({ type: 'open-project', id })) return Promise.resolve()
    return projectOperation(async () => { activateProject(await projects.open(id)) })
  }
  function createProject(name: string) {
    if (detachedMap.command({ type: 'create-project', name })) return Promise.resolve()
    return projectOperation(async () => { activateProject(await projects.create(name)) })
  }
  function renameProject(id: string, name: string) {
    if (detachedMap.command({ type: 'rename-project', id, name })) return Promise.resolve()
    return projectOperation(async () => { await projects.rename(id, name) })
  }

  async function locateSearch(result: PlaceResult) {
    if (activeAction || projectsBusy || !mapInitialized || !Number.isFinite(result.latitude) || !Number.isFinite(result.longitude) || Math.abs(result.latitude) > 90 || Math.abs(result.longitude) > 180) return
    searchDialogOpen = false
    if (detachedMap.command({ type: 'locate-search', result })) { notify(); return }
    focusedValidationId = null
    selectedGraphic = null; expandedGraphic = null
    feedback = ''; setWarning(false)
    instructions = `Localizado: ${result.label}`
    const navigation = placeFocus.locate(result)
    render(); publish()
    try { await navigation }
    catch (error) { if (!(error instanceof Error) || error.name !== 'AbortError') feedback = 'Não foi possível centralizar o local. Tente novamente.' }
    publish()
  }
  function clearSearch() {
    if (detachedMap.command({ type: 'clear-search' })) return
    placeFocus.set(null); instructions = 'Marcador da busca removido.'; publish()
  }
  function buildSnapshot(): EditorSnapshot {
    const nameError = validateName(draftName)
    const length = [...draftName.normalize('NFC')].length
    return {
      searchLocation: placeFocus.current,
      saveStatus, saveMessage, focusedValidationId,
      activeProjectId: projects.activeId, projects: projects.summaries, projectsBusy, projectsError,
      projectsDialogOpen, searchDialogOpen: searchDialogOpen && !activeAction,
      items: featureItems.build(orderedGraphics(), polygonName),
      draftKind, validationIssues, pendingDeletionKind: pendingDeletion === 'all' || !pendingDeletion ? 'all' : pendingDeletion.geometry?.type === 'point' ? 'point' : 'polygon',
      action: activeAction, creationMenuOpen, selectedId: graphicId(selectedGraphic), expandedId: graphicId(expandedGraphic), activeId: graphicId(activeGraphic),
      selectedVertexCount: activeAction === 'update' && draftKind === 'polygon' ? selectedVertexCount(sketch) : 0,
      draftName, draftColor, draftLocked, nameError,
      nameHint: activeAction ? nameError || (length >= 24 ? `${length}/30 caracteres. ${length >= 30 ? 'Limite atingido.' : `${30 - length} restantes.`}` : '') : '',
      mode: windowMode, connected: windowConnected, ready: mapInitialized, fileBusy: files.busy,
      fileDialog: files.dialog, pendingImport: files.pendingImportSummary,
      instructions, lastEdit: lastEditText, warning: validationWarning, feedback, labels: presentation.getLabels(),
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
    requestSearch: () => { if (!activeAction && !projectsBusy) { searchDialogOpen = true; notify() } },
    dismissSearch: () => { searchDialogOpen = false; notify() },
    locateSearch, clearSearch,
    openProject, createProject, renameProject,
    requestProjects: () => { if (!activeAction) { projectsDialogOpen = true; projectsError = ''; notify() } },
    dismissProjects: () => { if (!projectsBusy) { projectsDialogOpen = false; notify() } },
    focusValidation, retrySave, draw, drawPoint, requestCreationMenu, dismissCreationMenu, chooseCreationType, finish, cancel, rename, lockDraft, chooseColor, requestExit, resolveSwitch, deleteSelectedVertices,
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
      presentation.destroy()
      detachedMap.destroy()
      if (viewSaveTimer !== null) clearTimeout(viewSaveTimer)
      placeFocus.destroy()
      disposePrecision()
      sketch.destroy()
      view.destroy()
    }
  }
}
export type EditorController = ReturnType<typeof createEditor>
