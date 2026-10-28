import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
type SavedPolygon = { attributes: { polygonId: string; name: string; color: string; locked: boolean }; geometry: { rings: number[][][] } }
type TestWindow = typeof window & { polygonTestApi: {
  getDrawingState(): { ready: boolean; vertices: number }
  getMapState(): { stationary: boolean; editingReady: boolean }
  getSelectedScreenPoints(id?: string): { center: { x: number; y: number } }
  waitForPersistence(): Promise<void>
} }

async function saved(page: Page): Promise<SavedPolygon[]> {
  return page.evaluate(async () => {
    await (window as TestWindow).polygonTestApi.waitForPersistence()
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('polygon-editor-poc', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise((resolve, reject) => {
        const request = database.transaction('state', 'readonly').objectStore('state').get('polygons')
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    } finally { database.close() }
  })
}

async function draw(mapPage: Page, options: { offset?: number; color?: string; controls?: Page; locked?: boolean; save?: boolean } = {}) {
  const controls = options.controls ?? mapPage
  await controls.keyboard.press('Escape')
  await controls.getByTestId('draw-polygon').click()
  await expect.poll(() => mapPage.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().ready)).toBe(true)
  if (options.color) await controls.getByRole('button', { name: options.color, exact: true }).click()
  if (options.locked) await controls.getByTestId('polygon-locked').check()
  const box = (await mapPage.getByTestId('arcgis-map').boundingBox())!
  let vertices = 0
  for (const [x, y] of [[-100, -65], [70, -65], [-15, 85]]) {
    await mapPage.mouse.click(box.x + box.width / 2 + x + (options.offset ?? 0), box.y + box.height / 2 + y)
    vertices++
    await expect.poll(() => mapPage.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(vertices)
  }
  if (options.save !== false) {
    await controls.getByTestId('finish-drawing').click()
    await expect(controls.getByTestId('finish-drawing')).toBeHidden()
  }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

test('oferece somente as seis cores fixas, também no celular', async ({ page }) => {
  await page.getByTestId('draw-polygon').click()
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(page.getByTestId('polygon-color-option')).toHaveCount(6)
    await expect(page.locator('input[type="color"]')).toHaveCount(0)
    for (const name of ['Azul', 'Verde', 'Dourado', 'Vermelho', 'Roxo', 'Rosa']) {
      await page.getByRole('button', { name, exact: true }).click()
      await expect(page.getByRole('button', { name, exact: true })).toHaveAttribute('aria-pressed', 'true')
    }
  }
})

test('criação sobreposta funde e persiste a união; cancelar não modifica o original', async ({ page }) => {
  await draw(page)
  const original = await saved(page)
  await draw(page, { offset: 45, save: false })
  await page.getByTestId('cancel-editing').click()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  expect(await saved(page)).toEqual(original)
  await draw(page, { offset: 45 })
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await expect(page.locator('#map-instructions')).toContainText('fundidos')
  const merged = await saved(page)
  expect(merged[0].geometry).not.toEqual(original[0].geometry)
  expect(merged[0].attributes.color).toBe('#1261a0')
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  expect(await saved(page)).toEqual(merged)
})

test('cores diferentes ficam separadas; trocar a cor só funde ao salvar e mantém o nome editado', async ({ page }) => {
  await draw(page)
  await draw(page, { offset: 45, color: 'Verde' })
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
  const original = await saved(page)
  await page.getByTestId('polygon-item').last().locator('.polygon-label').click()
  await page.getByTestId('draw-polygon').click()
  await page.getByRole('button', { name: 'Azul', exact: true }).click()
  await page.getByTestId('cancel-editing').click()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  expect(await saved(page)).toEqual(original)
  await page.getByTestId('polygon-item').last().locator('.polygon-label').click()
  await page.getByTestId('draw-polygon').click()
  await page.getByTestId('polygon-name').fill('Área unida')
  await page.getByRole('button', { name: 'Azul', exact: true }).click()
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  expect((await saved(page))[0].attributes.name).toBe('Área unida')
})

test('fusão preserva o bloqueio de uma área travada', async ({ page }) => {
  await draw(page, { locked: true })
  await draw(page, { offset: 45 })
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  expect((await saved(page))[0].attributes.locked).toBe(true)
  await expect(page.getByTestId('polygon-item').getByTestId('toggle-polygon-lock')).toHaveAttribute('aria-label', /Destravar/)
})

test('a fusão feita no mapa separado atualiza a lista e os rótulos nas duas janelas', async ({ page }) => {
  await draw(page)
  const pending = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await pending
  await popup.setViewportSize({ width: 1280, height: 800 })
  await expect(popup.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await draw(popup, { offset: 45, controls: page })
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await expect(popup.getByTestId('polygon-map-label')).toHaveCount(1)
  await expect(page.locator('#map-instructions')).toContainText('fundidos')
  expect(await saved(page)).toEqual(await saved(popup))
})

test('mover uma área até outra da mesma cor funde somente ao concluir a edição', async ({ page }) => {
  await draw(page)
  await draw(page, { offset: 220 })
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
  const firstId = (await saved(page))[0].attributes.polygonId
  await page.getByTestId('polygon-item').last().locator('.polygon-label').click()
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().stationary)).toBe(true)
  for (let index = 0; index < 3; index++) {
    await page.getByTestId('zoom-out').click()
    await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().stationary)).toBe(true)
  }
  await page.getByTestId('draw-polygon').click()
  await page.getByTestId('polygon-name').fill('Área movida')
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().editingReady)).toBe(true)
  const centers = await page.evaluate(id => ({
    from: (window as TestWindow).polygonTestApi.getSelectedScreenPoints().center,
    to: (window as TestWindow).polygonTestApi.getSelectedScreenPoints(id).center
  }), firstId)
  const box = (await page.getByTestId('arcgis-map').boundingBox())!
  await page.mouse.move(box.x + centers.from.x, box.y + centers.from.y)
  await page.mouse.down()
  await page.mouse.move(box.x + centers.to.x, box.y + centers.to.y, { steps: 20 })
  await page.mouse.up()
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  expect((await saved(page)).length).toBe(2)
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  expect((await saved(page))[0].attributes.name).toBe('Área movida')
})

