import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { polygonPalette } from '../polygon-rules'
import { useEditorContext } from './EditorContext'

export function NameEditor() {
  const { state, actions } = useEditorContext()
  const editor = useRef<HTMLDivElement>(null)
  const tooltip = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  useLayoutEffect(() => {
    if (!state.nameHint) { if (editor.current) editor.current.style.paddingBottom = ''; return }
    function position() {
      if (!input.current || !tooltip.current || !editor.current) return
      const box = input.current.getBoundingClientRect()
      const width = Math.min(280, innerWidth - 24)
      tooltip.current.style.width = `${width}px`
      tooltip.current.style.left = `${Math.min(Math.max(12, box.left), innerWidth - width - 12)}px`
      const height = tooltip.current.getBoundingClientRect().height
      editor.current.style.paddingBottom = `${height + 7}px`
      tooltip.current.style.top = `${box.bottom + height + 12 < innerHeight ? box.bottom + 7 : Math.max(8, box.top - height - 7)}px`
    }
    position()
    const lifetime = new AbortController()
    window.addEventListener('resize', position, { signal: lifetime.signal })
    window.addEventListener('scroll', position, { capture: true, signal: lifetime.signal })
    return () => lifetime.abort()
  }, [state.nameHint])
  return <div id="polygon-name-editor" className="polygon-name-editor" ref={editor}>
    <input ref={input} id="polygon-name" type="text" maxLength={30} required autoComplete="off" spellCheck={false}
      aria-label="Nome do polígono" placeholder="Nome" value={state.draftName} aria-invalid={Boolean(state.nameError)}
      aria-describedby={state.nameHint ? 'polygon-name-error' : undefined}
      onChange={event => actions?.rename(event.target.value)} onKeyDown={event => event.stopPropagation()} />
    {createPortal(<div ref={tooltip} id="polygon-name-error" className={`name-tooltip${state.nameError ? ' is-error' : ''}`} role="tooltip" hidden={!state.nameHint}>{state.nameHint}</div>, document.body)}
  </div>
}
export function PolygonEditor() {
  const { state, actions } = useEditorContext()
  if (!state.action || state.deletedEditId) return null
  return <>
    <div id="polygon-color-editor" className="polygon-color-editor" role="group" aria-label="Cor do polígono">
      <span>Cor</span><div id="polygon-color-options" className="polygon-color-options">
        {polygonPalette.map(([name, color]) => <button key={color} type="button" className="color-swatch" data-color={color}
          aria-label={name} title={name} aria-pressed={state.draftColor === color} style={{ '--swatch-color': color } as CSSProperties} onClick={() => actions?.chooseColor(color)} />)}
      </div>
    </div>
    <label id="polygon-lock-editor" className="polygon-lock-editor">
      <input id="polygon-locked" type="checkbox" checked={state.draftLocked} onChange={event => actions?.lockDraft(event.target.checked)} />
      <span>Travar ao salvar<small>Para editar novamente, destrave pelo cadeado na lista.</small></span>
    </label>
    {state.mode === 'map' && state.action === 'update' && <NameEditor />}
  </>
}
