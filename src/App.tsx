import { useEffect, useState } from 'react'
import { EditorContext } from './components/EditorContext'
import { Sidebar } from './components/Sidebar'
import { MapPanel } from './components/MapPanel'
import { Dialogs } from './components/Dialogs'
import { useEditor } from './hooks/useEditor'
import { usePwa } from './hooks/usePwa'
import { attachDialogNavigation } from './dialog-navigation'

export function App() {
  const { state, controller, mapRef } = useEditor()
  const pwa = usePwa()
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  useEffect(() => attachDialogNavigation(), [])
  function closeShortcuts() {
    setShortcutsOpen(false)
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#open-keyboard-shortcuts')?.focus({ preventScroll: true }))
  }
  return <EditorContext value={{ state, controller }}>
    <main className="shell" aria-labelledby="page-title"><div className="workspace">
      <Sidebar pwa={pwa} openShortcuts={() => setShortcutsOpen(true)} />
      <MapPanel mapRef={mapRef} />
    </div><div className={`map-status${state.warning ? ' is-warning' : ''}`} aria-live="polite">
      <p id="window-feedback" className="window-feedback" role="alert" hidden={!state.feedback}>{state.feedback}</p>
      <p id="map-instructions" role={state.warning ? 'alert' : undefined}>{state.instructions}</p>
      <p id="last-edit" className="last-edit">{state.lastEdit}</p>
    </div></main>
    <Dialogs pwa={pwa} shortcutsOpen={shortcutsOpen} closeShortcuts={closeShortcuts} />
  </EditorContext>
}