test('renderer normaliza cores antigas e funde tanto na importação quanto ao carregar dados antigos', async ({ page }) => {
  const geometry = { rings: [[[-46.64, -23.55], [-46.63, -23.54], [-46.62, -23.56], [-46.64, -23.55]]], spatialReference: { wkid: 4326 } }
  await page.addInitScript(geometry => {
    // O seletor nativo não faz parte deste cenário do renderer.
    window.polygonFiles = {
      importPolygons: async () => ({ status: 'success', fileName: 'antigo.json', polygons: [
        { name: 'Área antiga', color: '#cf4948', geometry },
        { name: 'Área sobreposta', color: '#cf4949', geometry }
      ] }),
      exportPolygons: async () => ({ status: 'cancelled' })
    }
  }, geometry)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await page.getByTestId('import-polygons').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  const imported = await saved(page)
  expect(imported[0].attributes.color).toBe('#cf4949')
  expect(imported[0].attributes.name).toBe('Área antiga')
  await page.evaluate(async polygons => {
    const first = structuredClone(polygons[0])
    first.attributes.color = '#cf4948'
    const second = structuredClone(first)
    second.attributes.polygonId = 'old-overlapping-area'
    second.attributes.name = 'Outra área antiga'
    const database = await new Promise<IDBDatabase>(resolve => {
      const request = indexedDB.open('polygon-editor-poc', 1)
      request.onsuccess = () => resolve(request.result)
    })
    try {
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction('state', 'readwrite')
        transaction.objectStore('state').put([first, second], 'polygons')
        transaction.oncomplete = () => resolve()
        transaction.onerror = () => reject(transaction.error)
      })
    } finally { database.close() }
  }, imported)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  expect((await saved(page))[0].attributes.color).toBe('#cf4949')
})
