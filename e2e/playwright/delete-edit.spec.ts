import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
type Point = { x: number; y: number }
type TestWindow = typeof window & { polygonTestApi: {
  getDrawingState(): { ready: boolean; vertices: number }
  getMapState(): { stationary: boolean; editingReady: boolean }
  getSelectedScreenPoints(): { vertices: Point[] }
  waitForPersistence(): Promise<void>
} }

async function createPolygon(page: Page, offset: number) {
  const box = (await page.getByTestId('arcgis-map').boundingBox())!
  await page.getByTestId('draw-polygon').click()
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().ready)).toBe(true)
  let vertices = 0
  for (const [x, y] of [[-140 + offset, -40], [-40 + offset, -40], [-90 + offset, 60]]) {
    await page.mouse.click(box.x + box.width / 2 + x, box.y + box.height / 2 + y)
    vertices++
    await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(vertices)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
}

async function edit(controls: Page, map = controls) {
  await controls.getByTestId('polygon-item').first().click()
  await expect.poll(() => map.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().stationary)).toBe(true)
  await controls.getByTestId('draw-polygon').click()
  await expect(controls.getByTestId('finish-drawing')).toBeVisible()
  await expect.poll(() => map.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().editingReady)).toBe(true)
}

async function pressDelete(map: Page) {
  await map.locator('#map .esri-view-surface').focus()
  await map.keyboard.press('Delete')
  await expect(map.locator('#clear-dialog')).toBeVisible()
  // O desenho ainda existe enquanto a decisão não for tomada.
  await expect(map.getByTestId('polygon-map-label')).toHaveCount(2)
}

async function reloadAndCount(page: Page, count: number) {
  await page.evaluate(() => (window as TestWindow).polygonTestApi.waitForPersistence())
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('polygon-item')).toHaveCount(count)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await createPolygon(page, 0)
  await createPolygon(page, 230)
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
})

test('Delete em área apenas selecionada pede confirmação antes de excluir', async ({ page }) => {
  await page.getByTestId('polygon-item').first().click()
  await pressDelete(page)
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await page.locator('#dismiss-clear').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
  await pressDelete(page)
  await page.locator('#confirm-clear').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await reloadAndCount(page, 1)
})

test('confirmar Delete salva a exclusão e encerra a edição sem outro Salvar', async ({ page }) => {
  await edit(page)
  await page.getByTestId('polygon-name').fill('Rascunho')
  await pressDelete(page)
  await expect(page.locator('#clear-dialog-description')).toContainText('encerrará a edição')
  await page.locator('#confirm-clear').click()
  await expect(page.locator('#clear-dialog')).toBeHidden()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await expect(page.getByTestId('polygon-map-label')).toHaveText('Polígono 2')
  await reloadAndCount(page, 1)
})

for (const choice of ['Voltar', 'Escape']) {
  test(`${choice} cancela só a exclusão e mantém o rascunho em edição`, async ({ page }) => {
    await edit(page)
    await page.getByTestId('polygon-name').fill('Rascunho preservado')
    await pressDelete(page)
    if (choice === 'Escape') await page.keyboard.press('Escape')
    else await page.locator('#dismiss-clear').click()
    await expect(page.locator('#clear-dialog')).toBeHidden()
    await expect(page.getByTestId('finish-drawing')).toBeVisible()
    await expect(page.getByTestId('polygon-name')).toHaveValue('Rascunho preservado')
    await expect(page.getByTestId('polygon-item')).toHaveCount(2)
    await page.getByTestId('finish-drawing').click()
    await reloadAndCount(page, 2)
    await expect(page.locator('.polygon-label').first()).toHaveText('Rascunho preservado')
  })
}

test('Delete no campo de nome edita texto sem abrir exclusão do polígono', async ({ page }) => {
  await edit(page)
  const input = page.getByTestId('polygon-name')
  await input.fill('Reserva')
  await input.press('Home')
  await input.press('Delete')
  await expect(input).toHaveValue('eserva')
  await expect(page.locator('#clear-dialog')).toBeHidden()
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
})

test('duas janelas compartilham confirmação, cancelamento e exclusão definitiva', async ({ page }) => {
  const pending = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await pending
  await expect(popup.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await edit(page, popup)
  await page.getByTestId('polygon-name').fill('Rascunho entre telas')
  await expect(popup.getByTestId('polygon-name')).toHaveValue('Rascunho entre telas')
  await pressDelete(popup)
  await expect(page.locator('#clear-dialog')).toBeVisible()
  await page.locator('#dismiss-clear').click()
  await expect(popup.locator('#clear-dialog')).toBeHidden()
  await expect(page.getByTestId('polygon-name')).toHaveValue('Rascunho entre telas')
  await pressDelete(popup)
  await page.locator('#confirm-clear').click()
  await expect(popup.locator('#clear-dialog')).toBeHidden()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await expect(popup.getByTestId('polygon-map-label')).toHaveCount(1)
  await page.getByTestId('reunite-windows').click()
  await reloadAndCount(page, 1)
})

test('alças maiores permitem arrastar vértices e inserir pela alça intermediária', async ({ page }, testInfo) => {
  await edit(page)
  const points = () => page.evaluate(() => (window as TestWindow).polygonTestApi.getSelectedScreenPoints().vertices)
  const before = await points()
  const box = (await page.getByTestId('arcgis-map').boundingBox())!
  await page.screenshot({ path: testInfo.outputPath('larger-vertex-handles.png') })
  await page.mouse.move(box.x + before[0].x, box.y + before[0].y)
  await page.mouse.down()
  await page.mouse.move(box.x + before[0].x + 35, box.y + before[0].y + 25, { steps: 10 })
  await page.mouse.up()
  await expect.poll(async () => Math.hypot((await points())[0].x - before[0].x, (await points())[0].y - before[0].y)).toBeGreaterThan(20)
  const changed = await points()
  await page.mouse.click(box.x + (changed[0].x + changed[1].x) / 2, box.y + (changed[0].y + changed[1].y) / 2)
  await expect(page.locator('.vertex-list li')).toHaveCount(4)
  await page.getByTestId('finish-drawing').click()
  await reloadAndCount(page, 2)
})
