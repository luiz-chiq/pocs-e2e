import { createContext, useContext, useSyncExternalStore } from 'react'
import type { EditorController } from '../editor/createEditor'
import type { EditorSnapshot } from '../editor/types'
import { setShortcutsEnabled, shortcutsEnabled, subscribeShortcuts } from '../keyboard-settings'
export const EditorContext = createContext<{ state: EditorSnapshot; controller: EditorController | null } | null>(null)
export function useEditorContext() {
  const value = useContext(EditorContext)
  if (!value) throw new Error('Os controles precisam do editor de polígonos.')
  return { ...value, actions: value.controller?.actions }
}
export function useShortcuts() {
  const enabled = useSyncExternalStore(subscribeShortcuts, shortcutsEnabled)
  return { enabled, setEnabled: setShortcutsEnabled }
}
