import '@arcgis/core/assets/esri/themes/light/main.css'
import Map from '@arcgis/core/Map.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import WebTileLayer from '@arcgis/core/layers/WebTileLayer.js'
import MapView from '@arcgis/core/views/MapView.js'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js'
import Graphic from '@arcgis/core/Graphic.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import { ChevronDown, PanelLeftClose, Plus, Trash2, createIcons } from 'lucide'

const layer = new GraphicsLayer({ title: 'Polígonos' })
const map = new Map({
  basemap: { baseLayers: [new WebTileLayer({ urlTemplate: 'https://tile.openstreetmap.org/{level}/{col}/{row}.png', copyright: '© OpenStreetMap contributors' })] },
  layers: [layer]
})
const view = new MapView({ container: 'map', map, center: [-46.6333, -23.5505], zoom: 11, constraints: { snapToZoom: false } })
const sketch = new SketchViewModel({
  view,
  layer,
  polygonSymbol: { type: 'simple-fill', color: [31, 119, 180, 0.25], outline: { color: '#1261a0', width: 2 } },
  defaultUpdateOptions: { tool: 'reshape', toggleToolOnClick: false }
})

const drawButton = document.querySelector<HTMLButtonElement>('#draw-polygon')!
const finishButton = document.querySelector<HTMLButtonElement>('#finish-drawing')!
const cancelButton = document.querySelector<HTMLButtonElement>('#cancel-editing')!
const clearButton = document.querySelector<HTMLButtonElement>('#clear-polygons')!
const list = document.querySelector<HTMLUListElement>('#polygon-list')!
const empty = document.querySelector<HTMLParagraphElement>('#empty-state')!
const count = document.querySelector<HTMLSpanElement>('#polygon-count')!
const message = document.querySelector<HTMLParagraphElement>('#map-instructions')!
const lastEdit = document.querySelector<HTMLParagraphElement>('#last-edit')!
const ready = document.querySelector<HTMLParagraphElement>('#map-ready')!
const clearDialog = document.querySelector<HTMLDialogElement>('#clear-dialog')!
const clearDialogTitle = document.querySelector<HTMLHeadingElement>('#clear-dialog-title')!
const clearDialogDescription = document.querySelector<HTMLParagraphElement>('#clear-dialog-description')!
const dismissClearButton = document.querySelector<HTMLButtonElement>('#dismiss-clear')!
const confirmClearButton = document.querySelector<HTMLButtonElement>('#confirm-clear')!
const workspace = document.querySelector<HTMLElement>('.workspace')!
const sidebarToggle = document.querySelector<HTMLButtonElement>('#sidebar-toggle')!
const sidebarClose = document.querySelector<HTMLButtonElement>('#sidebar-close')!
let activeAction: 'create' | 'update' | null = null
let activeGraphic: Graphic | null = null
let selectedGraphic: Graphic | null = null
let expandedGraphic: Graphic | null = null
let committedPolygons: ReturnType<Graphic['toJSON']>[] = []
let pendingDeletion: Graphic | 'all' | null = null
let confirmingUpdate = false
let cancellingUpdate = false
let pendingPersistence: Promise<void> = Promise.resolve()
const storageDatabaseName = 'polygon-editor-poc'
const storageStoreName = 'state'
const storageKey = 'polygons'

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
      const request = database.transaction(storageStoreName, 'readwrite').objectStore(storageStoreName).put(polygons, storageKey)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
    database.close()
  } catch {
    localStorageFallbackSave(polygons)
  }
}

function renderIcons() {
  createIcons({ icons: { ChevronDown, PanelLeftClose, Plus, Trash2 } })
}

function setActiveAction(action: 'create' | 'update' | null) {
  activeAction = action
  drawButton.hidden = action !== null
  finishButton.hidden = action === null
  cancelButton.hidden = action === null
  if (action === 'create') finishButton.textContent = 'Concluir desenho'
  if (action === 'update') finishButton.textContent = 'Concluir edição'
}

function setSidebarCollapsed(collapsed: boolean) {
  workspace.classList.toggle('sidebar-collapsed', collapsed)
  sidebarToggle.setAttribute('aria-expanded', String(!collapsed))
  sidebarClose.setAttribute('aria-expanded', String(!collapsed))
  sidebarToggle.setAttribute('aria-label', collapsed ? 'Abrir lista de polígonos' : 'Recolher lista de polígonos')
  sidebarToggle.title = collapsed ? 'Abrir lista de polígonos' : 'Recolher lista de polígonos'
}

