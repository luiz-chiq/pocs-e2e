import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium, _electron, expect } from '@playwright/test'

// Verificação adicional do provedor real: não modifica os resultados históricos C/D ou N.
const directory = resolve(process.env.SATELLITE_RESULTS_DIR ?? 'test-results/satellite')
await mkdir(directory, { recursive: true })
const port = Number(process.env.SATELLITE_PREVIEW_PORT ?? 4174)
const base = `http://127.0.0.1:${port}`
const preview = spawn(process.execPath, [resolve('node_modules/vite/bin/vite.js'), 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] })
let previewLog = ''
preview.stdout.on('data', data => { previewLog += data })
preview.stderr.on('data', data => { previewLog += data })
const report = { startedAt: new Date().toISOString(), provider: 'Esri World Imagery', tests: [] }
const matchesTile = url => /^https:\/\/services\.arcgisonline\.com\/ArcGIS\/rest\/services\/World_Imagery\/MapServer\/tile\//i.test(url)
let failed = false
try {
  await expect.poll(async () => {
    if (preview.exitCode !== null) throw new Error(`Preview encerrou: ${previewLog}`)
    return fetch(base).then(response => response.ok).catch(() => false)
  }, { timeout: 15000 }).toBe(true)
  for (const platform of ['web', 'electron']) {
    const started = performance.now()
    const result = { platform, status: 'passed', assertions: [], windows: [], durationMs: 0 }
    let browser, app, profile
    try {
      let page, context
      if (platform === 'web') {
        browser = await chromium.launch({ channel: 'chrome', headless: true })
        context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
        page = await context.newPage()
      } else {
        profile = await mkdtemp(join(tmpdir(), 'satellite-electron-'))
        const env = { ...process.env, POLYGON_USER_DATA_DIR: profile }
        delete env.ELECTRON_RUN_AS_NODE
        const binary = process.env.ELECTRON_APP_PATH ?? (process.platform === 'darwin'
          ? resolve(`release/electron/mac${process.arch === 'arm64' ? '-arm64' : ''}/Poligonos POC.app/Contents/MacOS/Poligonos POC`)
          : process.platform === 'win32' ? resolve('release/electron/win-unpacked/Poligonos POC.exe') : resolve('release/electron/linux-unpacked/poligonos-poc'))
        app = await _electron.launch({ executablePath: binary, env, timeout: 45000 })
        page = await app.firstWindow()
        context = page.context()
        assert.equal(await app.evaluate(({ app }) => app.isPackaged), true)
      }
      const responses = new Map()
      const osmRequests = []
      const track = candidate => {
        if (responses.has(candidate)) return
        const tiles = []
        responses.set(candidate, tiles)
        candidate.on('request', request => { if (request.url().includes('tile.openstreetmap.org')) osmRequests.push(request.url()) })
        candidate.on('response', response => {
          if (!matchesTile(response.url())) return
          tiles.push({ url: response.url(), status: response.status(), type: response.headers()['content-type'], blocked: response.headers()['x-blocked'] ?? null })
        })
      }
      context.on('page', track)
      track(page)
      if (platform === 'web') await page.goto(base)
      else await page.waitForURL('poligonos://app/**', { waitUntil: 'domcontentloaded', timeout: 45000 })
      const checkImages = async (candidate, windowName) => {
        await candidate.getByTestId('map-ready').waitFor({ state: 'visible', timeout: 45000 })
        await expect.poll(() => responses.get(candidate).some(tile => tile.status === 200 && tile.type?.includes('image/jpeg') && !tile.blocked), { timeout: 45000, message: 'A janela precisa receber imagens reais de satélite.' }).toBe(true)
        const tile = responses.get(candidate).find(tile => tile.status === 200 && tile.type?.includes('image/jpeg') && !tile.blocked)
        const url = new URL(tile.url)
        for (const parameter of ['key', 'token', 'apiKey', 'access_token']) assert.equal(url.searchParams.has(parameter), false)
        const decoded = await candidate.evaluate(async url => {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`Tile HTTP ${response.status}`)
          const blob = await response.blob()
          const bitmap = await createImageBitmap(blob)
          const result = { width: bitmap.width, height: bitmap.height, bytes: blob.size }
          bitmap.close()
          return result
        }, tile.url)
        assert.equal(decoded.width, 256)
        assert.equal(decoded.height, 256)
        assert(decoded.bytes > 1000)
        const credits = candidate.locator('.esri-attribution__sources')
        // O SDK mostra as fontes pertinentes à região/escala, além da marca Esri.
        await expect(credits).toContainText(/Earthstar Geographics|Vantor|GIS User Community/, { timeout: 15000 })
        await expect(candidate.locator('.esri-attribution')).toContainText('Esri')
        const attribution = await credits.innerText()
        result.windows.push({ window: windowName, sample: tile, decoded, attribution })
      }
      await checkImages(page, 'main')
      result.assertions.push('JPEG real decodificado, sem chave e com atribuição na janela principal')
      await page.getByTestId('draw-polygon').click()
      await expect.poll(() => page.evaluate(() => window.polygonTestApi?.getDrawingState?.().ready), { message: 'Execute electron:build:poc antes: o verificador utiliza a API de leitura da build E2E.' }).toBe(true)
      const rectangle = await page.getByTestId('arcgis-map').boundingBox()
      let vertices = 0
      for (const [dx, dy] of [[-120, -50], [0, -50], [-60, 50]]) {
        await page.mouse.click(rectangle.x + rectangle.width / 2 + dx, rectangle.y + rectangle.height / 2 + dy)
        vertices++
        await expect.poll(() => page.evaluate(() => window.polygonTestApi.getDrawingState().vertices)).toBe(vertices)
      }
      await page.getByTestId('finish-drawing').click()
      await expect(page.getByTestId('polygon-item')).toHaveCount(1)
      await expect(page.getByTestId('polygon-map-label')).toHaveText('Polígono 1')
      await page.screenshot({ path: join(directory, `${platform}-main.png`) })
      result.assertions.push('Desenho e rótulo sobre as imagens de satélite')
      const pending = page.waitForEvent('popup')
      await page.getByTestId('detach-map').click()
      const popup = await pending
      await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
      await checkImages(popup, 'map')
      await expect(popup.getByTestId('polygon-map-label')).toHaveText('Polígono 1')
      await page.locator('.polygon-label').click()
      await expect(page.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'edit')
      await page.getByTestId('draw-polygon').click()
      await popup.getByTestId('polygon-name').fill('Área satélite')
      await page.getByTestId('finish-drawing').click()
      await expect(page.locator('.polygon-label')).toHaveText('Área satélite')
      await expect(popup.getByTestId('polygon-map-label')).toHaveText('Área satélite')
      await popup.screenshot({ path: join(directory, `${platform}-map.png`) })
      result.assertions.push('Satélite na janela separada e edição sincronizada')
      await page.getByTestId('reunite-windows').click()
      await expect.poll(() => popup.isClosed()).toBe(true)
      await expect(page.getByTestId('arcgis-map')).toBeVisible()
      await expect(page.getByTestId('polygon-map-label')).toHaveText('Área satélite')
      assert.deepEqual(osmRequests, [])
      for (const tiles of responses.values()) assert(tiles.every(tile => tile.status === 200 && !tile.blocked), JSON.stringify(tiles))
      result.assertions.push('Reunião das telas preserva a área; nenhuma requisição ao antigo provedor')
    } catch (error) {
      result.status = 'failed'; result.error = error.stack ?? String(error); failed = true
    } finally {
      await app?.close()
      await browser?.close()
      if (profile) await rm(profile, { recursive: true, force: true })
      result.durationMs = Math.round(performance.now() - started)
      report.tests.push(result)
      await writeFile(join(directory, 'results.json'), JSON.stringify({ ...report, finishedAt: new Date().toISOString() }, null, 2))
      console.log(JSON.stringify(result))
    }
  }
} finally {
  preview.kill()
  await writeFile(join(directory, 'preview.log'), previewLog)
}
if (failed) process.exitCode = 1
