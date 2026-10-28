import type Graphic from '@arcgis/core/Graphic.js'
const storageDatabaseName = 'polygon-editor-poc'
const storageStoreName = 'state'
const storageKey = 'polygons'

function localStorageFallbackLoad(): ReturnType<Graphic['toJSON']>[] {
  try {
    const stored = localStorage.getItem(storageKey)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function localStorageFallbackSave(polygons: ReturnType<Graphic['toJSON']>[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(polygons))
  } catch {
    // O mapa continua utilizável mesmo quando o armazenamento do dispositivo está cheio ou bloqueado.
  }
}

function openStorageDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('IndexedDB indisponível'))
      return
    }
    const request = indexedDB.open(storageDatabaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storageStoreName)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function loadPersistedPolygons() {
  try {
    const database = await openStorageDatabase()
    const polygons = await new Promise<ReturnType<Graphic['toJSON']>[]>((resolve, reject) => {
      const request = database.transaction(storageStoreName, 'readonly').objectStore(storageStoreName).get(storageKey)
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : [])
      request.onerror = () => reject(request.error)
    })
    database.close()
    return polygons
  } catch {
    return localStorageFallbackLoad()
  }
}

export async function persistPolygons(polygons: ReturnType<Graphic['toJSON']>[]) {
  try {
    const database = await openStorageDatabase()
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(storageStoreName, 'readwrite')
      transaction.objectStore(storageStoreName).put(polygons, storageKey)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    database.close()
  } catch {
    localStorageFallbackSave(polygons)
  }
}
