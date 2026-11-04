import type Graphic from '@arcgis/core/Graphic.js'
import { shortcutsEnabled } from '../keyboard-settings'
import { polygonPalette } from '../polygon-rules'
import type { EditorSnapshot } from './types'

interface KeyboardHost {
  getState(): {
    activeAction: EditorSnapshot['action']; activeGraphic: Graphic | null; selectedGraphic: Graphic | null
    windowMode: EditorSnapshot['mode']; windowConnected: boolean; mapInitialized: boolean
    canZoomIn: boolean; canZoomOut: boolean
  }
  findGraphic(id: string | null): Graphic | null
  orderedGraphics(): Graphic[]
  focusPolygonList(graphic?: Graphic): void
  hasSelectedVertices(): boolean
  requestDeletion(graphic: Graphic): void
  changeHistory(action: 'undo' | 'redo'): void
  requestFocusLists(): void
  chooseColor(color: string): void
  requestCreationMenu(): void
  drawPoint(): void
  startEditing(graphic: Graphic): Promise<void>
  clonePolygon(graphic: Graphic): void
  toggleCurrentLock(): void
  openMapWindow(): void
  focusMenu(): void
  reunite(): void
  navigateMap(action: 'zoom-in' | 'zoom-out' | 'north-up'): Promise<void>
  finish(): void
  requestExit(): Promise<void>
}

export function attachEditorKeyboard(host: KeyboardHost, signal: AbortSignal) {
  const { findGraphic, orderedGraphics, focusPolygonList, requestDeletion, changeHistory,
    requestFocusLists, chooseColor, requestCreationMenu, drawPoint, startEditing, clonePolygon,
    toggleCurrentLock, openMapWindow, navigateMap, requestExit } = host
  window.addEventListener('keydown', (event) => {
    const { activeAction, activeGraphic, selectedGraphic, windowMode, windowConnected, mapInitialized, canZoomIn, canZoomOut } = host.getState()
    const target = event.target instanceof Element ? event.target : null
    if (target?.closest('dialog') || event.isComposing) return
    const control = target?.closest('button, a, summary, input, textarea, select, [contenteditable]:not([contenteditable="false"])')
    const textControl = target?.closest('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, select, [contenteditable]:not([contenteditable="false"])')
    const key = event.key.toLowerCase()
    const modified = event.ctrlKey || event.metaKey || event.altKey
    const listItem = target?.closest<HTMLElement>('.polygon-list > .pin')
    const listGraphic = findGraphic(listItem?.dataset.polygonId ?? null)
    if (shortcutsEnabled() && !modified && !textControl && activeAction === null && listGraphic && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const graphics = orderedGraphics().filter(item => item.geometry?.type === listGraphic.geometry?.type)
      const direction = event.key === 'ArrowUp' ? -1 : 1
      focusPolygonList(graphics[(graphics.indexOf(listGraphic) + direction + graphics.length) % graphics.length])
      return
    }
    if (!shortcutsEnabled()) {
      // Desligar também os atalhos do SDK no canvas; Tab e ativação de botões
      // continuam disponíveis como navegação acessível, assim como a edição de texto.
      const nativeControl = target?.closest('button, a, summary, input, textarea, select, [role="button"], [contenteditable]:not([contenteditable="false"])')
      const sdkShortcut = key === 'delete' || key === 'backspace' || (!modified && ['enter', 'escape', 'z', 'r', 'f', '+', '=', '-', '0', 'h'].includes(key))
      const historyShortcut = (event.ctrlKey || event.metaKey) && activeAction && (key === 'z' || key === 'y')
      if (!nativeControl && (sdkShortcut || historyShortcut || (matchMedia('(max-width: 720px)').matches && event.key !== 'Tab'))) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      return
    }
    const deletionTarget = activeGraphic ?? selectedGraphic
    if ((event.key === 'Delete' || event.key === 'Backspace') && !textControl && activeAction !== 'create' && deletionTarget && !host.hasSelectedVertices()) {
      event.preventDefault()
      // Interceptar antes do SDK remover o desenho ou os vértices selecionados.
      event.stopImmediatePropagation()
      if (!event.repeat) requestDeletion(deletionTarget)
      return
    }
    if (!textControl && !event.altKey && (event.ctrlKey || event.metaKey) && (key === 'z' || key === 'y')) {
      if (!activeAction) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) changeHistory(key === 'y' || event.shiftKey ? 'redo' : 'undo')
      return
    }
    if (modified) return
    if (!textControl && key === 'l') {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || windowMode === 'map') return
      const tab = document.querySelector<HTMLButtonElement>('.sidebar-tabs [aria-selected="true"]')
      if (!tab || tab.disabled) return
      tab.focus({ preventScroll: true })
      requestFocusLists()
      return
    }
    const colorOption = polygonPalette.find(([, , shortcut]) => !event.shiftKey && key === shortcut)
    if (!textControl && colorOption) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (activeAction && !event.repeat && mapInitialized && (windowMode === 'main' || windowConnected)) chooseColor(colorOption[1])
      return
    }
    if (key === 'd' && !textControl && activeAction === null && listGraphic) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) requestDeletion(listGraphic)
      return
    }
    if (!textControl && ['n', 'p', 'e', 'c', 't', 'm', 'z', 'r', '+', '=', '-', 'h'].includes(key)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || !mapInitialized || (windowMode !== 'main' && !windowConnected)) return
      if (key === 'n' && activeAction === null) {
        requestCreationMenu()
      }
      if (key === 'p' && activeAction === null) drawPoint()
      if (key === 'e' && activeAction === null && (listGraphic ?? selectedGraphic)) void startEditing((listGraphic ?? selectedGraphic)!)
      if (key === 'c' && activeAction === null && selectedGraphic) clonePolygon(selectedGraphic)
      if (key === 't') toggleCurrentLock()
      if (key === 'm') {
        if (windowMode === 'map') host.focusMenu()
        else if (activeAction === null) {
          if (windowMode === 'main') openMapWindow()
          else host.reunite()
        }
      }
      if ((key === 'z' || key === 'r') && activeAction) changeHistory(key === 'z' ? 'undo' : 'redo')
      if (key === '+' || key === '=') { if (mapInitialized && canZoomIn) void navigateMap('zoom-in') }
      if (key === '-') { if (mapInitialized && canZoomOut) void navigateMap('zoom-out') }
      if (key === 'h' && mapInitialized) void navigateMap('north-up')
      return
    }
    const checkbox = target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')
    if (event.key === 'Enter' && (!control || target?.id === 'polygon-name' || checkbox) && (activeAction !== null || (selectedGraphic && !target?.closest('.polygon-label')))) {
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat) return
      if (activeAction === null && selectedGraphic) {
        void startEditing(selectedGraphic)
        return
      }
      host.finish()
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) void requestExit()
    }
  }, { capture: true, signal })
}
