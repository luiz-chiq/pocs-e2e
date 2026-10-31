import { isValidPolygonName, normalizePolygonName } from './polygon-names.ts'

export const maxPolygonFileBytes = 10 * 1024 * 1024

export function validatePolygonDocument(value: unknown): PolygonFileData[] {
  const invalid = (message: string): never => { throw new Error(message) }
  if (!value || typeof value !== 'object') return invalid('Formato inválido. Escolha um JSON exportado pelo aplicativo.')
  const document = value as Record<string, unknown>
  if (document.format !== 'poligonos' || ![1, 2].includes(document.version as number) || !Array.isArray(document.polygons)) {
    return invalid('Formato inválido. Escolha um JSON exportado pelo aplicativo (versão 1 ou 2).')
  }
  if (!document.polygons.length || document.polygons.length > 1000) return invalid('O arquivo deve conter de 1 a 1.000 áreas ou pontos.')
  let vertices = 0
  return document.polygons.map((input: unknown, index): PolygonFileData => {
    const prefix = `Elemento ${index + 1}: `
    if (!input || typeof input !== 'object') return invalid(prefix + 'dados inválidos.')
    const polygon = input as Record<string, unknown>
    if (typeof polygon.name !== 'string' || !isValidPolygonName(polygon.name)) return invalid(prefix + 'nome inválido (máximo de 30 caracteres).')
    if ('locked' in polygon && typeof polygon.locked !== 'boolean') return invalid(prefix + 'bloqueio inválido.')
    if ('color' in polygon && (typeof polygon.color !== 'string' || !/^#[0-9a-f]{6}$/i.test(polygon.color))) return invalid(prefix + 'cor inválida.')
    const geometry = polygon.geometry as PolygonFileData['geometry'] | undefined
    const wkid = geometry?.spatialReference?.wkid
    if (!wkid || ![4326, 3857, 102100, 102113].includes(wkid)) return invalid(prefix + 'referência espacial não suportada.')
    if (geometry && ('x' in geometry || 'y' in geometry)) {
      if (document.version !== 2 || 'rings' in geometry) return invalid(prefix + 'formato de ponto inválido. Use a versão 2 para pontos.')
      const { x, y } = geometry
      if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y)) return invalid(prefix + 'coordenadas inválidas.')
      if (wkid === 4326 ? Math.abs(x) > 180 || Math.abs(y) > 90 : Math.abs(x) > 20037509 || Math.abs(y) > 20037509) return invalid(prefix + 'coordenadas fora dos limites da referência espacial.')
      if (++vertices > 100000) return invalid('O arquivo excede o limite de 100.000 pontos.')
      return { name: normalizePolygonName(polygon.name), geometry: { x, y, spatialReference: { wkid } },
        ...(polygon.locked === true ? { locked: true } : {}), ...(typeof polygon.color === 'string' ? { color: polygon.color.toLowerCase() } : {}) }
    }
    if (!Array.isArray(geometry?.rings) || !geometry.rings.length) return invalid(prefix + 'desenho ausente.')
    const rings = geometry.rings.map((ring: unknown) => {
      if (!Array.isArray(ring) || ring.length < 4) return invalid(prefix + 'desenhe pelo menos 3 pontos formando uma área.')
      vertices += ring.length
      if (vertices > 100000) return invalid('O arquivo excede o limite de 100.000 pontos.')
      const points: number[][] = ring.map((point: unknown) => {
        if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) return invalid(prefix + 'coordenadas inválidas.')
        const [x, y] = point as number[]
        if (wkid === 4326 ? Math.abs(x) > 180 || Math.abs(y) > 90 : Math.abs(x) > 20037509 || Math.abs(y) > 20037509) {
          return invalid(prefix + 'coordenadas fora dos limites da referência espacial.')
        }
        return [x, y]
      })
      const [x0, y0] = points[0]
      const last = points.at(-1)!
      if (last[0] !== x0 || last[1] !== y0) return invalid(prefix + 'o contorno deve estar fechado.')
      if (new Set(points.map(([x, y]) => `${x},${y}`)).size < 3) return invalid(prefix + 'use pelo menos 3 pontos diferentes.')
      const area = points.slice(0, -1).reduce((sum, [x, y], i) => {
        const [nx, ny] = points[i + 1]
        return sum + (x - x0) * (ny - y0) - (nx - x0) * (y - y0)
      }, 0)
      const span = points.reduce((max, [x, y]) => Math.max(max, Math.abs(x - x0), Math.abs(y - y0)), 0)
      if (!Number.isFinite(area) || Math.abs(area) <= span * span * 1e-10) return invalid(prefix + 'os pontos devem formar uma área.')
      return points
    })
    return { name: normalizePolygonName(polygon.name), geometry: { rings, spatialReference: { wkid } },
      ...(polygon.locked === true ? { locked: true } : {}), ...(typeof polygon.color === 'string' ? { color: polygon.color.toLowerCase() } : {}) }
  })
}
