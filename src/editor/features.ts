import type Graphic from '@arcgis/core/Graphic.js'
import SimpleFillSymbol from '@arcgis/core/symbols/SimpleFillSymbol.js'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'
import { fixedPolygonColor } from '../polygon-rules'

export function graphicId(graphic: Graphic | null): string | null {
  return graphic?.attributes?.polygonId ?? null
}

export function isLocked(graphic: Graphic | null) {
  return graphic?.attributes?.locked === true
}

export function polygonColor(graphic: Graphic) {
  const stored = graphic.attributes?.color
  return fixedPolygonColor(stored ?? (graphic.symbol?.type === 'simple-fill' ? graphic.symbol.outline?.color?.toHex() : undefined))
}

export function polygonSymbol(color: string) {
  return new SimpleFillSymbol({ color: `${color}80`, outline: { color, width: 2 } })
}

export function pointSymbol(color: string, editing = false) {
  return new SimpleMarkerSymbol({ style: 'circle', size: 13, color, outline: editing ? { color: '#ffffff', width: 3 } : { style: 'none' } })
}

export function featureSymbol(graphic: Graphic, color: string, editing = false) {
  return graphic.geometry?.type === 'point' ? pointSymbol(color, editing) : editing ? editingSymbol(color) : polygonSymbol(color)
}

export function editingSymbol(color: string) {
  return new SimpleFillSymbol({ color: `${color}80`, outline: { color: '#ffffff', width: 3 } })
}

export function isValidVertices(vertices: number[][]) {
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

export function isValidPolygon(geometry: Graphic['geometry']) {
  return geometry?.type === 'polygon' && geometry.rings.length > 0 && geometry.rings.every(isValidVertices)
}

export function isValidFeature(geometry: Graphic['geometry']) {
  return geometry?.type === 'point'
    ? Number.isFinite(geometry.x) && Number.isFinite(geometry.y)
    : isValidPolygon(geometry)
}
