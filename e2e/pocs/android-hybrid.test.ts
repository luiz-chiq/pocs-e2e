import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { _android, expect, type AndroidDevice, type Page } from '@playwright/test'
import { createNativeAppiumSession } from './shared/appium-native.ts'
import { androidHybridCases } from './shared/android-hybrid-cases.ts'

const directory = resolve(process.env.POC_RESULTS_DIR!)
await mkdir(directory, { recursive: true })
const pkg = 'com.example.tasks.poc'
const exec = promisify(execFile)
const adbPath = join(process.env.ANDROID_HOME!, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb')
const adb = async (...args: string[]) => (await exec(adbPath, ['-s', process.env.ANDROID_SERIAL!, ...args], { timeout: 30_000, maxBuffer: 20 * 1024 * 1024 })).stdout.trim()
const runId = `PolygonHybrid-${Date.now()}`
const deviceDirectory = `/sdcard/Download/${runId}`
const fixtureDocument = { format: 'poligonos', version: 1, polygons: [
  { name: 'Área Android 1', geometry: { rings: [[[-46.64, -23.55], [-46.63, -23.54], [-46.62, -23.55], [-46.64, -23.55]]], spatialReference: { wkid: 4326 } } }
] }
const results: { id: string; title: string; status: string; durationMs: number | null; steps: { owner: string; action: string; durationMs: number }[]; error?: string; variants?: string[] }[] = []
const metadata: Record<string, unknown> = { startedAt: new Date().toISOString(), target: 'android', framework: 'playwright+appium', nativeClient: 'selenium', chromedriverUsed: false, permission: 'SAF folder URI grant; autoGrantPermissions=false', folder: deviceDirectory }
let native: Awaited<ReturnType<typeof createNativeAppiumSession>> | undefined
let android: AndroidDevice | undefined
let page!: Page
let current: typeof results[number] | undefined
let infrastructureError: string | undefined
let lastExport = ''
const artifacts = join(directory, 'artifacts')
await mkdir(artifacts, { recursive: true })

async function step<T>(owner: string, action: string, run: () => Promise<T>): Promise<T> {
  const start = performance.now()
  console.log(`  ${owner}: ${action}`)
  try { return await run() }
  finally { current?.steps.push({ owner, action, durationMs: Math.round(performance.now() - start) }) }
}
const snapshot = () => page.evaluate(() => ({
  names: [...document.querySelectorAll('.polygon-label')].map(node => node.textContent),
  pending: document.querySelector('#polygon-file-actions')?.getAttribute('aria-busy') === 'true'
}))
const feedback = () => page.locator('#window-feedback').textContent()
async function storedPolygons() {
  return page.evaluate(async () => {
    await (window as unknown as { polygonTestApi: { waitForPersistence(): Promise<void> } }).polygonTestApi.waitForPersistence()
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('polygon-editor-poc', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<{ attributes: { polygonId: string; name: string }; geometry: PolygonFileData['geometry'] }[]>((resolve, reject) => {
        const request = database.transaction('state', 'readonly').objectStore('state').get('polygons')
        request.onsuccess = () => resolve(request.result ?? [])
        request.onerror = () => reject(request.error)
      })
    } finally { database.close() }
  })
}
async function waitForPicker() {
  await expect.poll(() => native!.getCurrentPackage(), { timeout: 15_000 }).toMatch(/documentsui/)
}
async function attachPage() {
  const pid = Number(await adb('shell', 'pidof', pkg))
  await expect.poll(() => android!.webViews().map(view => `${view.pkg()}:${view.pid()}`), { timeout: 45_000 }).toContain(`${pkg}:${pid}`)
  page = await bounded(android!.webViews().find(view => view.pkg() === pkg && view.pid() === pid)!.page(), 30_000, 'Conexão Playwright com a WebView')
  page.setDefaultTimeout(20_000)
  await page.getByTestId('map-ready').waitFor({ timeout: 60_000 })
}
async function reset() {
  // Uma nova conexão por caso evita reaproveitar sockets do processo encerrado.
  await android?.close()
  android = undefined
  await adb('shell', 'am', 'force-stop', pkg)
  assert.match(await adb('shell', 'pm', 'clear', pkg), /Success/)
  await adb('shell', 'am', 'start', '-W', '-n', `${pkg}/.MainActivity`)
  android = (await _android.devices()).find(device => device.serial() === process.env.ANDROID_SERIAL)
  assert.ok(android)
  await attachPage()
}
async function bounded<T>(promise: Promise<T>, ms: number, action: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try { return await Promise.race([promise, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${action}: limite de ${ms} ms excedido`)), ms) })]) }
  finally { clearTimeout(timer) }
}
async function nativeText(pattern: string) {
  const selector = `android=new UiSelector().textMatches(${JSON.stringify(pattern)})`
  const element = native!.element(selector)
  await element.waitForDisplayed({ timeout: 15_000 })
  return element
}
async function nativeArtifact(label: string) {
  await writeFile(join(artifacts, `${label}.xml`), await native!.getPageSource())
  await native!.saveScreenshot(join(artifacts, `${label}.png`))
}
async function downloads() {
  await waitForPicker()
  // O seletor pode abrir em Recentes ou lembrar a última pasta escolhida.
  const source = await native!.getPageSource()
  if (source.includes(`text="${runId}"`)) return
  const roots = native!.element('android=new UiSelector().descriptionMatches("(?i)Show roots|Mostrar raízes|Mostrar locais|Mostrar pastas")')
  await roots.waitForDisplayed({ timeout: 15_000 })
  await roots.click()
  await (await nativeText('(?i)Downloads')).click()
}
async function pickFixture(name: string) {
  await downloads()
  const folder = await nativeText(runId)
  await folder.click()
  await (await nativeText(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).click()
}
async function importFixture(name = 'valid.json') {
  await step('playwright', 'Abrir Importar pela interface web', () => page.getByTestId('import-polygons').click())
  await step('appium', `Selecionar ${name} no seletor nativo`, () => pickFixture(name))
  await step('playwright', 'Aguardar retorno do plugin nativo', () => expect.poll(async () => (await snapshot()).pending).toBe(false))
}
async function baseline() {
  await importFixture()
  await expect(page.locator('.polygon-label')).toHaveText(['Área Android 1'])
}
async function chooseExportFolder() {
  await step('playwright', 'Abrir Exportar pela interface web', () => page.getByTestId('export-polygons').click())
  await step('appium', 'Escolher pasta de exportação', async () => {
    await downloads()
    await (await nativeText(runId)).click()
    await (await nativeText('(?i)Use this folder|Usar esta pasta')).click()
  })
}
async function allowFolder() {
  await step('appium', 'Permitir acesso na confirmação real do Android', async () => {
    await nativeArtifact(`${current!.id}-permission`)
    await (await nativeText('(?i)Allow|Permitir')).click()
  })
  await step('playwright', 'Verificar conclusão da exportação', async () => {
    await expect.poll(feedback).toMatch(/exportado\(s\) para poligonos-/)
    const match = (await feedback())!.match(/para (poligonos-[a-f0-9-]+\.json)/)
    assert.ok(match)
    lastExport = match[1]
  })
}
const exportedFiles = async () => (await adb('shell', 'ls', deviceDirectory)).split(/\r?\n/).filter(name => /^poligonos-.*\.json$/.test(name)).sort()
const bodies: Record<string, () => Promise<void>> = {
  H01: async () => {
    await expect(page.getByTestId('export-polygons')).toBeDisabled()
    await page.getByTestId('import-polygons').click()
    await step('appium', 'Cancelar seletor de arquivos com Voltar', async () => {
      await waitForPicker()
      await nativeArtifact('H01-picker')
      await native!.back()
    })
    await expect.poll(feedback).toBe('Importação cancelada.')
    await expect(page.locator('.polygon-label')).toHaveCount(0)
    await expect(page.getByTestId('import-polygons')).toBeEnabled()
  },
  H02: async () => {
    await baseline()
    await step('playwright', 'Recarregar e verificar persistência', async () => {
      await storedPolygons()
      await page.reload()
      await page.getByTestId('map-ready').waitFor()
      await expect(page.locator('.polygon-label')).toHaveText(['Área Android 1'])
      const stored = await storedPolygons()
      assert.deepEqual(stored.map(item => ({ name: item.attributes.name, geometry: item.geometry })), fixtureDocument.polygons)
    })
  },
  H03: async () => {
    await baseline()
    const before = await storedPolygons()
    const variants = ['malformed.json', 'unquoted.json', 'trailing.json', 'version.json', 'name.json', 'geometry.json', 'empty.json', 'oversize.json']
    current!.variants = variants
    for (const variant of variants) {
      await importFixture(variant)
      assert.ok((await feedback())?.match(/inválid|versão|nome|pontos|polígonos|10 MB/), `${variant}: ${await feedback()}`)
      await expect(page.locator('.polygon-label')).toHaveText(['Área Android 1'])
      assert.deepEqual(await storedPolygons(), before)
    }
  },
  H04: async () => {
    await baseline()
    const before = await exportedFiles()
    await page.getByTestId('export-polygons').click()
    await step('appium', 'Cancelar escolha da pasta', async () => { await waitForPicker(); await native!.back() })
    await expect.poll(feedback).toBe('Exportação cancelada.')
    assert.deepEqual(await exportedFiles(), before)
    await expect(page.locator('.polygon-label')).toHaveText(['Área Android 1'])
  },
  H05: async () => {
    await baseline()
    const before = await exportedFiles()
    await chooseExportFolder()
    await step('appium', 'Negar acesso na confirmação do Android', async () => {
      await nativeArtifact('H05-permission')
      await (await nativeText('(?i)Cancel|Cancelar|Deny|Negar|Não permitir|Don.t allow')).click()
      // A recusa retorna ao seletor; Voltar cancela a operação no aplicativo.
      await native!.back()
    })
    await expect.poll(feedback).toBe('Exportação cancelada.')
    assert.deepEqual(await exportedFiles(), before)
    await expect(page.locator('.polygon-label')).toHaveText(['Área Android 1'])
  },
  H06: async () => {
    await baseline()
    const before = await exportedFiles()
    await chooseExportFolder()
    await allowFolder()
    await step('filesystem', 'Ler JSON real e comparar nome e coordenadas', async () => {
      const content = await adb('shell', 'cat', `${deviceDirectory}/${lastExport}`)
      assert.deepEqual(JSON.parse(content), fixtureDocument)
      await writeFile(join(artifacts, lastExport), content)
      assert.deepEqual(await exportedFiles(), [...before, lastExport].sort())
      assert.deepEqual(JSON.parse(await adb('shell', 'cat', `${deviceDirectory}/valid.json`)), fixtureDocument)
    })
  },
  H07: async () => {
    await baseline()
    await chooseExportFolder()
    await allowFolder()
    await importFixture(lastExport)
    await expect(page.locator('.polygon-label')).toHaveText(['Área Android 1', 'Área Android 1'])
    await storedPolygons()
    await page.reload()
    await page.getByTestId('map-ready').waitFor()
    await expect(page.locator('.polygon-label')).toHaveText(['Área Android 1', 'Área Android 1'])
    const stored = await storedPolygons()
    const ids = stored.map(item => item.attributes.polygonId)
    assert.equal(ids.length, 2)
    assert.equal(new Set(ids).size, 2)
    assert.deepEqual(stored.map(item => ({ name: item.attributes.name, geometry: item.geometry })), [...fixtureDocument.polygons, ...fixtureDocument.polygons])
    await writeFile(join(artifacts, 'H07-storage.json'), JSON.stringify({ ids, stored }, null, 2))
  },
  H08: async () => {
    await baseline()
    await page.locator('.polygon-label').click()
    await page.getByTestId('draw-polygon').click()
    await expect(page.getByTestId('import-polygons')).toBeDisabled()
    await expect(page.getByTestId('export-polygons')).toBeDisabled()
    await page.getByTestId('cancel-editing').click()
    await expect(page.getByTestId('import-polygons')).toBeEnabled()
    await expect(page.getByTestId('export-polygons')).toBeEnabled()
  }
}

try {
  await adb('shell', 'mkdir', '-p', deviceDirectory)
  const fixtures = join(directory, 'fixtures')
  await mkdir(fixtures, { recursive: true })
  const invalid = (change: (copy: typeof fixtureDocument) => void) => { const copy = structuredClone(fixtureDocument); change(copy); return JSON.stringify(copy) }
  const contents: Record<string, string> = {
    'valid.json': JSON.stringify(fixtureDocument), 'malformed.json': '{', 'unquoted.json': '{format:"poligonos",version:1,polygons:[]}',
    'trailing.json': JSON.stringify(fixtureDocument) + 'garbage', 'version.json': invalid(copy => { copy.version = 99 }),
    'name.json': invalid(copy => { copy.polygons[0].name = 'Nome @ inválido' }),
    'geometry.json': invalid(copy => { copy.polygons[0].geometry.rings = [[[1, 1], [2, 2], [1, 1]]] }),
    'empty.json': invalid(copy => { copy.polygons = [] }), 'oversize.json': ' '.repeat(10 * 1024 * 1024 + 1)
  }
  for (const [name, content] of Object.entries(contents)) {
    const path = join(fixtures, name)
    await writeFile(path, content)
    await adb('push', path, `${deviceDirectory}/${name}`)
  }
  native = await createNativeAppiumSession(`http://${process.env.APPIUM_HOST ?? '127.0.0.1'}:${process.env.APPIUM_PORT}`, {
    platformName: 'Android', 'appium:automationName': 'UiAutomator2', 'appium:udid': process.env.ANDROID_SERIAL,
    'appium:appPackage': pkg, 'appium:appActivity': '.MainActivity', 'appium:autoWebview': false,
    'appium:autoGrantPermissions': false, 'appium:noReset': true, 'appium:forceAppLaunch': true,
    'appium:newCommandTimeout': 180, 'appium:shouldTerminateApp': false
  })
  assert.equal(await native.getContext(), 'NATIVE_APP')
  await native.updateSettings({ waitForIdleTimeout: 500 })
  metadata.nativeSessionId = native.sessionId
  metadata.androidVersion = await adb('shell', 'getprop', 'ro.build.version.release')
  metadata.sdk = await adb('shell', 'getprop', 'ro.build.version.sdk')
  android = (await _android.devices()).find(device => device.serial() === process.env.ANDROID_SERIAL)
  assert.ok(android, 'Playwright não encontrou o mesmo Android usado pelo Appium')
  metadata.serial = android.serial()
  for (const item of androidHybridCases) {
    current = { ...item, status: 'running', durationMs: null, steps: [] }
    results.push(current)
    const start = performance.now()
    console.log(`Executando ${item.id}: ${item.title}`)
    try {
      await step('setup', 'Reiniciar aplicativo com dados isolados', reset)
      await bodies[item.id]()
      assert.equal(await native.getContext(), 'NATIVE_APP', 'Appium não deve entrar em WebView/ChromeDriver')
      current.status = 'passed'
    } catch (error) {
      current.status = 'failed'; current.error = String(error instanceof Error ? error.stack : error)
      console.error(current.error)
      await nativeArtifact(`${item.id}-failure`).catch(() => {})
      await page?.screenshot({ path: join(artifacts, `${item.id}-web-failure.png`) }).catch(() => {})
    } finally {
      current.durationMs = Math.round(performance.now() - start)
      console.log(`${item.id}: ${current.status} (${current.durationMs} ms)`)
      await writeFile(join(directory, 'results.json'), JSON.stringify({ ...metadata, finishedAt: new Date().toISOString(), cases: results }, null, 2))
    }
  }
} catch (error) {
  infrastructureError = String(error instanceof Error ? error.stack : error)
  console.error(infrastructureError)
} finally {
  await native?.quit().catch(() => {})
  await android?.close().catch(() => {})
  for (const item of androidHybridCases) if (!results.some(result => result.id === item.id)) results.push({ ...item, status: 'unavailable', durationMs: null, steps: [], error: infrastructureError ?? 'Infraestrutura não ficou disponível.' })
  await writeFile(join(directory, 'results.json'), JSON.stringify({ ...metadata, finishedAt: new Date().toISOString(), infrastructureError, cases: results }, null, 2))
}
process.exitCode = results.some(result => result.status !== 'passed') ? 1 : 0
