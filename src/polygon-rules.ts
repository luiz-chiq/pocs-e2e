import type Graphic from '@arcgis/core/Graphic.js'
import Polygon from '@arcgis/core/geometry/Polygon.js'
import SpatialReference from '@arcgis/core/geometry/SpatialReference.js'
import { project } from '@arcgis/core/geometry/support/webMercatorUtils.js'
import * as intersectionOperator from '@arcgis/core/geometry/operators/intersectionOperator.js'
import * as unionOperator from '@arcgis/core/geometry/operators/unionOperator.js'
import * as areaOperator from '@arcgis/core/geometry/operators/areaOperator.js'
import * as equalsOperator from '@arcgis/core/geometry/operators/equalsOperator.js'
import * as simplifyOperator from '@arcgis/core/geometry/operators/simplifyOperator.js'
import * as polygonOverlayOperator from '@arcgis/core/geometry/operators/polygonOverlayOperator.js'

export const polygonPalette = [
  ['Azul', '#1261a0', '1'], ['Verde', '#23845b', '2'], ['Ciano', '#16868c', '3'],
  ['Vermelho', '#cf4949', '4'], ['Roxo', '#8756b3', '5'], ['Rosa', '#d65c94', '6'],
  ['Amarelo', '#d6a323', '7'], ['Laranja', '#ed8c2b', '8'],
  ['Preto', '#000000', '9'], ['Branco', '#ffffff', '0']
] as const
export const defaultPolygonColor = polygonPalette[0][1]

export function isPolygonColor(value: string) {
  return polygonPalette.some(([, color]) => color === value.toLowerCase())
}

// Compatibilidade com arquivos e dados antigos que aceitavam cores livres.
export function fixedPolygonColor(value: unknown): string {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) return defaultPolygonColor
  const rgb = (hex: string) => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16))
  const source = rgb(value)
  return polygonPalette.reduce((nearest, option) => {
    const distance = (color: string) => rgb(color).reduce((sum, channel, index) => sum + (channel - source[index]) ** 2, 0)
    return distance(option[1]) < distance(nearest[1]) ? option : nearest
  })[1]
}

export interface PolygonGroup {
  survivor: Graphic
  members: Graphic[]
  geometry: Polygon
  color: string
  locked: boolean
}

export function fillPolygonHoles(polygon: Polygon): Polygon {
  const simple = simplifyOperator.execute(polygon)
  if (simple?.type !== 'polygon' || !simple.rings.length) throw new Error('O desenho não forma uma área válida.')
  // A orientação dos anéis não detecta vazios fechados entre partes que se
  // tocam em vértices. O overlay também identifica esses buracos implícitos.
  let filled = simple
  for (let pass = 0; pass < 2; pass++) {
    const holes = polygonOverlayOperator.executeMany([filled], { overlaps: false, noOverlaps: false, holes: true }).results
    if (!holes.length) return filled.clone()
    const united = unionOperator.executeMany([filled, ...holes])
    if (united?.type !== 'polygon' || !united.rings.length) throw new Error('Não foi possível preencher os buracos da área.')
    filled = united
  }
  if (polygonOverlayOperator.executeMany([filled], { overlaps: false, noOverlaps: false, holes: true }).results.length) {
    throw new Error('A área ainda possui buracos e não pode ser salva.')
  }
  return filled.clone()
}

export function cloneGeometryBeside(source: Graphic, graphics: Graphic[]): Polygon | null {
  const reference = new SpatialReference({ wkid: 3857 })
  const original = project(source.geometry, reference)
  if (original?.type !== 'polygon' || !original.extent) return null
  const occupied = graphics.map(graphic => project(graphic.geometry, reference)?.extent).filter(extent => extent != null)
  const width = Math.max(original.extent.width, 1) * 1.3
  const height = Math.max(original.extent.height, 1) * 1.3
  for (let step = 1; step <= graphics.length + 1; step++) {
    for (const [dx, dy] of [[width * step, 0], [-width * step, 0], [0, height * step], [0, -height * step]]) {
      const copy = original.clone()
      copy.rings = original.rings.map(ring => ring.map(([x, y, ...rest]) => [x + dx, y + dy, ...rest]))
      const extent = copy.extent!
      if (Math.max(Math.abs(extent.xmin), Math.abs(extent.xmax), Math.abs(extent.ymin), Math.abs(extent.ymax)) > 20037508) continue
      if (!occupied.some(other => other.intersects(extent))) return project(copy, source.geometry!.spatialReference) as Polygon
    }
  }
  return null
}

// Preparar toda a operação antes de modificar a camada. A união preserva
// concavidades e partes externas; os buracos são preenchidos antes e após a união.
export function groupOverlappingPolygons(graphics: Graphic[], preferred?: Graphic | null): PolygonGroup[] {
  const reference = new SpatialReference({ wkid: 3857 })
  const groups: PolygonGroup[] = graphics.map(graphic => {
    if (graphic.geometry?.type !== 'polygon') throw new Error('Desenho inválido para fusão.')
    const geometry = project(fillPolygonHoles(graphic.geometry), reference)
    if (geometry?.type !== 'polygon') throw new Error('Referência espacial não suportada para fusão.')
    const symbolColor = graphic.symbol?.type === 'simple-fill' ? graphic.symbol.outline?.color?.toHex() : undefined
    return {
      survivor: graphic, members: [graphic], geometry,
      color: fixedPolygonColor(graphic.attributes?.color ?? symbolColor),
      locked: graphic.attributes?.locked === true
    }
  })
  for (let index = 0; index < groups.length; index++) {
    const group = groups[index]
    for (let candidate = index + 1; candidate < groups.length;) {
      const other = groups[candidate]
      if (group.color !== other.color || !group.geometry.extent?.intersects(other.geometry.extent!)) { candidate++; continue }
      const intersection = intersectionOperator.execute(group.geometry, other.geometry)
      if (intersection?.type !== 'polygon' || Math.abs(areaOperator.execute(intersection)) === 0) { candidate++; continue }
      const geometry = unionOperator.execute(group.geometry, other.geometry)
      if (geometry?.type !== 'polygon' || !geometry.rings.length) throw new Error('Não foi possível fundir as áreas.')
      group.geometry = fillPolygonHoles(geometry)
      group.members.push(...other.members)
      group.locked ||= other.locked
      if (preferred && other.members.includes(preferred)) group.survivor = preferred
      groups.splice(candidate, 1)
      // A geometria maior pode alcançar uma área já examinada (fusão em cadeia).
      candidate = index + 1
    }
  }
  return groups.map(group => {
    const original = fillPolygonHoles(group.survivor.geometry as Polygon)
    const projected = project(original, reference)!
    // Reimportar a mesma área não deve mudar suas coordenadas por arredondamento.
    group.geometry = equalsOperator.execute(group.geometry, projected)
      ? original.clone() : project(group.geometry, original.spatialReference) as Polygon
    return group
  })
}
