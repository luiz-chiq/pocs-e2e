import type Graphic from '@arcgis/core/Graphic.js'
import { shortcutsEnabled } from '../keyboard-settings'
import { shortcutBinding, isSketchShortcut, shortcutKey } from '../shortcuts'
import type { ShortcutId } from '../shortcuts'
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
    const matches = (id: ShortcutId) => shortcutBinding(id, event)
    const modified = event.ctrlKey || event.metaKey || event.altKey
    const listItem = target?.closest<HTMLElement>('.polygon-list > .pin')
    const listGraphic = findGraphic(listItem?.dataset.polygonId ?? null)
    if (shortcutsEnabled() && !modified && !textControl && activeAction === null && listGraphic && matches('listItems')) {
      event.preventDefault()
      event.stopImmediatePropagation()
      const graphics = orderedGraphics().filter(item => item.geometry?.type === listGraphic.geometry?.type)
      const direction = matches('listItems')!.step!
      focusPolygonList(graphics[(graphics.indexOf(listGraphic) + direction + graphics.length) % graphics.length])
      return
    }
    if (!shortcutsEnabled()) {
      // Desligar também os atalhos do SDK no canvas; Tab e ativação de botões
      // continuam disponíveis como navegação acessível, assim como a edição de texto.
      const nativeControl = target?.closest('button, a, summary, input, textarea, select, [role="button"], [contenteditable]:not([contenteditable="false"])')
      const sdkShortcut = isSketchShortcut(event) || (!modified && event.key.toLowerCase() === 'f')
      const historyShortcut = (event.ctrlKey || event.metaKey) && activeAction && (matches('undo') || matches('redo'))
      if (!nativeControl && (sdkShortcut || historyShortcut || (matchMedia('(max-width: 720px)').matches && event.key !== shortcutKey('controlFocus')))) {
        event.preventDefault()
        event.stopImmediatePropagation()
      }
      return
    }
    const deletionTarget = activeGraphic ?? selectedGraphic
    if (matches('remove') && !textControl && activeAction !== 'create' && deletionTarget && !host.hasSelectedVertices()) {
      event.preventDefault()
      // Interceptar antes do SDK remover o desenho ou os vértices selecionados.
      event.stopImmediatePropagation()
      if (!event.repeat) requestDeletion(deletionTarget)
      return
    }
    if (!textControl && (event.ctrlKey || event.metaKey) && (matches('undo') || matches('redo'))) {
      if (!activeAction) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) changeHistory(matches('redo') ? 'redo' : 'undo')
      return
    }
    if (modified) return
    if (!textControl && matches('focusLists')) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || windowMode === 'map') return
      const tab = document.querySelector<HTMLButtonElement>('.sidebar-tabs [aria-selected="true"]')
      if (!tab || tab.disabled) return
      tab.focus({ preventScroll: true })
      requestFocusLists()
      return
    }
    const colorOption = matches('color')
    if (!textControl && colorOption) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (activeAction && !event.repeat && mapInitialized && (windowMode === 'main' || windowConnected)) chooseColor(colorOption.value!)
      return
    }
    if (matches('deleteListItem') && !textControl && activeAction === null && listGraphic) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) requestDeletion(listGraphic)
      return
    }
    if (!textControl && (['create', 'createPoint', 'edit', 'clone', 'lock', 'mapWindow', 'undo', 'redo', 'zoomIn', 'zoomOut', 'north'] as const).some(id => matches(id))) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (event.repeat || !mapInitialized || (windowMode !== 'main' && !windowConnected)) return
      if (matches('create') && activeAction === null) {
        requestCreationMenu()
      }
      if (matches('createPoint') && activeAction === null) drawPoint()
      if (matches('edit') && activeAction === null && (listGraphic ?? selectedGraphic)) void startEditing((listGraphic ?? selectedGraphic)!)
      if (matches('clone') && activeAction === null && selectedGraphic) clonePolygon(selectedGraphic)
      if (matches('lock')) toggleCurrentLock()
      if (matches('mapWindow')) {
        if (windowMode === 'map') host.focusMenu()
        else if (activeAction === null) {
          if (windowMode === 'main') openMapWindow()
          else host.reunite()
        }
      }
      if ((matches('undo') || matches('redo')) && activeAction) changeHistory(matches('undo') ? 'undo' : 'redo')
      if (matches('zoomIn')) { if (mapInitialized && canZoomIn) void navigateMap('zoom-in') }
      if (matches('zoomOut')) { if (mapInitialized && canZoomOut) void navigateMap('zoom-out') }
      if (matches('north') && mapInitialized) void navigateMap('north-up')
      return
    }
    const checkbox = target instanceof HTMLInputElement && (target.type === 'checkbox' || target.type === 'radio')
    if (matches('confirm') && (!control || target?.id === 'polygon-name' || checkbox) && (activeAction !== null || (selectedGraphic && !target?.closest('.polygon-label')))) {
      event.preventDefault()
      event.stopPropagation()
      if (event.repeat) return
      if (activeAction === null && selectedGraphic) {
        void startEditing(selectedGraphic)
        return
      }
      host.finish()
    }
    if (matches('cancel')) {
      event.preventDefault()
      event.stopImmediatePropagation()
      if (!event.repeat) void requestExit()
    }
  }, { capture: true, signal })
}