function requestDeletion(target: Graphic | 'all') {
  pendingDeletion = target
  const isAll = target === 'all'
  clearDialogTitle.textContent = isAll ? 'Apagar todos os polígonos?' : 'Apagar este polígono?'
  clearDialogDescription.textContent = isAll
    ? 'Essa ação removerá todos os polígonos desenhados no mapa.'
    : 'Essa ação removerá o polígono selecionado do mapa.'
  clearDialog.showModal()
}

function forgetActiveEdit() {
  activeGraphic = null
}

function syncCommittedPolygons() {
  committedPolygons = layer.graphics.toArray().map((graphic) => graphic.toJSON())
  pendingPersistence = persistPolygons(committedPolygons)
  return pendingPersistence
}

function restoreCommittedPolygons() {
  const selectedIndex = selectedGraphic ? layer.graphics.toArray().indexOf(selectedGraphic) : -1
  const expandedIndex = expandedGraphic ? layer.graphics.toArray().indexOf(expandedGraphic) : -1
  layer.removeAll()
  committedPolygons.forEach((polygon) => layer.add(Graphic.fromJSON(polygon)))
  const restored = layer.graphics.toArray()
  selectedGraphic = selectedIndex >= 0 ? restored[selectedIndex] ?? null : null
  expandedGraphic = expandedIndex >= 0 ? restored[expandedIndex] ?? null : null
  render()
}

function cancelActiveAction() {
  cancellingUpdate = activeAction === 'update'
  confirmingUpdate = false
  setActiveAction(null)
  sketch.cancel()
  requestAnimationFrame(() => {
    restoreCommittedPolygons()
    cancellingUpdate = false
  })
  forgetActiveEdit()
}

function commitActiveEdit() {
  syncCommittedPolygons()
  forgetActiveEdit()
}

function render() {
  list.replaceChildren()
  empty.hidden = layer.graphics.length > 0
  count.textContent = String(layer.graphics.length)
  clearButton.disabled = layer.graphics.length === 0
  layer.graphics.forEach((graphic, index) => {
    const item = document.createElement('li')
    item.dataset.testid = 'polygon-item'
    item.className = 'pin'
    if (graphic === selectedGraphic) item.classList.add('selected')
    const label = document.createElement('span')
    label.className = 'polygon-label'
    label.tabIndex = 0
    label.textContent = `Polígono ${index + 1}`
    const startEditing = async () => {
      selectedGraphic = graphic
      confirmingUpdate = false
      const polygon = graphic.geometry as Polygon
      activeGraphic = graphic
      setActiveAction('update')
      render()
      await sketch.update(graphic, { tool: 'reshape', toggleToolOnClick: false })
      message.textContent = 'Modo de edição ativo: arraste um vértice ou clique na alça de uma aresta.'
    }
    label.addEventListener('click', startEditing)
    label.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        void startEditing()
      }
    })
    const expand = document.createElement('button')
    expand.type = 'button'
    expand.dataset.testid = 'expand-polygon'
    expand.className = 'icon-button expand-polygon'
    expand.setAttribute('aria-expanded', String(graphic === expandedGraphic))
    expand.setAttribute('aria-label', graphic === expandedGraphic ? `Ocultar vértices do Polígono ${index + 1}` : `Mostrar vértices do Polígono ${index + 1}`)
    expand.innerHTML = '<i data-lucide="chevron-down" aria-hidden="true"></i>'
    expand.addEventListener('click', () => {
      selectedGraphic = graphic
      expandedGraphic = expandedGraphic === graphic ? null : graphic
      render()
    })
    const remove = document.createElement('button')
    remove.type = 'button'
    remove.dataset.testid = 'delete-polygon'
    remove.className = 'icon-button delete-polygon'
    remove.title = `Excluir Polígono ${index + 1}`
    remove.setAttribute('aria-label', `Excluir Polígono ${index + 1}`)
    remove.innerHTML = '<i data-lucide="trash-2" aria-hidden="true"></i>'
    remove.addEventListener('click', () => {
      requestDeletion(graphic)
    })
    item.append(label, expand, remove)
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
  renderIcons()
}

