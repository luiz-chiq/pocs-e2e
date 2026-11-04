import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react'
import { useEditorContext } from './EditorContext'

export function SpatialValidation() {
  const { state, actions } = useEditorContext()
  if (!state.ready) return null
  const errors = state.validationIssues.filter(issue => issue.severity === 'error').length
  const warnings = state.validationIssues.length - errors
  return <section className="spatial-validation" aria-labelledby="spatial-validation-title" aria-live="polite" aria-atomic="true">
    <h2 id="spatial-validation-title">Validação automática</h2>
    {state.validationIssues.length ? <>
      <p className="validation-summary">{errors > 0 && <span className="validation-error">{errors} erro(s)</span>}{warnings > 0 && <span className="validation-warning">{warnings} alerta(s)</span>}</p>
      <ul>{state.validationIssues.map(issue => <li key={issue.id} className={`validation-${issue.severity}`}><button className="validation-focus" type="button" aria-label={`Localizar: ${issue.message}`} aria-pressed={state.focusedValidationId === issue.id} disabled={Boolean(state.action)} onClick={() => void actions?.focusValidation(issue.id)}>
        {issue.severity === 'error' ? <CircleAlert aria-hidden="true" /> : <TriangleAlert aria-hidden="true" />}
        <div><strong>{issue.severity === 'error' ? 'Erro' : 'Alerta'}</strong><p>{issue.message}</p></div></button>
      </li>)}</ul>
    </> : <p className="validation-ok"><CircleCheck aria-hidden="true" />Nenhum ponto dentro de uma área.</p>}
  </section>
}
