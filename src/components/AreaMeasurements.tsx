import { useEffect, useState } from 'react'
import type { AreaItem } from '../editor/feature-model'
import { measureArea, formatMeasurements, type AreaMeasurements as Measurements } from '../area-measurements'

export function AreaMeasurements({ area }: { area: AreaItem }) {
  const [measurements, setMeasurements] = useState<Measurements | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let current = true
    setMeasurements(null); setFailed(false)
    void measureArea(area).then(value => { if (current) setMeasurements(value) }).catch(() => { if (current) setFailed(true) })
    return () => { current = false }
  }, [area.rings, area.spatialReference.wkid, attempt])
  if (failed) return <div className="area-measurements"><span>Medidas indisponíveis.</span><button type="button" className="secondary" onClick={() => setAttempt(value => value + 1)}>Tentar novamente</button></div>
  if (!measurements) return <p className="area-measurements" role="status">Calculando medidas…</p>
  const formatted = formatMeasurements(measurements)
  return <dl className="area-measurements" aria-label={`Medidas de ${area.name}`}>
    <div><dt>Área</dt><dd>{formatted.area}<small>{formatted.hectares}</small></dd></div>
    <div><dt>Perímetro</dt><dd>{formatted.perimeter}</dd></div>
  </dl>
}
