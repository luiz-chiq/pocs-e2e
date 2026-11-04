import { createId } from '../detached-map'
import { listStoredKeys, loadStoredValue, persistStoredValue, loadPersistedPolygons, type SaveResult } from './storage'
import type { PolygonJSON, MapState } from './window-protocol'

export interface ProjectSummary { id: string; name: string; areaCount: number; pointCount: number; updatedAt: number }
interface ProjectRecord { version: 1; id: string; name: string; updatedAt: number; polygons: PolygonJSON[]; viewpoint: MapState['viewpoint'] }
const prefix = 'mapa-project:'
const activeKey = 'mapa-active-project'
function isProject(value: unknown): value is ProjectRecord {
  return typeof value === 'object' && value !== null && 'version' in value && value.version === 1 && 'id' in value && typeof value.id === 'string' &&
    'name' in value && typeof value.name === 'string' && value.name.trim().length > 0 && 'polygons' in value && Array.isArray(value.polygons) &&
    'updatedAt' in value && typeof value.updatedAt === 'number' && 'viewpoint' in value
}
function summary(project: ProjectRecord): ProjectSummary {
  return { id: project.id, name: project.name, updatedAt: project.updatedAt,
    areaCount: project.polygons.filter(item => Array.isArray(item.geometry?.rings)).length,
    pointCount: project.polygons.filter(item => !Array.isArray(item.geometry?.rings)).length }
}
function projectName(name: string) {
  const normalized = name.trim().replace(/\s+/g, ' ')
  if (!normalized || [...normalized].length > 60) throw new Error('Use um nome de projeto com 1 a 60 caracteres.')
  return normalized
}
export function createProjectStore(changed: () => void) {
  let projects: ProjectSummary[] = []
  let active: ProjectRecord | null = null
  const update = (record: ProjectRecord) => {
    projects = [...projects.filter(item => item.id !== record.id), summary(record)].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    changed()
  }
  async function read(id: string) {
    const record = await loadStoredValue(prefix + id, isProject)
    if (!record || record.id !== id) throw new Error('Os dados deste projeto não estão disponíveis. Nenhum elemento foi substituído.')
    return record
  }
  async function write(record: ProjectRecord) {
    const result = await persistStoredValue(prefix + record.id, record)
    if (result.status !== 'error') { update(record); if (active?.id === record.id) active = record }
    return result
  }
  async function choose(record: ProjectRecord) {
    const result = await persistStoredValue(activeKey, { id: record.id })
    if (result.status === 'error') throw new Error(result.message)
    active = record
    update(record)
    return record
  }
  return {
    get activeId() { return active?.id ?? null },
    get summaries() { return projects },
    async initialize() {
      const keys = await listStoredKeys(prefix)
      const records = await Promise.all(keys.map(key => read(key.slice(prefix.length))))
      if (!records.length) {
        const record: ProjectRecord = { version: 1, id: 'legacy', name: 'Meu primeiro mapa', updatedAt: Date.now(), polygons: await loadPersistedPolygons(), viewpoint: null }
        const result = await write(record)
        if (result.status === 'error') throw new Error(result.message)
        records.push(record)
      }
      projects = records.map(summary).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
      const remembered = await loadStoredValue(activeKey, (value): value is { id: string } => typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string')
      active = records.find(record => record.id === remembered?.id) ?? records[0]
      changed()
      return active
    },
    async saveActive(polygons: PolygonJSON[], viewpoint: MapState['viewpoint']): Promise<SaveResult> {
      if (!active) return { status: 'error', message: 'Nenhum projeto aberto para salvar.' }
      return write({ ...active, polygons, viewpoint, updatedAt: Date.now() })
    },
    async open(id: string) { return choose(await read(id)) },
    async create(name: string) {
      const record: ProjectRecord = { version: 1, id: createId(), name: projectName(name), updatedAt: Date.now(), polygons: [], viewpoint: null }
      const result = await write(record)
      if (result.status === 'error') throw new Error(result.message)
      return choose(record)
    },
    async rename(id: string, name: string) {
      const result = await write({ ...await read(id), name: projectName(name), updatedAt: Date.now() })
      if (result.status === 'error') throw new Error(result.message)
      return result
    },
    adopt(id: string, summaries: ProjectSummary[], polygons: PolygonJSON[], viewpoint: MapState['viewpoint']) {
      projects = summaries
      const selected = summaries.find(item => item.id === id)
      if (selected) active = { version: 1, id: selected.id, name: selected.name, updatedAt: selected.updatedAt, polygons, viewpoint }
    }
  }
}
