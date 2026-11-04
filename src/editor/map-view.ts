import Map from '@arcgis/core/Map.js'
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import TileLayer from '@arcgis/core/layers/TileLayer.js'
import MapView from '@arcgis/core/views/MapView.js'
import SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js'
import HighlightOptions from '@arcgis/core/views/support/HighlightOptions.js'
import { defaultPolygonColor } from '../polygon-rules'
import { pointSymbol, polygonSymbol } from './features'

export function createMapView(container: HTMLDivElement) {
  const layer = new GraphicsLayer({ title: 'Áreas' })
  const map = new Map({
    basemap: {
      title: 'Satélite — Esri World Imagery',
      baseLayers: [new TileLayer({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer',
        title: 'Esri World Imagery'
      })]
    },
    layers: [layer]
  })
  const view = new MapView({ container, map, center: [-46.6333, -23.5505], zoom: 11, constraints: { snapToZoom: false } })
  view.highlights.push(new HighlightOptions({ name: 'polygon-selection', color: '#ffffff', haloColor: '#ffffff', haloOpacity: 1, fillOpacity: 0 }))
  const sketch = new SketchViewModel({
    view,
    layer,
    updateOnGraphicClick: false,
    polygonSymbol: polygonSymbol(defaultPolygonColor),
    pointSymbol: pointSymbol(defaultPolygonColor),
    defaultUpdateOptions: { tool: 'reshape', toggleToolOnClick: false }
  })
  return { layer, view, sketch }
}
