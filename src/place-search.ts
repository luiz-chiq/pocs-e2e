export interface PlaceResult { label: string; latitude: number; longitude: number; bounds?: [number, number, number, number] }
const cache = new Map<string, { results: PlaceResult[]; time: number }>()
let lastRequest = 0
const numeric = '[+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+)'
const coordinatesPattern = new RegExp(`^(${numeric})(?:\\s*[,;]\\s*|\\s+)(${numeric})$`)
export function coordinateLocation(query: string): PlaceResult | null {
  const match = query.trim().match(coordinatesPattern)
  if (!match) {
    if (/^[+\-\d.,;\s]+$/.test(query) && /[,;\s]/.test(query.trim())) throw new Error('Use latitude, longitude, com ponto decimal. Exemplo: -23.5505, -46.6333.')
    return null
  }
  const latitude = Number(match[1]), longitude = Number(match[2])
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) throw new Error('Latitude deve estar entre -90 e 90; longitude, entre -180 e 180.')
  return { label: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, latitude, longitude }
}
function object(value: unknown): Record<string, unknown> | null { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null }
function photonResult(input: unknown): PlaceResult | null {
  const feature = object(input), geometry = object(feature?.geometry), properties = object(feature?.properties)
  const coordinates = geometry?.coordinates
  if (geometry?.type !== 'Point' || !Array.isArray(coordinates) || coordinates.length < 2 || !coordinates.slice(0, 2).every(item => typeof item === 'number' && Number.isFinite(item))) return null
  const [longitude, latitude] = coordinates as number[]
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180 || !properties) return null
  const street = [properties.street, properties.housenumber].filter(item => typeof item === 'string').join(', ')
  const label = [...new Set([properties.name, street, properties.district, properties.city, properties.state, properties.country].filter((item): item is string => typeof item === 'string' && Boolean(item.trim())))].join(' · ').slice(0, 300)
  if (!label) return null
  const bounds = properties.extent
  const validBounds = Array.isArray(bounds) && bounds.length === 4 && bounds.every(item => typeof item === 'number' && Number.isFinite(item)) && bounds[0] < bounds[2] && bounds[1] < bounds[3] && Math.abs(bounds[0]) <= 180 && Math.abs(bounds[2]) <= 180 && Math.abs(bounds[1]) <= 90 && Math.abs(bounds[3]) <= 90
  return { label, longitude, latitude, ...(validBounds ? { bounds: bounds as PlaceResult['bounds'] } : {}) }
}
/** Consultar apenas no envio do formulário; coordenadas são resolvidas localmente. */
export async function searchPlaces(value: string, signal: AbortSignal): Promise<PlaceResult[]> {
  const query = value.trim().replace(/\s+/g, ' ')
  if (query.length < 2 || query.length > 200) throw new Error('Digite entre 2 e 200 caracteres para buscar.')
  const coordinates = coordinateLocation(query)
  if (coordinates) return [coordinates]
  const key = query.toLocaleLowerCase('pt-BR'), saved = cache.get(key), now = Date.now()
  if (saved && now - saved.time < 600000) return saved.results
  if (now - lastRequest < 1000) throw new Error('Aguarde um instante antes de fazer outra busca.')
  lastRequest = now
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', query); url.searchParams.set('limit', '5'); url.searchParams.set('lang', 'default')
  try {
    const response = await fetch(url, { signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]), credentials: 'omit' })
    if (!response.ok) throw new Error(response.status === 429 ? 'O serviço está ocupado. Aguarde um pouco e tente novamente.' : 'Não foi possível consultar os endereços. Tente novamente.')
    const data: unknown = await response.json(), features = object(data)?.features
    if (!Array.isArray(features)) throw new Error('O serviço retornou uma resposta inválida.')
    const results = features.slice(0, 5).map(photonResult).filter((result): result is PlaceResult => Boolean(result))
    cache.set(key, { results, time: Date.now() })
    if (cache.size > 50) cache.delete(cache.keys().next().value!)
    return results
  } catch (error) {
    if (signal.aborted) throw error
    if (error instanceof DOMException && error.name === 'TimeoutError') throw new Error('A busca demorou demais. Verifique a conexão e tente novamente.')
    if (error instanceof TypeError) throw new Error('Não foi possível acessar a busca. Verifique sua conexão. Coordenadas continuam disponíveis.')
    throw error
  }
}
