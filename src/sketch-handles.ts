import type SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'
import type SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js'
import type Graphic from '@arcgis/core/Graphic.js'
import type Polygon from '@arcgis/core/geometry/Polygon.js'
// O SDK não expõe o tamanho das alças no SketchViewModel público. Isolar a
// adaptação dos símbolos de reshape da versão instalada e validar no navegador.
// @ts-expect-error O módulo interno do ArcGIS não publica declarações TypeScript.
import { defaultSymbols } from '@arcgis/core/views/draw/support/reshapeUtils.js'

const symbols = defaultSymbols as Record<'vertices' | 'midpoints', Record<string, SimpleMarkerSymbol>>

// A seleção de alças pertence ao componente de reshape do SDK, não à seleção
// de áreas. Consultá-la evita transformar Delete de vértice em exclusão da área.
type ReshapeComponent = {
  type?: string
  graphic?: Graphic
  selectedManipulators?: { length: number; toArray(): Graphic[] }
  removeSelectedVertices?(): void
}
function reshapeComponent(sketch: SketchViewModel) {
  const component = (sketch as unknown as { activeComponent?: ReshapeComponent | null }).activeComponent
  return component?.type === 'reshape' ? component : null
}
export function selectedVertexCount(sketch: SketchViewModel) {
  return reshapeComponent(sketch)?.selectedManipulators?.length ?? 0
}
export function hasSelectedVertices(sketch: SketchViewModel) {
  return selectedVertexCount(sketch) > 0
}
// Usa a mesma operação do SDK que Delete, preservando o histórico de desfazer.
export function removeSelectedVertices(sketch: SketchViewModel) {
  const component = reshapeComponent(sketch)
  const selected = component?.selectedManipulators?.toArray() ?? []
  const geometry = component?.graphic?.geometry
  if (!selected.length || geometry?.type !== 'polygon' || !component?.removeSelectedVertices) return false
  const coordinates = selected.flatMap(vertex => vertex.geometry?.type === 'point' ? [[vertex.geometry.x, vertex.geometry.y]] : [])
  const leavesValidRings = (geometry as Polygon).rings.every(ring =>
    ring.slice(0, -1).filter(([x, y]) => !coordinates.some(([vx, vy]) => x === vx && y === vy)).length >= 3)
  if (!leavesValidRings) return false
  component.removeSelectedVertices()
  return true
}
for (const [state, size] of Object.entries({ default: 12, hover: 15, selected: 12 })) {
  const symbol = symbols.vertices[state].clone()
  symbol.size = size // Padrão do SDK: 8 / 10 / 8 pontos. Aumento de 50% no diâmetro.
  symbols.vertices[state] = symbol
}
for (const state of ['default', 'hover']) {
  const symbol = symbols.midpoints[state].clone()
  symbol.size = 9 // Padrão do SDK: 6 pontos.
  symbols.midpoints[state] = symbol
}
