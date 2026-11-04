import type MapView from '@arcgis/core/views/MapView.js'
import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import type SketchViewModel from '@arcgis/core/widgets/Sketch/SketchViewModel.js'
import SnappingOptions from '@arcgis/core/views/interactive/snapping/SnappingOptions.js'
import { precisionPreferences, subscribePrecision } from '../precision-settings'

export function attachPrecision(view: MapView, layer: GraphicsLayer, sketch: SketchViewModel) {
  sketch.snappingOptions = new SnappingOptions({ featureSources: [{ layer, enabled: true }], distance: 15 })
  view.magnifier.visible = false
  view.magnifier.factor = 2
  view.magnifier.size = 112
  let dragging = false
  let frame: number | null = null
  function apply() {
    const preferences = precisionPreferences()
    sketch.snappingOptions.enabled = preferences.snapping
    sketch.snappingOptions.featureEnabled = preferences.snapping
    sketch.snappingOptions.selfEnabled = preferences.snapping
    if (!preferences.magnifier) view.magnifier.visible = false
  }
  apply()
  const unsubscribe = subscribePrecision(apply)
  const update = sketch.on('update', event => {
    const type = event.toolEventInfo?.type
    if (type === 'move-start' || type === 'reshape-start') dragging = true
    if (event.state === 'complete' || type === 'move-stop' || type === 'reshape-stop') { dragging = false; view.magnifier.visible = false }
  })
  const cancel = sketch.on('create', () => { dragging = false; view.magnifier.visible = false })
  const drag = view.on('drag', event => {
    if (event.action === 'end') { view.magnifier.visible = false; return }
    if (!matchMedia('(pointer: coarse), (max-width: 720px)').matches) return
    const { x, y } = event
    if (frame !== null) cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      frame = null
      view.magnifier.visible = dragging && precisionPreferences().magnifier
      view.magnifier.position = { x, y }
      view.magnifier.offset = { x: x < 70 ? 60 : x > view.width - 70 ? -60 : 0, y: y < 150 ? 90 : -90 }
    })
  })
  return () => {
    unsubscribe(); update.remove(); cancel.remove(); drag.remove()
    if (frame !== null) cancelAnimationFrame(frame)
    view.magnifier.visible = false
  }
}
