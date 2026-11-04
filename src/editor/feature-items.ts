import type Graphic from '@arcgis/core/Graphic.js'
import type { FeatureItem, Position } from './feature-model'
import { graphicId, isLocked, polygonColor } from './features'

export function featureItem(graphic: Graphic, name: string): FeatureItem | null {
  const base = { id: graphicId(graphic)!, name, color: polygonColor(graphic), locked: isLocked(graphic) }
  const geometry = graphic.geometry
  switch (geometry?.type) {
    case 'point': {
      const position: Position = [geometry.x, geometry.y]
      return { ...base, kind: 'point', position, vertices: [position], vertexCount: 1 }
    }
    case 'polygon': {
      const rings = geometry.rings.map(ring => ring.map(point => [...point]))
      return { ...base, kind: 'polygon', rings, vertices: rings[0]?.slice(0, -1) ?? [],
        vertexCount: rings.reduce((sum, ring) => sum + Math.max(0, ring.length - 1), 0) }
    }
    default: return null
  }
}
export function createFeatureItems() {
  const cache = new WeakMap<Graphic, { geometry: Graphic['geometry']; item: FeatureItem }>()
  let previous: FeatureItem[] = []
  return {
    invalidate: (graphic: Graphic) => cache.delete(graphic),
    build(graphics: Graphic[], name: (graphic: Graphic) => string) {
      const items = graphics.flatMap(graphic => {
        const geometry = graphic.geometry, color = polygonColor(graphic), locked = isLocked(graphic), label = name(graphic)
        const cached = cache.get(graphic)
        if (cached && cached.geometry === geometry && cached.item.color === color && cached.item.locked === locked && cached.item.name === label) return [cached.item]
        const item = featureItem(graphic, label)
        if (!item) return []
        cache.set(graphic, { geometry, item })
        return [item]
      })
      if (items.length === previous.length && items.every((item, index) => item === previous[index])) return previous
      previous = items
      return items
    }
  }
}
