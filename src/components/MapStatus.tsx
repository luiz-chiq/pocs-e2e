import { useEditorContext } from './EditorContext'

export function MapStatus() {
  const { state, actions } = useEditorContext()
  return <div className={`map-status${state.warning ? ' is-warning' : ''}`} aria-live="polite">
    {(state.saveStatus === 'error' || state.saveStatus === 'degraded') && <div className="save-warning" role="alert"><p>{state.saveMessage}</p><button type="button" className="secondary" onClick={() => actions?.retrySave()}>Tentar novamente</button></div>}
    <p id="window-feedback" className="window-feedback" role="alert" hidden={!state.feedback}>{state.feedback}</p>
    <p id="map-instructions" role={state.warning ? 'alert' : undefined}>{state.instructions}</p>
    <p id="last-edit" className="last-edit">{state.lastEdit}</p>
  </div>
}
