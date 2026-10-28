import { useEffect, useState } from 'react'
import { EditorContext } from './components/EditorContext'
import { Sidebar } from './components/Sidebar'
import { DetachedControls } from './components/DetachedControls'
import { MapStatus } from './components/MapStatus'
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
      {state.mode === 'detached' && <DetachedControls openShortcuts={() => setShortcutsOpen(true)} />}
      <Sidebar pwa={pwa} openShortcuts={() => setShortcutsOpen(true)} />
      <MapPanel mapRef={mapRef} />
    </div>
      {state.mode !== 'detached' && <MapStatus />}
    </main>
    <Dialogs pwa={pwa} shortcutsOpen={shortcutsOpen} closeShortcuts={closeShortcuts} />
  </EditorContext>
}
