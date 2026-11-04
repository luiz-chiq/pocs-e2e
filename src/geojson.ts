import { isValidPolygonName, normalizePolygonName } from './polygon-names'
import type { FeatureDocument } from './editor/feature-model'

type Position = [number, number]
type Geometry = { type: 'Point'; coordinates: Position } | { type: 'Polygon'; coordinates: Position[][] } | { type: 'MultiPolygon'; coordinates: Position[][][] }
export interface GeoJSONDocument { type: 'FeatureCollection'; features: { type: 'Feature'; properties: { name: string; color?: string; locked?: boolean }; geometry: Geometry }[] }
function fail(message: string): never { throw new Error(message) }
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : fail('GeoJSON inválido: objeto ausente.')
function orient(ring: Position[], clockwise: boolean) {
  const [x0, y0] = ring[0]
  const signed = ring.slice(0, -1).reduce((sum, [x, y], index) => { const [nx, ny] = ring[index + 1]; return sum + (x - x0) * (ny - y0) - (nx - x0) * (y - y0) }, 0)
  return (signed < 0) === clockwise ? ring : [...ring].reverse()
}
function importedName(value: unknown, fallback: string) {
  if (typeof value !== 'string') return fallback
  if (isValidPolygonName(value)) return normalizePolygonName(value)
  const clean = [...value.normalize('NFC').replace(/[^\p{L}\p{M}\p{N} ]/gu, ' ').replace(/^[^\p{L}\p{N}]+/u, '').trim().replace(/ +/g, ' ')].slice(0, 30).join('').trim()
  return isValidPolygonName(clean) ? clean : fallback
}
/** Converter só dados geográficos e metadados conhecidos; interiores são preenchidos. */
export function readGeoJSON(value: unknown): FeatureDocument[] {
  const root = record(value)
  if ('crs' in root) fail('Use GeoJSON em WGS84 (longitude/latitude), sem a propriedade crs.')
  const features = root.type === 'FeatureCollection' ? root.features : [root.type === 'Feature' ? root : { type: 'Feature', geometry: root, properties: null }]
  if (!Array.isArray(features) || !features.length || features.length > 1000) fail('O arquivo deve conter de 1 a 1.000 áreas ou pontos.')
  let positions = 0
  function position(input: unknown): Position {
    if (++positions > 100000) fail('O arquivo excede o limite de 100.000 pontos.')
    if (!Array.isArray(input) || input.length < 2 || input.length > 3 || !input.every(item => typeof item === 'number' && Number.isFinite(item))) return fail('GeoJSON: coordenadas inválidas.')
    const [x, y] = input as number[]
    if (Math.abs(x) > 180 || Math.abs(y) > 90) fail('GeoJSON deve usar longitude/latitude em WGS84.')
    return [x, y]
  }
  function polygon(input: unknown): Position[] {
    if (!Array.isArray(input) || !input.length) return fail('GeoJSON: contorno ausente.')
    const rings = input.map(ring => {
      if (!Array.isArray(ring) || ring.length < 4) return fail('GeoJSON: o contorno deve ter pelo menos quatro posições.')
      const points = ring.map(position)
      if (points[0][0] !== points.at(-1)![0] || points[0][1] !== points.at(-1)![1]) fail('GeoJSON: o contorno deve estar fechado.')
      return points
    })
    return orient(rings[0], true)
  }
  return features.map((input, index): FeatureDocument => {
    const feature = record(input)
    if (feature.type !== 'Feature') return fail(`Elemento ${index + 1}: esperado um Feature GeoJSON.`)
    const geometry = record(feature.geometry)
    const properties = feature.properties == null ? {} : record(feature.properties)
    const name = importedName(properties.name ?? properties.nome, `${geometry.type === 'Point' ? 'Ponto' : 'Área'} ${index + 1}`)
    const color = properties.color ?? properties.fill ?? properties['marker-color']
    const metadata = { name, ...(typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? { color: color.toLowerCase() } : {}), ...(properties.locked === true ? { locked: true } : {}) }
    if (geometry.type === 'Point') { const [x, y] = position(geometry.coordinates); return { ...metadata, geometry: { x, y, spatialReference: { wkid: 4326 } } } }
    const rings = geometry.type === 'Polygon' ? [polygon(geometry.coordinates)] : geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates) && geometry.coordinates.length ? geometry.coordinates.map(polygon) : fail(`Elemento ${index + 1}: use Point, Polygon ou MultiPolygon.`)
    return { ...metadata, geometry: { rings, spatialReference: { wkid: 4326 } } }
  })
}
/** O chamador normaliza as áreas sem buracos antes de exportar. */
export function writeGeoJSON(items: FeatureDocument[]): GeoJSONDocument {
  return { type: 'FeatureCollection', features: items.map(item => {
    const wkid = item.geometry.spatialReference.wkid
    function geographic([x, y]: number[]): Position {
      if (wkid === 4326) return [x, y]
      return [Math.max(-180, Math.min(180, x / 6378137 * 180 / Math.PI)), (2 * Math.atan(Math.exp(y / 6378137)) - Math.PI / 2) * 180 / Math.PI]
    }
    let geometry: Geometry
    if (item.geometry.rings) {
      const rings = item.geometry.rings.map(ring => orient(ring.map(geographic), false))
      geometry = rings.length === 1 ? { type: 'Polygon', coordinates: [rings[0]] } : { type: 'MultiPolygon', coordinates: rings.map(ring => [ring]) }
    } else geometry = { type: 'Point', coordinates: geographic([item.geometry.x, item.geometry.y]) }
    return { type: 'Feature', properties: { name: item.name, ...(item.color ? { color: item.color } : {}), ...(item.locked ? { locked: true } : {}) }, geometry }
  }) }
}
