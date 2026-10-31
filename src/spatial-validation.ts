import type Graphic from '@arcgis/core/Graphic.js'
import SpatialReference from '@arcgis/core/geometry/SpatialReference.js'
import { project } from '@arcgis/core/geometry/support/webMercatorUtils.js'
import * as containsOperator from '@arcgis/core/geometry/operators/containsOperator.js'
import { fixedPolygonColor } from './polygon-rules'
import type { SpatialValidationIssue } from './editor/types'

export function validatePointsInAreas(graphics: Graphic[], draft?: { id: string | null; name: string; color: string }): SpatialValidationIssue[] {
  const reference = new SpatialReference({ wkid: 3857 })
  const features = graphics.map(graphic => ({
    id: graphic.attributes.polygonId as string,
    name: draft && draft.id === graphic.attributes.polygonId ? draft.name || graphic.attributes.name : graphic.attributes.name,
    color: fixedPolygonColor(draft && draft.id === graphic.attributes.polygonId ? draft.color : graphic.attributes.color),
    geometry: project(graphic.geometry, reference)
  }))
  const points = features.filter(feature => feature.geometry?.type === 'point')
  const areas = features.filter(feature => feature.geometry?.type === 'polygon')
  const issues: SpatialValidationIssue[] = []
  for (const point of points) {
    const pointGeometry = point.geometry
    if (pointGeometry?.type !== 'point') continue
    for (const area of areas) {
      const areaGeometry = area.geometry
      if (areaGeometry?.type !== 'polygon') continue
      // A borda não faz parte do interior da área.
      if (!areaGeometry.extent?.contains(pointGeometry) || !containsOperator.execute(areaGeometry, pointGeometry)) continue
      const sameColor = point.color === area.color
      issues.push({ id: `${point.id}:${area.id}`, pointId: point.id, areaId: area.id,
        severity: sameColor ? 'warning' : 'error',
        message: `O ponto “${point.name}” está dentro da área “${area.name}” ${sameColor ? 'da mesma cor.' : 'de cor diferente.'}` })
    }
  }
  return issues.sort((a, b) => Number(b.severity === 'error') - Number(a.severity === 'error'))
}
