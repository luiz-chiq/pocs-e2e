import type GraphicsLayer from '@arcgis/core/layers/GraphicsLayer.js'
import { groupOverlappingPolygons, isPolygonColor } from '../polygon-rules'
import { featureSymbol, graphicId, isLocked } from './features'
import type { MapCommand } from './window-protocol'

interface BatchHost {
  layer: GraphicsLayer
  unavailable(): boolean
  send(command: MapCommand): boolean
  singleId(): string | null
  resetSingle(): void
  commit(groups?: ReturnType<typeof groupOverlappingPolygons>): void
  message(text: string, warning?: boolean): void
  changed(): void
}
export function createBatchSelection(host: BatchHost) {
  let active = false
  let ids = new Set<string>()
  let pending: string[] | null = null
  const selected = () => host.layer.graphics.toArray().filter(graphic => ids.has(graphicId(graphic)!))
  const changed = (message?: string) => { if (message) host.message(message); host.changed() }
  function reset() { active = false; ids.clear(); pending = null }
  function setMode(enabled: boolean) {
    if (host.unavailable() || host.send({ type: 'batch-mode', enabled })) return
    const current = host.singleId()
    if (!enabled) reset()
    else { active = true; if (current) ids.add(current) }
    host.resetSingle()
    changed(enabled ? 'Marque áreas e pontos nas listas ou no mapa. As ações serão aplicadas aos itens selecionados.' : 'Seleção múltipla encerrada.')
  }
  function toggle(id: string) {
    if (host.unavailable() || host.send({ type: 'batch-toggle', id }) || !host.layer.graphics.some(graphic => graphicId(graphic) === id)) return
    if (!active) { const current = host.singleId(); active = true; if (current) ids.add(current); host.resetSingle() }
    if (ids.has(id)) ids.delete(id); else ids.add(id)
    changed(`${ids.size} elemento(s) selecionado(s).`)
  }
  function selectMany(values: string[], checked: boolean) {
    if (!active || host.unavailable() || host.send({ type: 'batch-select', ids: values, checked })) return
    const available = new Set(host.layer.graphics.map(graphicId).toArray())
    values.forEach(id => { if (available.has(id)) { if (checked) ids.add(id); else ids.delete(id) } })
    changed(`${ids.size} elemento(s) selecionado(s).`)
  }
  function clear() { ids.clear(); pending = null }
  function color(value: string) {
    if (!active || host.unavailable() || !isPolygonColor(value) || host.send({ type: 'batch-color', value })) return
    const targets = selected(), editable = targets.filter(graphic => !isLocked(graphic))
    if (!editable.length) { host.message('Destrave os itens selecionados antes de alterar a cor.', true); host.changed(); return }
    let groups: ReturnType<typeof groupOverlappingPolygons>
    try {
      groups = groupOverlappingPolygons(host.layer.graphics.toArray().filter(graphic => graphic.geometry?.type === 'polygon'), undefined, new Map(editable.map(graphic => [graphic, value])))
    } catch { host.message('Não foi possível preparar a mudança de cor. Nenhum elemento foi alterado.', true); host.changed(); return }
    const nextIds = new Set(targets.filter(graphic => graphic.geometry?.type === 'point').map(graphic => graphicId(graphic)!))
    groups.forEach(group => { if (group.members.some(member => ids.has(graphicId(member)!))) nextIds.add(graphicId(group.survivor)!) })
    editable.filter(graphic => graphic.geometry?.type === 'point').forEach(graphic => { graphic.attributes = { ...graphic.attributes, color: value }; graphic.symbol = featureSymbol(graphic, value) })
    ids = nextIds
    host.commit(groups)
    changed(`Cor alterada em ${editable.length} elemento(s).${targets.length > editable.length ? ` ${targets.length - editable.length} travado(s) preservado(s).` : ''} Áreas sobrepostas da mesma cor são fundidas.`)
  }
  function lock(locked: boolean) {
    if (!active || host.unavailable() || host.send({ type: 'batch-lock', locked })) return
    const targets = selected()
    if (!targets.length) return
    targets.forEach(graphic => { graphic.attributes = { ...graphic.attributes, locked } })
    host.commit()
    changed(`${targets.length} elemento(s) ${locked ? 'travado(s)' : 'destravado(s)'}.`)
  }
  function requestDeletion() {
    if (!active || host.unavailable() || host.send({ type: 'batch-request-delete' })) return
    pending = selected().map(graphic => graphicId(graphic)!)
    if (!pending.length) pending = null
    host.changed()
  }
  function dismissDeletion() { if (host.send({ type: 'batch-dismiss-delete' })) return; pending = null; host.changed() }
  function confirmDeletion() {
    if (!pending || host.unavailable() || host.send({ type: 'batch-confirm-delete' })) return
    const targets = host.layer.graphics.toArray().filter(graphic => pending!.includes(graphicId(graphic)!))
    host.layer.removeMany(targets)
    targets.forEach(graphic => ids.delete(graphicId(graphic)!))
    pending = null
    if (!host.layer.graphics.length) reset()
    host.commit()
    changed(`${targets.length} elemento(s) removido(s).`)
  }
  return {
    get active() { return active }, has: (id: string) => ids.has(id), get size() { return ids.size }, get ids() { return [...ids] }, get pending() { return pending },
    setMode, toggle, selectMany, clear, reset, color, lock, requestDeletion, dismissDeletion, confirmDeletion,
    adopt(mode: boolean, selectedIds: string[], deletion: string[] | null) { active = mode; ids = new Set(selectedIds); pending = deletion },
    prune() {
      const available = new Set(host.layer.graphics.map(graphicId).toArray())
      ids.forEach(id => { if (!available.has(id)) ids.delete(id) })
      if (pending) { pending = pending.filter(id => available.has(id)); if (!pending.length) pending = null }
    }
  }
}
