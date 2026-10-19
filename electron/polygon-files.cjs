const fs = require('node:fs/promises')
const path = require('node:path')
const { randomUUID } = require('node:crypto')

const MAX_BYTES = 10 * 1024 * 1024
const MAX_POLYGONS = 1000
const MAX_VERTICES = 100000

class InvalidFile extends Error {}

// Normalizar uma lista branca: nunca carregar símbolos, IDs ou propriedades executáveis do arquivo.
function validateDocument(value) {
  const invalid = (message) => { throw new InvalidFile(message) }
  if (!value || value.format !== 'poligonos' || value.version !== 1 || !Array.isArray(value.polygons)) {
    invalid('Formato inválido. Escolha um JSON exportado pelo aplicativo (versão 1).')
  }
  if (!value.polygons.length || value.polygons.length > MAX_POLYGONS) invalid('O arquivo deve conter de 1 a 1.000 polígonos.')
  let vertices = 0
  const polygons = value.polygons.map((polygon, index) => {
    const prefix = `Polígono ${index + 1}: `
    if (!polygon || typeof polygon.name !== 'string') invalid(prefix + 'nome inválido.')
    const name = polygon.name.normalize('NFC').trim().replace(/ +/g, ' ')
    if (!name || [...name].length > 30 || !/^[\p{L}\p{N}][\p{L}\p{M}\p{N} ]*$/u.test(name)) {
      invalid(prefix + 'use de 1 a 30 letras, números ou espaços no nome; acentos são permitidos.')
    }
    const geometry = polygon.geometry
    const wkid = geometry?.spatialReference?.wkid
    if (![4326, 3857, 102100, 102113].includes(wkid)) invalid(prefix + 'referência espacial não suportada.')
    if (!Array.isArray(geometry.rings) || !geometry.rings.length) invalid(prefix + 'desenho ausente.')
    const rings = geometry.rings.map((ring) => {
      if (!Array.isArray(ring) || ring.length < 4) invalid(prefix + 'desenhe pelo menos 3 pontos formando uma área.')
      vertices += ring.length
      if (vertices > MAX_VERTICES) invalid('O arquivo excede o limite de 100.000 pontos.')
      const points = ring.map((point) => {
        if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) invalid(prefix + 'coordenadas inválidas.')
        const [x, y] = point
        if (wkid === 4326 ? Math.abs(x) > 180 || Math.abs(y) > 90 : Math.abs(x) > 20037509 || Math.abs(y) > 20037509) {
          invalid(prefix + 'coordenadas fora dos limites da referência espacial.')
        }
        return [x, y]
      })
      const [x0, y0] = points[0]
      const last = points.at(-1)
      if (last[0] !== x0 || last[1] !== y0) invalid(prefix + 'o contorno deve estar fechado.')
      if (new Set(points.map(([x, y]) => `${x},${y}`)).size < 3) invalid(prefix + 'use pelo menos 3 pontos diferentes.')
      const area = points.slice(0, -1).reduce((sum, [x, y], i) => {
        const [nx, ny] = points[i + 1]
        return sum + (x - x0) * (ny - y0) - (nx - x0) * (y - y0)
      }, 0)
      const span = points.reduce((max, [x, y]) => Math.max(max, Math.abs(x - x0), Math.abs(y - y0)), 0)
      if (!Number.isFinite(area) || Math.abs(area) <= span * span * 1e-10) invalid(prefix + 'os pontos devem formar uma área.')
      return points
    })
    return { name, geometry: { rings, spatialReference: { wkid } } }
  })
  return { format: 'poligonos', version: 1, polygons }
}

function createPolygonFiles({ dialog, files = fs }) {
  let busy = false
  const run = async (operation) => {
    if (busy) return { status: 'error', message: 'Já existe uma operação de arquivo em andamento.' }
    busy = true
    try { return await operation() }
    catch (error) {
      return { status: 'error', message: error instanceof InvalidFile ? error.message : 'Não foi possível acessar o arquivo. Verifique a pasta e as permissões e tente novamente.' }
    } finally { busy = false }
  }
  return {
    importPolygons: (parent) => run(async () => {
      const result = await dialog.showOpenDialog(parent, {
        title: 'Importar polígonos', filters: [{ name: 'Polígonos JSON', extensions: ['json'] }], properties: ['openFile']
      })
      if (result.canceled || !result.filePaths.length) return { status: 'cancelled' }
      const file = await files.open(result.filePaths[0], 'r')
      let content
      try {
        const stat = await file.stat()
        if (!stat.isFile() || stat.size > MAX_BYTES) throw new InvalidFile('Escolha um arquivo JSON de até 10 MB.')
        // Ler no máximo o limite + 1, mesmo se o arquivo crescer depois do stat.
        const buffer = Buffer.alloc(MAX_BYTES + 1)
        let length = 0
        while (length < buffer.length) {
          const { bytesRead } = await file.read(buffer, length, buffer.length - length, null)
          if (!bytesRead) break
          length += bytesRead
        }
        if (length > MAX_BYTES) throw new InvalidFile('Escolha um arquivo JSON de até 10 MB.')
        content = buffer.subarray(0, length).toString('utf8').replace(/^\uFEFF/, '')
      } finally { await file.close() }
      let parsed
      try { parsed = JSON.parse(content) } catch { throw new InvalidFile('O arquivo não contém um JSON válido.') }
      const document = validateDocument(parsed)
      return { status: 'success', polygons: document.polygons, fileName: path.basename(result.filePaths[0]) }
    }),
    exportPolygons: (parent, polygons) => run(async () => {
      const document = validateDocument({ format: 'poligonos', version: 1, polygons })
      const content = JSON.stringify(document, null, 2) + '\n'
      if (Buffer.byteLength(content) > MAX_BYTES) throw new InvalidFile('A exportação excede o limite de 10 MB.')
      const result = await dialog.showSaveDialog(parent, {
        title: 'Exportar polígonos', defaultPath: 'poligonos.json',
        filters: [{ name: 'Polígonos JSON', extensions: ['json'] }], properties: ['showOverwriteConfirmation', 'createDirectory']
      })
      if (result.canceled || !result.filePath) return { status: 'cancelled' }
      const temporary = path.join(path.dirname(result.filePath), `.poligonos-${randomUUID()}.tmp`)
      try {
        await files.writeFile(temporary, content, { encoding: 'utf8', flag: 'wx', mode: 0o600 })
        await files.rename(temporary, result.filePath)
      } finally { await files.rm(temporary, { force: true }) }
      return { status: 'success', count: document.polygons.length, fileName: path.basename(result.filePath) }
    })
  }
}

function registerPolygonFiles({ ipcMain, BrowserWindow, dialog, origin }) {
  const service = createPolygonFiles({ dialog })
  const authorized = (event) => {
    const frame = event.senderFrame
    if (!frame || frame !== event.sender.mainFrame) return false
    try {
      const url = new URL(frame.url)
      return `${url.protocol}//${url.host}` === origin && (url.pathname === '/' || url.pathname === '/index.html') && Boolean(BrowserWindow.fromWebContents(event.sender))
    } catch { return false }
  }
  for (const [channel, operation] of [['polygons:import', 'importPolygons'], ['polygons:export', 'exportPolygons']]) {
    ipcMain.handle(channel, (event, polygons) => {
      if (!authorized(event)) return { status: 'error', message: 'Origem não autorizada.' }
      return service[operation](BrowserWindow.fromWebContents(event.sender), polygons)
    })
  }
}

module.exports = { validateDocument, createPolygonFiles, registerPolygonFiles, MAX_BYTES }
