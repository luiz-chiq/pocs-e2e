import { useSyncExternalStore } from 'react'
import { precisionPreferences, setPrecisionPreference, subscribePrecision } from '../precision-settings'

export function PrecisionSettings({ compact = false }: { compact?: boolean }) {
  const preferences = useSyncExternalStore(subscribePrecision, precisionPreferences)
  const controls = <div className="precision-preferences">
    <label><input type="checkbox" checked={preferences.snapping} onChange={event => setPrecisionPreference('snapping', event.target.checked)} /><span>Encaixar em vértices e bordas</span></label>
    <label><input type="checkbox" checked={preferences.magnifier} onChange={event => setPrecisionPreference('magnifier', event.target.checked)} /><span>Lupa ao arrastar no toque</span></label>
  </div>
  return compact ? <details className="precision-details"><summary>Precisão do desenho</summary>{controls}</details>
    : <section className="precision-settings" aria-label="Precisão no mapa"><h4>Precisão no mapa</h4>{controls}</section>
}
