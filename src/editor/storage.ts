import type Graphic from '@arcgis/core/Graphic.js'

const databaseName = 'polygon-editor-poc'
const storeName = 'state'
const storageKey = 'polygons'
interface RecordEnvelope<T> { schema: 1; savedAt: number; data: T }
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'degraded' | 'error'
export interface SaveResult { status: 'saved' | 'degraded' | 'error'; message: string }
const queues = new Map<string, Promise<unknown>>()
let lastTimestamp = 0

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB indisponível')); return }
    let settled = false
    const timer = setTimeout(() => { settled = true; reject(new Error('Armazenamento não respondeu.')) }, 8000)
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) request.result.createObjectStore(storeName)
    }
    request.onsuccess = () => {
      clearTimeout(timer)
      if (settled) { request.result.close(); return }
      settled = true
      resolve(request.result)
    }
    request.onerror = () => { clearTimeout(timer); settled = true; reject(request.error) }
    request.onblocked = () => { clearTimeout(timer); settled = true; reject(new Error('Armazenamento bloqueado por outra janela.')) }
  })
}
async function readDatabase(key: string): Promise<unknown> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly')
      const request = transaction.objectStore(storeName).get(key)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally { database.close() }
}
async function writeDatabase(key: string, value: unknown) {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readwrite')
      transaction.objectStore(storeName).put(value, key)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
  } finally { database.close() }
}
function decode<T>(value: unknown, validate: (value: unknown) => value is T): RecordEnvelope<T> | null {
  if (value == null) return null
  if (typeof value === 'object' && 'schema' in value && value.schema === 1 && 'savedAt' in value && 'data' in value) {
    if (typeof value.savedAt !== 'number' || !Number.isFinite(value.savedAt) || !validate(value.data)) throw new Error('Cópia salva inválida.')
    lastTimestamp = Math.max(lastTimestamp, value.savedAt)
    return value as RecordEnvelope<T>
  }
  // Migração das coleções antigas, sem apagar a cópia original durante a leitura.
  if (validate(value)) return { schema: 1, savedAt: 0, data: value }
  throw new Error('Dados salvos não reconhecidos.')
}
export async function loadStoredValue<T>(key: string, validate: (value: unknown) => value is T): Promise<T | null> {
  const copies = await Promise.allSettled([
    readDatabase(key).then(value => decode(value, validate)),
    Promise.resolve().then(() => { const raw = localStorage.getItem(key); return decode(raw == null ? null : JSON.parse(raw), validate) })
  ])
  const records = copies.flatMap(copy => copy.status === 'fulfilled' && copy.value ? [copy.value] : [])
  records.sort((a, b) => b.savedAt - a.savedAt)
  if (records.length) return records[0].data
  if (copies.some(copy => copy.status === 'rejected')) throw new Error('Não foi possível recuperar os dados locais. Tente novamente; nenhuma cópia foi substituída.')
  return null
}
export function persistStoredValue<T>(key: string, value: T): Promise<SaveResult> {
  // Capturar agora impede que alterações posteriores mudem uma gravação já enfileirada.
  let envelope: RecordEnvelope<T>
  try { envelope = { schema: 1, savedAt: lastTimestamp = Math.max(Date.now(), lastTimestamp + 1), data: JSON.parse(JSON.stringify(value)) } }
  catch { return Promise.resolve({ status: 'error', message: 'Não foi possível preparar os dados para salvar. Exporte um backup antes de sair.' }) }
  const save = async (): Promise<SaveResult> => {
    const copies = await Promise.allSettled([
      writeDatabase(key, envelope),
      Promise.resolve().then(() => localStorage.setItem(key, JSON.stringify(envelope)))
    ])
    const successes = copies.filter(copy => copy.status === 'fulfilled').length
    if (successes === 2) return { status: 'saved', message: 'Alterações salvas no dispositivo.' }
    if (successes === 1) return { status: 'degraded', message: 'Salvo em apenas uma cópia local. Exporte um backup e tente salvar novamente.' }
    return { status: 'error', message: 'Não foi possível salvar. As alterações estão apenas nesta sessão; exporte um backup antes de sair.' }
  }
  const previous = queues.get(key) ?? Promise.resolve()
  const pending = previous.catch(() => undefined).then(save)
  queues.set(key, pending)
  void pending.finally(() => { if (queues.get(key) === pending) queues.delete(key) })
  return pending
}
const isCollection = (value: unknown): value is ReturnType<Graphic['toJSON']>[] => Array.isArray(value)
export async function loadPersistedPolygons() { return await loadStoredValue(storageKey, isCollection) ?? [] }
export function persistPolygons(polygons: ReturnType<Graphic['toJSON']>[]) { return persistStoredValue(storageKey, polygons) }
