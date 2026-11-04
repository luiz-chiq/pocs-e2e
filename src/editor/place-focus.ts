import Graphic from '@arcgis/core/Graphic.js'
import Point from '@arcgis/core/geometry/Point.js'
import Extent from '@arcgis/core/geometry/Extent.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import SimpleMarkerSymbol from '@arcgis/core/symbols/SimpleMarkerSymbol.js'
import type MapView from '@arcgis/core/views/MapView.js'
import type { PlaceResult } from '../place-search'

export function createPlaceFocus(view: MapView) {
  const layer = new GraphicsLayer({ title: 'Localização da busca', listMode: 'hide' })
  view.map!.add(layer)
  let current: PlaceResult | null = null
  function set(result: PlaceResult | null) {
    const same = current?.latitude === result?.latitude && current?.longitude === result?.longitude
    current = result
    if (same) return
    layer.removeAll()
    if (result) layer.add(new Graphic({ geometry: new Point({ latitude: result.latitude, longitude: result.longitude }), symbol: new SimpleMarkerSymbol({ style: 'diamond', size: 18, color: '#da583c', outline: { color: '#ffffff', width: 2 } }) }))
  }
  return {
    get current() { return current }, set,
    async locate(result: PlaceResult) {
      set(result)
      const bounds = result.bounds
      if (bounds && bounds[2] - bounds[0] > .0001 && bounds[3] - bounds[1] > .0001) {
        await view.goTo(new Extent({ xmin: bounds[0], ymin: bounds[1], xmax: bounds[2], ymax: bounds[3], spatialReference: { wkid: 4326 } }).expand(1.2))
      } else await view.goTo({ center: [result.longitude, result.latitude], zoom: Math.max(view.zoom, 16) })
    },
    destroy() { view.map?.remove(layer); layer.destroy() }
  }
}
