import { useEffect, useLayoutEffect, useState } from 'react'
import { EditorContext } from './components/EditorContext'
import { Sidebar } from './components/Sidebar'
import { DetachedControls } from './components/DetachedControls'
import { MapStatus } from './components/MapStatus'
import { MapPanel } from './components/MapPanel'
import { Dialogs } from './components/Dialogs'
import { useEditor } from './hooks/useEditor'
import { attachDialogNavigation } from './dialog-navigation'
import { useCompactLayout } from './hooks/useCompactLayout'
import { MobileNavigation } from './components/MobileNavigation'

export function App() {
  const { state, controller, mapRef } = useEditor()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const compact = useCompactLayout()
  const mobile = compact && state.mode === 'main'
  useLayoutEffect(() => { setMobileMenuOpen(false) }, [state.action, state.activeId])
  useLayoutEffect(() => { if (state.focusedValidationId) setMobileMenuOpen(false) }, [state.focusedValidationId])
  useEffect(() => attachDialogNavigation(), [])
  function closeSettings() {
    setSettingsOpen(false)
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#open-settings')?.focus({ preventScroll: true }))
  }
  return <EditorContext value={{ state, controller }}>
    <main className={`shell${mobile ? ' is-mobile-layout' : ''}`} aria-labelledby="page-title"><div className="workspace">
      {state.mode === 'detached' && <DetachedControls />}
      <Sidebar mobile={mobile} mobileOpen={mobileMenuOpen} openMobile={() => setMobileMenuOpen(true)} closeMobile={() => setMobileMenuOpen(false)} openSettings={() => setSettingsOpen(true)} />
      <MapPanel mapRef={mapRef} compact={compact} onMapInteract={() => { if (mobile) setMobileMenuOpen(false) }} />
    </div>
      {state.mode !== 'detached' && <MapStatus />}
      {mobile && <MobileNavigation open={mobileMenuOpen} toggle={() => setMobileMenuOpen(open => !open)} openSettings={() => setSettingsOpen(true)} />}
    </main>
    <Dialogs settingsOpen={settingsOpen} closeSettings={closeSettings} />
  </EditorContext>
}