drawButton.addEventListener('click', async () => {
  forgetActiveEdit()
  setActiveAction('create')
  message.textContent = 'Clique para criar vértices; dê dois cliques ou use “Concluir desenho” para finalizar.'
  await sketch.create('polygon', { mode: 'click' })
})
finishButton.addEventListener('click', () => {
  if (activeAction === 'update') confirmingUpdate = true
  sketch.complete()
})
cancelButton.addEventListener('click', () => {
  confirmingUpdate = false
  cancelActiveAction()
  message.textContent = 'Desenho ou edição cancelado.'
})
clearButton.addEventListener('click', () => requestDeletion('all'))
dismissClearButton.addEventListener('click', () => {
  pendingDeletion = null
  clearDialog.close()
})
confirmClearButton.addEventListener('click', () => {
  const target = pendingDeletion
  if (!target) return
  sketch.cancel()
  setActiveAction(null)
  forgetActiveEdit()
  if (target === 'all') {
    layer.removeAll()
    selectedGraphic = null
    expandedGraphic = null
    message.textContent = 'Polígonos removidos.'
  } else {
    const polygonNumber = layer.graphics.toArray().indexOf(target) + 1
    layer.remove(target)
    if (selectedGraphic === target) selectedGraphic = null
    if (expandedGraphic === target) expandedGraphic = null
    message.textContent = `Polígono ${polygonNumber} removido.`
  }
  syncCommittedPolygons()
  render()
  pendingDeletion = null
  clearDialog.close()
})
sidebarClose.addEventListener('click', () => setSidebarCollapsed(true))
sidebarToggle.addEventListener('click', () => setSidebarCollapsed(false))
sketch.on('create', (event) => {
  if (event.state === 'start') setActiveAction('create')
  if (event.state === 'complete') { setActiveAction(null); forgetActiveEdit(); syncCommittedPolygons(); render(); message.textContent = 'Polígono criado. Clique nele para editar vértices e arestas.' }
  if (event.state === 'cancel') setActiveAction(null)
})
sketch.on('update', (event) => {
  if (event.state === 'start') setActiveAction('update')
  const type = event.toolEventInfo?.type
  if (type === 'move-stop') lastEdit.textContent = 'Polígono movido.'
  if (type === 'reshape-stop') lastEdit.textContent = 'Vértice ou aresta arrastada.'
  if (type === 'vertex-add') lastEdit.textContent = 'Novo vértice adicionado.'
  if (type === 'move-stop' || type === 'reshape-stop' || type === 'vertex-add') render()
  if (event.state === 'complete') {
    if (cancellingUpdate) return
    if (activeAction === 'update' && !confirmingUpdate && activeGraphic) {
      message.textContent = 'Edição mantida ativa. Use Enter ou “Concluir edição” para confirmar.'
      void sketch.update(activeGraphic, { tool: 'reshape', toggleToolOnClick: false })
      return
    }
    confirmingUpdate = false
    commitActiveEdit()
    setActiveAction(null)
    render()
    message.textContent = 'Polígono editado.'
  }
})
window.addEventListener('keydown', (event) => {
  if (activeAction === 'update' && event.key === 'Enter') {
    event.preventDefault()
    confirmingUpdate = true
    sketch.complete()
  }
})
view.when(async () => {
  view.ui.move('zoom', 'bottom-left')
  committedPolygons = await loadPersistedPolygons()
  committedPolygons.forEach((polygon) => layer.add(Graphic.fromJSON(polygon)))
  ready.hidden = false
  render()
})

// Disponível somente no servidor de desenvolvimento ou na build temporária de E2E.
// A API apenas lê coordenadas de tela para que o WebDriver reproduza gestos reais.
if (import.meta.env.DEV || import.meta.env.VITE_E2E === 'true') {
  const testWindow = window as typeof window & {
    polygonTestApi?: {
      getSelectedScreenPoints: () => {
        center: { x: number; y: number }
        vertices: Array<{ x: number; y: number }>
        edgeMidpoint: { x: number; y: number }
      }
      waitForPersistence: () => Promise<void>
    }
  }
  testWindow.polygonTestApi = {
    getSelectedScreenPoints: () => {
      const graphic = activeGraphic ?? selectedGraphic
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
