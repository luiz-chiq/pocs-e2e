import assert from 'node:assert/strict'
import { test, after } from 'node:test'
import { mkdtemp, readFile, writeFile, rm, mkdir, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { _electron } from '@playwright/test'
import { Builder, By } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import { remote } from 'webdriverio'
import { electronDriver, electronDriverVersion } from './shared/electron.ts'

type Tool = 'playwright' | 'selenium' | 'webdriverio'
type Adapter = {
  click(selector: string): Promise<void>
  snapshot(): Promise<Snapshot>
  handles(): Promise<string[]>
  switchTo(handle: string): Promise<void>
  reload(): Promise<void>
  close(): Promise<void>
}
type Snapshot = ReturnType<typeof snapshot>
function snapshot() {
  const visible = (selector: string) => {
    const node = document.querySelector<HTMLElement>(selector)
    return Boolean(node && node.getClientRects().length)
  }
  return {
    ready: visible('#map-ready'),
    names: [...document.querySelectorAll('.polygon-label')].map(node => node.textContent),
    mapNames: [...document.querySelectorAll('.polygon-map-label')].map(node => node.textContent),
    count: document.querySelector('#polygon-count')?.textContent,
    feedback: document.querySelector('#window-feedback')?.textContent ?? '',
    instructions: document.querySelector('#map-instructions')?.textContent ?? '',
    pending: document.querySelector('#polygon-file-actions')?.getAttribute('aria-busy') === 'true',
    importDisabled: document.querySelector<HTMLButtonElement>('#import-polygons')?.disabled,
    exportDisabled: document.querySelector<HTMLButtonElement>('#export-polygons')?.disabled,
    connected: document.querySelector('#connection-status')?.textContent,
    bridgeKeys: Object.keys(window.polygonFiles ?? {}).sort(),
    nodeAvailable: typeof (window as Window & { require?: unknown }).require !== 'undefined'
  }
}
async function wait<T>(read: () => Promise<T>, accept: (value: T) => boolean, message: string) {
  const deadline = Date.now() + 15000
  let value: T
  do {
    value = await read()
    if (accept(value)) return value
    await new Promise(resolve => setTimeout(resolve, 100))
  } while (Date.now() < deadline)
  assert.fail(`${message}: ${JSON.stringify(value!)}`)
}

async function launch(tool: Tool, profile: string): Promise<Adapter> {
  const binary = process.env.ELECTRON_APP_PATH ?? resolve('release/electron/mac-arm64/Poligonos POC.app/Contents/MacOS/Poligonos POC')
  if (tool === 'playwright') {
    const env: Record<string, string | undefined> = { ...process.env, POLYGON_USER_DATA_DIR: profile }
    delete env.ELECTRON_RUN_AS_NODE
    const app = await _electron.launch({ executablePath: binary, env: Object.fromEntries(Object.entries(env).filter((entry): entry is [string, string] => entry[1] !== undefined)), timeout: 45000 })
    let page = await app.firstWindow()
    const pages = new Map([[String(page.mainFrame()), page]])
    const refreshHandles = () => {
      for (const candidate of app.windows()) if (![...pages.values()].includes(candidate)) pages.set(`window-${pages.size}`, candidate)
      return [...pages].filter(([, candidate]) => !candidate.isClosed()).map(([key]) => key)
    }
    return {
      click: async selector => { await page.locator(selector).click() },
      snapshot: () => page.evaluate(snapshot),
      handles: async () => refreshHandles(),
      switchTo: async handle => { page = pages.get(handle)!; await page.bringToFront() },
      reload: async () => { await page.reload() }, close: () => app.close()
    }
  }
  const driverPath = await electronDriver()
  if (tool === 'selenium') {
    const options = new chrome.Options().setChromeBinaryPath(binary)
    options.addArguments(`--user-data-dir=${profile}`)
    options.set('goog:chromeOptions', { ...options.get('goog:chromeOptions'), windowTypes: ['app', 'webview'] })
    const driver = await new Builder().forBrowser('chrome').setChromeOptions(options).setChromeService(new chrome.ServiceBuilder(driverPath)).build()
    return {
      click: async selector => { await driver.findElement(By.css(selector)).click() },
      snapshot: () => driver.executeScript<Snapshot>(snapshot),
      handles: () => driver.getAllWindowHandles(),
      switchTo: async handle => { await driver.switchTo().window(handle) },
      reload: () => driver.navigate().refresh(), close: () => driver.quit()
    }
  }
  const browser = await remote({ logLevel: 'error', connectionRetryCount: 0,
    capabilities: {
      browserName: 'chrome', browserVersion: await electronDriverVersion(driverPath),
      'wdio:enforceWebDriverClassic': true,
      'goog:chromeOptions': { binary, windowTypes: ['app', 'webview'], args: [`--user-data-dir=${profile}`] },
      'wdio:chromedriverOptions': { binary: driverPath }
    }
  })
  return {
    click: async selector => { await browser.$(selector).click() }, snapshot: () => browser.execute(snapshot),
    handles: () => browser.getWindowHandles(), switchTo: async handle => { await browser.switchToWindow(handle) },
    reload: () => browser.refresh(), close: async () => { await browser.deleteSession() }
  }
}

const directory = resolve(process.env.POC_NATIVE_RESULTS_DIR ?? 'test-results/pocs/electron-files')
await mkdir(directory, { recursive: true })
const expected = {
  format: 'poligonos', version: 1,
  polygons: [{ name: 'Reserva São José', geometry: { rings: [[[-46.64, -23.55], [-46.63, -23.54], [-46.62, -23.56], [-46.64, -23.55]]], spatialReference: { wkid: 4326 } } }]
}
const selectors = { import: '#import-polygons', export: '#export-polygons' }
const results: { tool: Tool; title: string; status: string; durationMs: number; error?: string; audit?: unknown }[] = []
const startedAt = new Date().toISOString()
type Context = {
  app: Adapter; folder: string
  choose(kind: 'open' | 'save', path?: string): Promise<void>
  load(path?: string): Promise<void>
  state(): Promise<Snapshot>
  completed(accept: (state: Snapshot) => boolean, message: string): Promise<Snapshot>
}
const cases: [string, (context: Context) => Promise<void>][] = [
  ['N01 importa e exporta nomes e coordenadas usando IPC e disco real', async c => {
    const initial = await c.state()
    assert.deepEqual(initial.bridgeKeys, ['exportPolygons', 'importPolygons'])
    assert.equal(initial.nodeAvailable, false)
    assert.equal(initial.exportDisabled, true)
    await c.load()
    assert.deepEqual((await c.state()).names, ['Reserva São José'])
    const output = join(c.folder, 'exportado.json')
    await c.choose('save', output)
    await c.app.click(selectors.export)
    await c.completed(s => s.feedback.includes('exportado(s)'), 'Exportação não confirmada')
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')), expected)
    await c.app.reload()
    await c.completed(s => s.ready && s.count === '1', 'Importação não persistiu após recarregar')
    assert.deepEqual((await c.state()).names, ['Reserva São José'])
  }],
  ['N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos', async c => {
    await c.load()
    const before = await readdir(c.folder)
    for (const action of ['import', 'export'] as const) {
      await c.choose(action === 'import' ? 'open' : 'save')
      await c.app.click(selectors[action])
      await c.completed(s => s.feedback.includes(action === 'import' ? 'Importação cancelada' : 'Exportação cancelada'), 'Cancelamento não confirmado')
      assert.equal((await c.state()).count, '1')
    }
    assert.deepEqual(await readdir(c.folder), before)
  }],
  ['N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente', async c => {
    await c.load()
    const invalids = [
      ['{', 'O arquivo não contém um JSON válido.'],
      [JSON.stringify({ ...expected, version: 99 }), 'Formato inválido. Escolha um JSON exportado pelo aplicativo (versão 1).'],
      [JSON.stringify({ ...expected, polygons: [...expected.polygons, { ...expected.polygons[0], name: 'Inválido!' }] }), 'Polígono 2: use de 1 a 30 letras, números ou espaços no nome; acentos são permitidos.'],
      [JSON.stringify({ ...expected, polygons: [{ ...expected.polygons[0], geometry: { rings: [[[0, 0], [1, 1], [0, 0]]], spatialReference: { wkid: 4326 } } }] }), 'Polígono 1: desenhe pelo menos 3 pontos formando uma área.']
    ]
    for (const [index, [content, errorMessage]] of invalids.entries()) {
      const path = join(c.folder, `invalido-${index}.json`)
      await writeFile(path, content)
      await c.choose('open', path)
      await c.app.click(selectors.import)
      const state = await c.completed(s => s.feedback === errorMessage, 'Arquivo inválido não mostrou a mensagem esperada')
      assert.equal(state.count, '1')
      assert.deepEqual(state.names, ['Reserva São José'])
    }
  }],
  ['N04 informa erros de leitura e escrita sem perder dados nem deixar temporários', async c => {
    await c.load()
    await c.choose('open', join(c.folder, 'nao-existe.json'))
    await c.app.click(selectors.import)
    await c.completed(s => s.feedback.includes('Não foi possível acessar'), 'Falha de leitura não informada')
    const output = join(c.folder, 'destino')
    await mkdir(output)
    await c.choose('save', output)
    await c.app.click(selectors.export)
    const state = await c.completed(s => s.feedback.includes('Não foi possível acessar'), 'Falha de gravação não informada')
    assert.equal(state.count, '1')
    assert.equal((await readdir(c.folder)).some(name => name.endsWith('.tmp')), false)
  }],
  ['N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados', async c => {
    await c.load()
    const [main] = await c.app.handles()
    await c.app.click('#detach-map')
    const handles = await wait(() => c.app.handles(), h => h.length === 2, 'Segunda janela não abriu')
    const map = handles.find(h => h !== main)!
    await c.completed(s => Boolean(s.connected?.includes('Mapa conectado')), 'Mapa não conectou')
    await c.load()
    assert.equal((await c.state()).count, '2')
    await c.app.switchTo(map)
    await c.completed(s => s.mapNames.length === 2, 'Importação não sincronizou com o mapa')
    await c.app.switchTo(main)
    const output = join(c.folder, 'duas-janelas.json')
    await c.choose('save', output)
    await c.app.click(selectors.export)
    await c.completed(s => s.feedback.includes('2 polígono(s) exportado(s)'), 'Exportação das duas áreas não confirmada')
    assert.deepEqual(JSON.parse(await readFile(output, 'utf8')).polygons, [...expected.polygons, ...expected.polygons])
    await c.app.click('#reunite-windows')
    await wait(() => c.app.handles(), h => h.length === 1, 'Mapa não reuniu')
    await c.app.reload()
    await c.completed(s => s.ready && s.count === '2' && s.mapNames.length === 2, 'Dados não persistiram ao reunir/recarregar')
  }]
]
const selected = (process.env.POC_FRAMEWORKS ?? 'playwright,selenium,webdriverio').split(',')
if (new Set(selected).size !== selected.length || selected.some(tool => !['playwright', 'selenium', 'webdriverio'].includes(tool))) {
  throw new Error('POC_FRAMEWORKS inválido. Use playwright,selenium,webdriverio, sem repetições.')
}
for (const tool of ['playwright', 'selenium', 'webdriverio'] as Tool[]) {
  if (!selected.includes(tool)) continue
  for (const [title, body] of cases) test(`${tool} / ${title}`, { timeout: 90000 }, async () => {
    const started = performance.now()
    const folder = await mkdtemp(join(tmpdir(), `polygon-native-${tool}-`))
    const plan = join(folder, 'dialog-plan.json')
    const input = join(folder, 'entrada.json')
    const oldProfile = process.env.POLYGON_USER_DATA_DIR
    const oldPlan = process.env.POLYGON_E2E_DIALOG_PLAN
    const oldRunAsNode = process.env.ELECTRON_RUN_AS_NODE
    const profile = join(folder, 'profile')
    process.env.POLYGON_USER_DATA_DIR = profile
    process.env.POLYGON_E2E_DIALOG_PLAN = plan
    delete process.env.ELECTRON_RUN_AS_NODE
    let app: Adapter | undefined
    const result: typeof results[number] = { tool, title, status: 'passed', durationMs: 0 }
    try {
      await writeFile(plan, '[]')
      await writeFile(input, JSON.stringify(expected))
      app = await launch(tool, profile)
      await wait(() => app!.snapshot(), state => state.ready, 'Mapa não iniciou')
      const completed: Context['completed'] = (accept, message) => wait(() => app!.snapshot(), state => !state.pending && accept(state), message)
      const choose: Context['choose'] = (kind, path) => writeFile(plan, JSON.stringify([{ kind, path }]))
      await body({ app, folder, choose, state: () => app!.snapshot(), completed,
        load: async (path = input) => {
          const previous = (await app!.snapshot()).count
          await choose('open', path)
          await app!.click(selectors.import)
          await completed(s => s.count === String(Number(previous) + 1), 'Importação não acrescentou a área')
        }
      })
      const audit = (await readFile(`${plan}.audit.jsonl`, 'utf8')).trim().split('\n').map(line => JSON.parse(line))
      assert(audit.length > 0)
      assert(audit.every(entry => entry.processType === 'browser' && entry.pid > 0), 'Diálogos não foram chamados no processo principal')
      result.audit = audit
      assert.deepEqual(JSON.parse(await readFile(plan, 'utf8')), [], 'Plano de diálogo não foi consumido')
    } catch (error) {
      result.status = 'failed'
      result.error = error instanceof Error ? error.stack : String(error)
      throw error
    } finally {
      try { await app?.close() } catch (error) { result.status = 'failed'; result.error ??= String(error); throw error }
      finally {
        result.durationMs = Math.round(performance.now() - started)
        results.push(result)
        await writeFile(join(directory, 'results.json'), JSON.stringify({ startedAt, finishedAt: new Date().toISOString(), platform: 'electron', dialogSelection: 'simulated', tests: results }, null, 2))
        await rm(folder, { recursive: true, force: true })
        for (const [key, value] of [['POLYGON_USER_DATA_DIR', oldProfile], ['POLYGON_E2E_DIALOG_PLAN', oldPlan], ['ELECTRON_RUN_AS_NODE', oldRunAsNode]]) {
          if (value === undefined) delete process.env[key!]
          else process.env[key!] = value
        }
      }
    }
  })
}
after(() => { assert.equal(results.length, selected.length * cases.length, 'Nem todos os cenários foram executados') })
