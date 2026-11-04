import { useEffect, useRef, useState } from 'react'
import { MapPin, Search, X } from 'lucide-react'
import { searchPlaces, type PlaceResult } from '../place-search'
import { useEditorContext } from './EditorContext'

export function PlaceSearchButton() {
  const { state, actions } = useEditorContext()
  return <div className="map-search-tools" hidden={Boolean(state.action)}>
    <button type="button" className="secondary icon-button" aria-label="Buscar endereço ou coordenadas" aria-haspopup="dialog" aria-controls="search-dialog" disabled={!state.ready || state.projectsBusy} onClick={() => actions?.requestSearch()}><Search aria-hidden="true" /></button>
    {state.searchLocation && <button type="button" className="secondary icon-button" aria-label="Remover marcador da busca" title="Remover marcador da busca" onClick={() => actions?.clearSearch()}><X aria-hidden="true" /></button>}
  </div>
}
export function PlaceSearchContent() {
  const { state, actions } = useEditorContext()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => { if (!state.searchDialogOpen) { request.current?.abort(); setBusy(false) } return () => request.current?.abort() }, [state.searchDialogOpen])
  useEffect(() => { setQuery(''); setResults([]); setSearched(false); setError('') }, [state.activeProjectId])
  async function submit() {
    request.current?.abort()
    const controller = new AbortController(); request.current = controller
    setBusy(true); setError(''); setResults([]); setSearched(false)
    try { const found = await searchPlaces(query, controller.signal); if (!controller.signal.aborted) { setResults(found); setSearched(true) } }
    catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Não foi possível buscar este local.') }
    finally { if (!controller.signal.aborted) setBusy(false) }
  }
  return <>
    <p id="search-description">Encontre um endereço ou digite latitude, longitude. Exemplo: -23.5505, -46.6333.</p>
    <form className="place-search-form" onSubmit={event => { event.preventDefault(); void submit() }}>
      <label className="visually-hidden" htmlFor="place-query">Endereço ou coordenadas</label>
      <input id="place-query" type="search" maxLength={200} autoComplete="off" value={query} placeholder="Endereço ou latitude, longitude" onChange={event => { request.current?.abort(); setBusy(false); setQuery(event.target.value); setResults([]); setError(''); setSearched(false) }} />
      <button type="submit" disabled={busy || query.trim().length < 2}><Search aria-hidden="true" /><span>{busy ? 'Buscando…' : 'Buscar'}</span></button>
    </form>
    <div role="status" aria-live="polite">{busy ? 'Consultando endereços…' : searched ? results.length ? `${results.length} resultado(s). Escolha um local para mostrar no mapa.` : 'Nenhum local encontrado. Tente informar também a cidade.' : ''}</div>
    {error && <p role="alert" className="project-error">{error}</p>}
    <ul className="place-results">{results.map((result, index) => <li key={`${result.latitude}-${result.longitude}-${index}`}><button type="button" className="secondary" onClick={() => void actions?.locateSearch(result)}><MapPin aria-hidden="true" /><span>{result.label}</span></button></li>)}</ul>
    <p className="place-attribution">Endereços: <a href="https://photon.komoot.io" target="_blank" rel="noopener noreferrer">Photon</a> · © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>. A consulta ocorre ao buscar. Coordenadas funcionam sem internet.</p>
  </>
}
