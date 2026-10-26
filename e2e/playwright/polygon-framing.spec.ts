import { expect, test, type Page } from '@playwright/test'

type Point = { x: number; y: number }
type TestWindow = typeof window & { polygonTestApi: {
  getDrawingState(): { ready: boolean }
  getSelectedScreenPoints(): { center: Point; vertices: Point[] }
} }

async function create(page: Page, offset = 0, locked = false) {
  const before = await page.getByTestId('polygon-item').count()
  await page.getByTestId('draw-polygon').click()
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().ready)).toBe(true)
  if (locked) await page.getByTestId('polygon-locked').check()
  const map = await page.getByTestId('arcgis-map').boundingBox()
  if (!map) throw new Error('Mapa ausente')
  for (const [x, y] of [[.18 + offset, .35], [.38 + offset, .35], [.28 + offset, .55]]) {
    await page.mouse.click(map.x + map.width * x, map.y + map.height * y)
    await page.waitForTimeout(150)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(before + 1)
}

async function expectFramed(page: Page) {
  await expect.poll(async () => {
    const map = await page.getByTestId('arcgis-map').boundingBox()
    if (!map) return false
    try {
      const { center, vertices } = await page.evaluate(() => (window as TestWindow).polygonTestApi.getSelectedScreenPoints())
      const xs = vertices.map((point) => point.x), ys = vertices.map((point) => point.y)
      const left = Math.min(...xs) / map.width, right = Math.max(...xs) / map.width
      const top = Math.min(...ys) / map.height, bottom = Math.max(...ys) / map.height
      const size = Math.max(right - left, bottom - top)
      return Math.hypot(center.x - map.width / 2, center.y - map.height / 2) < 2 &&
        Math.min(left, 1 - right, top, 1 - bottom) > .12 && size > .4 && size < .76
    } catch { return false }
  }, { message: 'Polígono deve ficar centralizado, com zoom útil e margem em todos os lados' }).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

for (const width of [1280, 390]) {
  test(`clique no card centraliza com margem e reenquadra após navegar, largura ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 })
    await create(page)
    await page.getByTestId('polygon-item').locator('.polygon-label').click()
    await expectFramed(page)
    await expect(page.getByTestId('finish-drawing')).toBeHidden()
    await expect(page.locator('.vertex-list li')).toHaveCount(3)
    await page.screenshot({ path: testInfo.outputPath(`framed-${width}.png`), fullPage: true })
    await page.getByTestId('zoom-out').click()
    await page.getByTestId('zoom-out').click()
    await page.getByTestId('polygon-item').locator('.polygon-label').click()
    await expectFramed(page)
  })
}

test('enquadra preservando a rotação da bússola', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await create(page)
  for (let step = 0; step < 3; step++) await page.getByTestId('north-up').press('ArrowRight')
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(45deg);')
  await page.getByTestId('polygon-item').locator('.polygon-label').click()
  await expectFramed(page)
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(45deg);')
})

test('enquadra polígonos travados pela lista quando o mapa está em outra janela', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await create(page, 0, true)
  const pendingPopup = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await pendingPopup
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await page.getByTestId('polygon-item').locator('.polygon-label').click()
  await expectFramed(popup)
  await expect(page.getByTestId('polygon-item')).toHaveClass(/selected/)
  await expect(page.getByTestId('draw-polygon')).toBeDisabled()
  await expect(popup.getByTestId('finish-drawing')).toBeHidden()
  await page.getByTestId('reunite-windows').click()
})

test('a última seleção prevalece quando os cards são clicados em sequência', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 })
  await create(page)
  await create(page, .4)
  await page.getByTestId('polygon-item').first().locator('.polygon-label').click()
  await page.getByTestId('polygon-item').last().locator('.polygon-label').click()
  await expect(page.getByTestId('polygon-item').last()).toHaveClass(/selected/)
  await expectFramed(page)
  await expect(page.locator('#map-instructions')).not.toContainText('Não foi possível')
})
