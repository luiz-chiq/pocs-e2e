import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })

type Point = { x: number; y: number }
const triangle = [[-100, -40], [40, -40], [-30, 70]]

async function createPolygon(page: Page, points = triangle) {
  const map = await page.getByTestId('arcgis-map').boundingBox()
  if (!map) throw new Error('Mapa ausente')
  await page.getByTestId('draw-polygon').click()
  await page.waitForTimeout(300)
  const screenPoints: Point[] = []
  for (const [x, y] of points) {
    const point = { x: map.x + map.width / 2 + x, y: map.y + map.height / 2 + y }
    screenPoints.push(point)
    await page.mouse.click(point.x, point.y)
    await page.waitForTimeout(150)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await expect(page.getByTestId('polygon-map-label')).toBeVisible()
  return screenPoints
}

async function labelCenter(page: Page) {
  const box = await page.getByTestId('polygon-map-label').boundingBox()
  if (!box) throw new Error('Nome no mapa ausente')
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

async function vertices(page: Page) {
  return page.evaluate(() => {
    const app = window as typeof window & { polygonTestApi: { getSelectedScreenPoints(): { vertices: Point[] } } }
    return app.polygonTestApi.getSelectedScreenPoints().vertices
  })
}

async function expectAtTriangleCenter(page: Page) {
  await expect.poll(async () => {
    const map = await page.getByTestId('arcgis-map').boundingBox()
    if (!map) throw new Error('Mapa ausente')
    const points = await vertices(page)
    const actual = await labelCenter(page)
    const expected = points.reduce((sum, point) => ({ x: sum.x + point.x / 3, y: sum.y + point.y / 3 }), { x: map.x, y: map.y })
    return Math.hypot(actual.x - expected.x, actual.y - expected.y)
  }).toBeLessThan(2)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

test('Enter edita a seleção do card, toque edita o mapa e o nome acompanha edição e recarregamento', async ({ page }) => {
  await createPolygon(page)
  await expect(page.getByTestId('polygon-map-label')).toHaveText('Polígono 1')
  await page.getByTestId('polygon-item').click()
  await expectAtTriangleCenter(page)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('polygon-name')).toBeVisible()
  await page.getByTestId('polygon-name').fill('Área São José')
  await expect(page.getByTestId('polygon-map-label')).toHaveText('Área São José')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('polygon-map-label')).toHaveText('Polígono 1')
  await page.locator('.polygon-label').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('polygon-name')).toBeVisible()
  await page.getByTestId('polygon-name').fill('Área São José')
  await page.getByTestId('polygon-name').press('Enter')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.getByTestId('polygon-map-label')).toHaveText('Área São José')
  await page.keyboard.press('Escape')
  const point = await labelCenter(page)
  await page.mouse.click(point.x, point.y)
  await expect(page.getByTestId('polygon-item')).toHaveClass(/selected/)
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await expect(page.getByTestId('polygon-name')).toHaveValue('Área São José')
  await page.getByTestId('cancel-editing').click()
  await page.evaluate(async () => {
    const app = window as typeof window & { polygonTestApi: { waitForPersistence(): Promise<void> } }
    await app.polygonTestApi.waitForPersistence()
  })
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('polygon-map-label')).toHaveText('Área São José')
})

