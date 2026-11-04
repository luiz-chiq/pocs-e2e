import type Graphic from '@arcgis/core/Graphic.js'
import type Point from '@arcgis/core/geometry/Point.js'
import type Polygon from '@arcgis/core/geometry/Polygon.js'
import type MapView from '@arcgis/core/views/MapView.js'
import type GraphicsLayerView from '@arcgis/core/views/layers/GraphicsLayerView.js'
import * as labelPointOperator from '@arcgis/core/geometry/operators/labelPointOperator.js'
import { normalizePolygonName } from '../polygon-names'
import { graphicId, isValidFeature } from './features'
import type { EditorSnapshot, MapLabel } from './types'

interface PresentationHost {
  getState(): {
    ready: boolean
    mode: EditorSnapshot['mode']
    action: EditorSnapshot['action']
    selected: Graphic | null
    active: Graphic | null
    draftName: string
  }
  getGraphics(): Graphic[]
  getLayerView(): GraphicsLayerView | null
  name(graphic: Graphic): string
  changed(): void
}

export function createMapPresentation(view: MapView, host: PresentationHost) {
  const anchors = new WeakMap<Graphic, { geometry: Graphic['geometry']; point: Point }>()
  let frame: number | null = null
  let disposed = false
  let labels: MapLabel[] = []
  let highlight: { remove(): void } | null = null
  let highlighted: Graphic | null = null

  function scheduleLabels() {
    if (frame !== null || disposed) return
    frame = requestAnimationFrame(() => {
      frame = null
      labels = []
      const state = host.getState()
      if (state.ready && view.ready && state.mode !== 'detached') {
        for (const graphic of host.getGraphics()) {
          const id = graphicId(graphic), geometry = graphic.geometry
          if (!id || !isValidFeature(geometry)) continue
          let anchor = anchors.get(graphic)
          if (!anchor || anchor.geometry !== geometry) {
            anchor = { geometry, point: geometry?.type === 'point' ? geometry : labelPointOperator.execute(geometry as Polygon) }
            anchors.set(graphic, anchor)
          }
          const point = view.toScreen(anchor.point)
          if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) continue
          labels.push({ id, name: state.action === 'update' && graphic === state.active
            ? normalizePolygonName(state.draftName) || host.name(graphic) : host.name(graphic),
            x: point.x, y: point.y - (geometry?.type === 'point' ? 19 : 0), selected: graphic === state.selected,
            hidden: point.x < 0 || point.y < 0 || point.x > view.width || point.y > view.height })
        }
      }
      host.changed()
    })
  }

  function updateSelection() {
    const state = host.getState()
    const target = state.action === 'update' && state.selected === state.active ? null : state.selected
    const layerView = host.getLayerView()
    if (!layerView || highlighted === target) return
    highlight?.remove()
    highlight = target ? layerView.highlight(target, { name: 'polygon-selection' }) : null
    highlighted = target
  }

  return {
    scheduleLabels, updateSelection,
    getLabels: () => labels,
    invalidate: (graphic: Graphic) => anchors.delete(graphic),
    destroy() {
      disposed = true
      if (frame !== null) cancelAnimationFrame(frame)
      highlight?.remove()
    }
  }
}
