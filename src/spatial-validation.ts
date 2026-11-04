import type Graphic from '@arcgis/core/Graphic.js'
import type Polygon from '@arcgis/core/geometry/Polygon.js'
import type Point from '@arcgis/core/geometry/Point.js'
import SpatialReference from '@arcgis/core/geometry/SpatialReference.js'
import { project } from '@arcgis/core/geometry/support/webMercatorUtils.js'
import * as containsOperator from '@arcgis/core/geometry/operators/containsOperator.js'
import { fixedPolygonColor } from './polygon-rules'
import type { SpatialValidationIssue } from './editor/types'

function areaIndex(areas: Polygon[]) {
  const extents = areas.map(area => area.extent).filter(extent => extent != null)
  const xmin = Math.min(...extents.map(e => e.xmin)), ymin = Math.min(...extents.map(e => e.ymin))
  const xmax = Math.max(...extents.map(e => e.xmax)), ymax = Math.max(...extents.map(e => e.ymax))
  const count = Math.max(1, Math.min(64, Math.ceil(Math.sqrt(areas.length))))
  const width = Math.max(1, (xmax - xmin) / count), height = Math.max(1, (ymax - ymin) / count)
  const cellX = (x: number) => Math.max(0, Math.min(count - 1, Math.floor((x - xmin) / width)))
  const cellY = (y: number) => Math.max(0, Math.min(count - 1, Math.floor((y - ymin) / height)))
  const cells = new Map<number, Polygon[]>()
  const large: Polygon[] = []
  for (const area of areas) {
    const e = area.extent
    if (!e) continue
    const left = cellX(e.xmin), right = cellX(e.xmax), bottom = cellY(e.ymin), top = cellY(e.ymax)
    if ((right - left + 1) * (top - bottom + 1) > 128) { large.push(area); continue }
    for (let x = left; x <= right; x++) for (let y = bottom; y <= top; y++) {
      const key = y * count + x
      const bucket = cells.get(key) ?? []
      bucket.push(area)
      cells.set(key, bucket)
    }
  }
  return (point: Point) => point.x < xmin || point.x > xmax || point.y < ymin || point.y > ymax ? []
    : [...large, ...(cells.get(cellY(point.y) * count + cellX(point.x)) ?? [])]
}

export function createSpatialValidator() {
  const reference = new SpatialReference({ wkid: 3857 })
  const projected = new WeakMap<Graphic, { source: Graphic['geometry']; geometry: ReturnType<typeof project> }>()
  const containment = new WeakMap<Point, WeakMap<Polygon, boolean>>()
  let indexed: Polygon[] = []
  let candidates = areaIndex([])
  return {
    invalidate: (graphic: Graphic) => projected.delete(graphic),
    validate(graphics: Graphic[], draft?: { id: string | null; name: string; color: string }): SpatialValidationIssue[] {
      const features = graphics.map(graphic => {
        let cached = projected.get(graphic)
        if (!cached || cached.source !== graphic.geometry) {
          cached = { source: graphic.geometry, geometry: project(graphic.geometry, reference)?.clone() ?? null }
          projected.set(graphic, cached)
        }
        return { id: graphic.attributes.polygonId as string,
          name: draft && draft.id === graphic.attributes.polygonId ? draft.name || graphic.attributes.name : graphic.attributes.name,
          color: fixedPolygonColor(draft && draft.id === graphic.attributes.polygonId ? draft.color : graphic.attributes.color), geometry: cached.geometry }
      })
      const areas = new Map(features.flatMap(feature => feature.geometry?.type === 'polygon' ? [[feature.geometry, feature] as const] : []))
      const geometries = [...areas.keys()]
      if (geometries.length !== indexed.length || geometries.some((area, i) => area !== indexed[i])) {
        indexed = geometries
        candidates = areaIndex(geometries)
      }
      const issues: SpatialValidationIssue[] = []
      for (const point of features) {
        if (point.geometry?.type !== 'point') continue
        let pairs = containment.get(point.geometry)
        if (!pairs) { pairs = new WeakMap(); containment.set(point.geometry, pairs) }
        for (const geometry of candidates(point.geometry)) {
          let inside = pairs.get(geometry)
          if (inside === undefined) {
            inside = Boolean(geometry.extent?.contains(point.geometry) && containsOperator.execute(geometry, point.geometry))
            pairs.set(geometry, inside)
          }
          if (!inside) continue
          const area = areas.get(geometry)!
          const sameColor = point.color === area.color
          issues.push({ id: `${point.id}:${area.id}`, pointId: point.id, areaId: area.id,
            severity: sameColor ? 'warning' : 'error',
            message: `O ponto “${point.name}” está dentro da área “${area.name}” ${sameColor ? 'da mesma cor.' : 'de cor diferente.'}` })
        }
      }
      return issues.sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'))
    }
  }
}
