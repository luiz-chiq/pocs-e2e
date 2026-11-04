import type Graphic from '@arcgis/core/Graphic.js'
import type Polygon from '@arcgis/core/geometry/Polygon.js'
import type { PolygonItem } from './types'
import { graphicId, isLocked, polygonColor } from './features'

export function createFeatureItems() {
  const cache = new WeakMap<Graphic, { geometry: Graphic['geometry']; item: PolygonItem }>()
  let previous: PolygonItem[] = []
  return {
    invalidate: (graphic: Graphic) => cache.delete(graphic),
    build(graphics: Graphic[], name: (graphic: Graphic) => string) {
      const items = graphics.map(graphic => {
        const geometry = graphic.geometry, color = polygonColor(graphic), locked = isLocked(graphic), label = name(graphic)
        const cached = cache.get(graphic)
        if (cached && cached.geometry === geometry && cached.item.color === color && cached.item.locked === locked && cached.item.name === label) return cached.item
        const item: PolygonItem = { kind: geometry?.type === 'point' ? 'point' : 'polygon', id: graphicId(graphic)!, name: label, color, locked,
          vertices: geometry?.type === 'point' ? [[geometry.x, geometry.y]] : (geometry as Polygon).rings[0]?.slice(0, -1).map(point => [...point]) ?? [],
          vertexCount: geometry?.type === 'point' ? 1 : (geometry as Polygon).rings.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0) }
        cache.set(graphic, { geometry, item })
        return item
      })
      if (items.length === previous.length && items.every((item, index) => item === previous[index])) return previous
      previous = items
      return items
    }
  }
}
