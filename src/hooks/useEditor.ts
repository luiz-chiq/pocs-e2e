import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createEditor, type EditorController } from '../editor/createEditor'
import { initialEditorSnapshot } from '../editor/types'

const emptySubscribe = () => () => {}
const emptySnapshot = () => initialEditorSnapshot

export function useEditor() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [controller, setController] = useState<EditorController | null>(null)
  useEffect(() => {
    if (!mapRef.current) return
    const editor = createEditor(mapRef.current)
    setController(editor)
    return () => editor.destroy()
  }, [])
  const state = useSyncExternalStore(controller?.subscribe ?? emptySubscribe, controller?.getSnapshot ?? emptySnapshot)
  useLayoutEffect(() => {
    document.body.classList.toggle('map-window', state.mode === 'map')
    document.body.classList.toggle('map-detached', state.mode === 'detached')
    document.title = state.mode === 'map' ? 'Mapa — Polígonos' : 'Polígonos no mapa'
    return () => { document.body.classList.remove('map-window', 'map-detached') }
  }, [state.mode])
  useLayoutEffect(() => {
    const focus = state.focusRequest
    if (!focus || document.querySelector('dialog[open]')) return
    const element = focus.kind === 'name' ? document.querySelector<HTMLInputElement>('#polygon-name')
      : [...document.querySelectorAll<HTMLElement>('[data-testid="polygon-item"]')]
        .find(item => item.dataset.polygonId === focus.id)?.querySelector<HTMLElement>('.polygon-label')
    element?.focus({ preventScroll: true })
    if (focus.kind === 'polygon') element?.scrollIntoView({ block: 'nearest' })
  }, [state.focusRequest])
  return { state, controller, mapRef }
}
