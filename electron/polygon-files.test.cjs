const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const path = require('node:path')
const os = require('node:os')
const { validateDocument, createPolygonFiles, registerPolygonFiles, MAX_BYTES } = require('./polygon-files.cjs')
const document = () => ({ format: 'poligonos', version: 1, polygons: [{ name: '  Área   São José  ', geometry: { rings: [[[0, 0], [0, 2], [2, 0], [0, 0]]], spatialReference: { wkid: 4326 } } }] })

test('valida formato, nome, referência e geometria antes de aceitar um lote', () => {
  const valid = document()
  assert.equal(validateDocument(valid).polygons[0].name, 'Área São José')
  for (const mutation of [
    value => { value.version = 2 }, value => { value.polygons = [] },
    value => { value.polygons[0].name = 'Área!' }, value => { value.polygons[0].name = 'A'.repeat(31) },
    value => { value.polygons[0].geometry.spatialReference.wkid = 999 },
    value => { value.polygons[0].geometry.rings[0].pop() },
    value => { value.polygons[0].geometry.rings = [[[0, 0], [1, 1], [2, 2], [0, 0]]] },
    value => { value.polygons[0].geometry.rings[0][1] = [NaN, 1] },
    value => { value.polygons[0].geometry.rings[0][1] = [0, 91] }
  ]) {
    const invalid = document()
    mutation(invalid)
    assert.throws(() => validateDocument(invalid))
  }
})

test('exporta e importa em disco real, normaliza dados e remove propriedades extras', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'polygon-files-unit-'))
  const file = path.join(directory, 'areas.json')
  try {
    const service = createPolygonFiles({ dialog: {
      showSaveDialog: async () => ({ canceled: false, filePath: file }),
      showOpenDialog: async () => ({ canceled: false, filePaths: [file] })
    } })
    const polygons = document().polygons
    polygons[0].extra = 'ignorar'
    assert.equal((await service.exportPolygons(null, polygons)).status, 'success')
    const result = await service.importPolygons(null)
    assert.equal(result.status, 'success')
    assert.deepEqual(result.polygons, validateDocument(document()).polygons)
    assert.equal(JSON.parse(await fs.readFile(file, 'utf8')).version, 1)
    assert.deepEqual(await fs.readdir(directory), ['areas.json'])
  } finally { await fs.rm(directory, { recursive: true, force: true }) }
})

test('cancelar não acessa o disco e exportação inválida não abre diálogo', async () => {
  let dialogs = 0
  const service = createPolygonFiles({ dialog: {
    showSaveDialog: async () => { dialogs++; return { canceled: true } },
    showOpenDialog: async () => { dialogs++; return { canceled: true } }
  }, files: new Proxy({}, { get: () => { throw new Error('Não deveria acessar disco') } }) })
  assert.equal((await service.importPolygons()).status, 'cancelled')
  assert.equal((await service.exportPolygons(null, document().polygons)).status, 'cancelled')
  assert.equal((await service.exportPolygons(null, [])).status, 'error')
  assert.equal(dialogs, 2)
})

test('limite de arquivo, JSON malformado e falha de gravação retornam erro sem substituir destino', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'polygon-files-invalid-'))
  const file = path.join(directory, 'invalid.json')
  const output = path.join(directory, 'existing.json')
  const service = createPolygonFiles({ dialog: {
    showOpenDialog: async () => ({ canceled: false, filePaths: [file] }),
    showSaveDialog: async () => ({ canceled: false, filePath: output })
  } })
  try {
    await fs.writeFile(file, '{')
    assert.match((await service.importPolygons()).message, /JSON válido/)
    await fs.truncate(file, MAX_BYTES + 1)
    assert.match((await service.importPolygons()).message, /10 MB/)
    await fs.writeFile(output, 'original')
    const broken = createPolygonFiles({ dialog: { showSaveDialog: async () => ({ filePath: output }) }, files: {
      ...fs, rename: async () => { throw new Error('Falha de disco') }
    } })
    assert.equal((await broken.exportPolygons(null, document().polygons)).status, 'error')
    assert.equal(await fs.readFile(output, 'utf8'), 'original')
    assert.deepEqual((await fs.readdir(directory)).sort(), ['existing.json', 'invalid.json'])
  } finally { await fs.rm(directory, { recursive: true, force: true }) }
})

test('IPC recusa subframes e origens externas antes de abrir diálogos', async () => {
  const handlers = new Map()
  registerPolygonFiles({ ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    BrowserWindow: { fromWebContents: () => ({}) }, dialog: {}, origin: 'poligonos://app' })
  for (const url of ['https://evil.example/', 'poligonos://app.evil/', 'poligonos://app/other', 'invalid url']) {
    const mainFrame = { url }
    assert.equal((await handlers.get('polygons:import')({ senderFrame: mainFrame, sender: { mainFrame } })).status, 'error')
  }
  assert.equal((await handlers.get('polygons:import')({ senderFrame: { url: 'poligonos://app/' }, sender: { mainFrame: {} } })).status, 'error')
})

test('operações simultâneas não abrem dois diálogos', async () => {
  let finish
  const service = createPolygonFiles({ dialog: { showOpenDialog: () => new Promise(resolve => { finish = resolve }) } })
  const first = service.importPolygons()
  assert.match((await service.importPolygons()).message, /andamento/)
  finish({ canceled: true })
  assert.equal((await first).status, 'cancelled')
})
