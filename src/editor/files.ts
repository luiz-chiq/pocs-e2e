import Polygon from '@arcgis/core/geometry/Polygon.js'
import Point from '@arcgis/core/geometry/Point.js'
import { fillPolygonHoles } from '../polygon-rules'
import { createExportDocument, validatePolygonDocument, type ExportFormat } from '../polygon-document'
import type { EditorSnapshot } from './types'
import type { MapCommand, PolygonJSON } from './window-protocol'

interface FileHost {
  getState(): { action: EditorSnapshot['action']; ready: boolean; mode: EditorSnapshot['mode']; connected: boolean; committed: PolygonJSON[] }
  feedback(message: string): void
  clearFeedback(): void
  changed(): void
  sendImport(command: Extract<MapCommand, { type: 'import' }>): boolean
  importPolygons(polygons: PolygonFileData[], fileName: string, mode: 'add' | 'replace'): boolean
}

export function createFileController(host: FileHost) {
  let busy = false
  let dialog: EditorSnapshot['fileDialog'] = null
  let pendingImport: { polygons: PolygonFileData[]; fileName: string } | null = null

  function unavailable() {
    const state = host.getState()
    return busy || Boolean(state.action) || (state.mode !== 'main' && !state.connected)
  }

  async function polygonFileOperation(action: 'import' | 'export') {
    if (!window.polygonFiles || dialog || !host.getState().ready || unavailable()) return
    host.clearFeedback()
    if (action === 'export') {
      if (host.getState().committed.length) dialog = 'export'
      host.changed()
      return
    }
    busy = true
    host.changed()
    try {
      const result = await window.polygonFiles.importPolygons()
      if (result.status === 'cancelled') host.feedback('Importação cancelada.')
      else if (result.status === 'error') host.feedback(result.message)
      else if (result.polygons || result.document) {
        pendingImport = { polygons: validatePolygonDocument(result.document ?? { format: 'poligonos', version: 2, polygons: result.polygons }), fileName: result.fileName }
        dialog = 'import'
      }
    } catch (error) {
      host.feedback(error instanceof Error ? error.message : 'Não foi possível concluir a operação de arquivo. Tente novamente.')
    } finally {
      busy = false
      host.changed()
    }
  }

  function dismissFileDialog() {
    if (busy) return
    dialog = null
    pendingImport = null
    host.changed()
  }

  function confirmImport(mode: 'add' | 'replace') {
    if (dialog !== 'import' || !pendingImport || unavailable()) return
    const command = { type: 'import' as const, ...pendingImport, mode }
    if (host.sendImport(command) || host.importPolygons(command.polygons, command.fileName, mode)) dismissFileDialog()
  }

  async function exportPolygons(ids: string[], format: ExportFormat = 'json') {
    if (!window.polygonFiles || dialog !== 'export' || unavailable()) return
    const selected = new Set(ids)
    const polygons = host.getState().committed.filter(polygon => selected.has(polygon.attributes.polygonId))
    if (!polygons.length || polygons.length !== selected.size) { host.feedback('Selecione as áreas ou pontos que deseja exportar.'); return }
    busy = true
    host.clearFeedback()
    host.changed()
    try {
      const result = await window.polygonFiles.exportDocument(createExportDocument(polygons.map(polygon => ({
        name: polygon.attributes.name, geometry: polygon.geometry?.rings ? fillPolygonHoles(new Polygon(polygon.geometry)).toJSON() : new Point(polygon.geometry).toJSON(),
        ...(polygon.attributes.locked === true ? { locked: true } : {}),
        ...(polygon.attributes.color ? { color: polygon.attributes.color } : {})
      })), format))
      if (result.status === 'success') {
        dialog = null
        host.feedback(`${result.count} área(s) ou ponto(s) exportado(s) para ${result.fileName}.`)
      } else host.feedback(result.status === 'cancelled' ? 'Exportação cancelada.' : result.message)
    } catch (error) { host.feedback(error instanceof Error ? error.message : 'Não foi possível exportar as áreas e pontos.') }
    finally { busy = false; host.changed() }
  }

  return {
    polygonFileOperation, dismissFileDialog, confirmImport, exportPolygons,
    get busy() { return busy },
    get dialog() { return dialog },
    get hasPendingImport() { return pendingImport !== null },
    get pendingImportSummary(): EditorSnapshot['pendingImport'] {
      return pendingImport ? { fileName: pendingImport.fileName, count: pendingImport.polygons.length,
        areaCount: pendingImport.polygons.filter(item => item.geometry.rings).length,
        pointCount: pendingImport.polygons.filter(item => !item.geometry.rings).length } : null
    }
  }
}