test('o nome acompanha zoom, rotação, navegação e vértices sem interferir nos atalhos dos controles', async ({ page }) => {
  await createPolygon(page)
  await page.getByTestId('polygon-item').click()
  await expectAtTriangleCenter(page)
  await page.getByTestId('zoom-in').press('Enter')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await page.waitForTimeout(600)
  await expectAtTriangleCenter(page)
  await page.getByTestId('north-up').press('ArrowRight')
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(15deg);')
  await expectAtTriangleCenter(page)
  await page.getByTestId('north-up').press('Enter')
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(0deg);')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  const map = await page.getByTestId('arcgis-map').boundingBox()
  if (!map) throw new Error('Mapa ausente')
  const before = await labelCenter(page)
  await page.mouse.move(map.x + map.width / 2 + 250, map.y + map.height / 2 + 150)
  await page.mouse.down()
  await page.mouse.move(map.x + map.width / 2 + 310, map.y + map.height / 2 + 190, { steps: 8 })
  await page.mouse.up()
  await expect.poll(async () => Math.hypot((await labelCenter(page)).x - before.x, (await labelCenter(page)).y - before.y)).toBeGreaterThan(20)
  await expectAtTriangleCenter(page)
  // Após zoom e pan, os vértices podem estar fora da tela. Reenquadrar pela UI.
  await page.getByTestId('polygon-item').locator('.polygon-label').click()
  await expect.poll(() => page.evaluate(() => (window as typeof window & {
    polygonTestApi: { getMapState(): { stationary: boolean } }
  }).polygonTestApi.getMapState().stationary)).toBe(true)
  await page.locator('#map .esri-view-surface').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('polygon-name')).toBeVisible()
  await expect.poll(() => page.evaluate(() => (window as typeof window & {
    polygonTestApi: { getMapState(): { editingReady: boolean } }
  }).polygonTestApi.getMapState().editingReady)).toBe(true)
  const vertex = (await vertices(page))[0]
  expect(vertex.x).toBeGreaterThan(20)
  expect(vertex.x).toBeLessThan(map.width - 20)
  expect(vertex.y).toBeGreaterThan(100)
  expect(vertex.y).toBeLessThan(map.height - 20)
  await page.mouse.move(map.x + vertex.x, map.y + vertex.y)
  await page.mouse.down()
  await page.waitForTimeout(200)
  for (let step = 1; step <= 5; step++) {
    await page.mouse.move(map.x + vertex.x + step * 12, map.y + vertex.y + step * 7)
    await page.waitForTimeout(150)
  }
  await page.mouse.up()
  await expect(page.getByTestId('last-edit')).toHaveText('Vértice ou aresta arrastada.')
  await expectAtTriangleCenter(page)
  await page.getByTestId('cancel-editing').click()
  await expectAtTriangleCenter(page)
})

test('dois Enters rápidos iniciam e concluem a edição sem deixar a ferramenta presa', async ({ page }) => {
  await createPolygon(page)
  await page.getByTestId('polygon-item').click()
  await page.locator('#map .esri-view-surface').focus()
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await expect(page.getByTestId('finish-drawing')).toBeHidden()
    await expect(page.getByTestId('polygon-map-label')).toHaveText('Polígono 1')
    await expect(page.getByTestId('polygon-item')).toHaveClass(/selected/)
  }
})

test('o nome fica dentro de áreas côncavas', async ({ page }) => {
  const points = await createPolygon(page, [[-140, -100], [100, -100], [100, -40], [-60, -40], [-60, 120], [-140, 120]])
  const point = await labelCenter(page)
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i], b = points[j]
    if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) inside = !inside
  }
  expect(inside).toBe(true)
})

test('Enter e nomes funcionam nas duas janelas, incluindo exclusão e restauração', async ({ page }) => {
  await createPolygon(page)
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await popupPromise
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await expect(popup.getByTestId('polygon-map-label')).toHaveText('Polígono 1')
  await page.getByTestId('polygon-item').click()
  await expect(page.getByTestId('polygon-item')).toHaveClass(/selected/)
  await page.keyboard.press('Enter')
  await expect(popup.getByTestId('polygon-name')).toBeVisible()
  await page.getByTestId('polygon-name').fill('Reserva Rio Verde')
  await expect(popup.getByTestId('polygon-map-label')).toHaveText('Reserva Rio Verde')
  await popup.getByTestId('polygon-name').press('Enter')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  const point = await labelCenter(popup)
  await popup.mouse.click(point.x, point.y)
  await expect(popup.getByTestId('polygon-name')).toBeVisible()
  await popup.waitForTimeout(500)
  await popup.locator('#map .esri-view-surface').focus()
  await popup.keyboard.press('Delete')
  await expect(popup.getByTestId('polygon-map-label')).toHaveCount(1)
  await expect(popup.locator('#clear-dialog')).toBeVisible()
  await popup.locator('#dismiss-clear').click()
  await page.getByTestId('cancel-editing').click()
  await expect(popup.getByTestId('polygon-map-label')).toHaveText('Reserva Rio Verde')
  await page.getByTestId('reunite-windows').click()
  await expect(page.getByTestId('polygon-map-label')).toHaveText('Reserva Rio Verde')
  await expect(page.getByTestId('polygon-map-label')).toBeVisible()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
})
