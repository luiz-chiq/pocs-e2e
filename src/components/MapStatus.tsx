import { useEditorContext } from './EditorContext'

export function MapStatus() {
  const { state } = useEditorContext()
  return <div className={`map-status${state.warning ? ' is-warning' : ''}`} aria-live="polite">
    <p id="window-feedback" className="window-feedback" role="alert" hidden={!state.feedback}>{state.feedback}</p>
    <p id="map-instructions" role={state.warning ? 'alert' : undefined}>{state.instructions}</p>
    <p id="last-edit" className="last-edit">{state.lastEdit}</p>
  </div>
}
