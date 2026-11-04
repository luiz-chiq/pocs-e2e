import Polygon from '@arcgis/core/geometry/Polygon.js'
import * as areaOperator from '@arcgis/core/geometry/operators/geodeticAreaOperator.js'
import * as lengthOperator from '@arcgis/core/geometry/operators/geodeticLengthOperator.js'
import type { AreaItem } from './editor/feature-model'

export interface AreaMeasurements { squareMeters: number; hectares: number; perimeterMeters: number }
let loading: Promise<unknown> | null = null
export async function measureArea(area: AreaItem): Promise<AreaMeasurements> {
  if (!areaOperator.isLoaded() || !lengthOperator.isLoaded()) {
    loading ??= Promise.all([areaOperator.load(), lengthOperator.load()]).catch(error => { loading = null; throw error })
    await loading
  }
  const geometry = new Polygon({ rings: area.rings, spatialReference: area.spatialReference })
  const squareMeters = Math.abs(areaOperator.execute(geometry, { unit: 'square-meters' }))
  const perimeterMeters = Math.abs(lengthOperator.execute(geometry, { unit: 'meters' }))
  if (!Number.isFinite(squareMeters) || !Number.isFinite(perimeterMeters)) throw new Error('Medidas indisponíveis para esta área.')
  return { squareMeters, hectares: squareMeters / 10000, perimeterMeters }
}
const number = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const hectares = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 })
export function formatMeasurements(value: AreaMeasurements) {
  return { area: `${number.format(value.squareMeters)} m²`, hectares: `${hectares.format(value.hectares)} ha`,
    perimeter: value.perimeterMeters >= 1000 ? `${number.format(value.perimeterMeters / 1000)} km` : `${number.format(value.perimeterMeters)} m` }
}
