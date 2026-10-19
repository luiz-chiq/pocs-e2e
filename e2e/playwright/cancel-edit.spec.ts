import { expect, test, type Locator, type Page } from '@playwright/test'

const polygonItems = (page: Page) => page.locator('[data-testid="polygon-item"]')

type ScreenPoint = { x: number; y: number }
type SelectedScreenPoints = { center: ScreenPoint; vertices: ScreenPoint[]; edgeMidpoint: ScreenPoint }

async function visualPause(page: Page) {
  if (process.env.HEADLESS === 'false') await page.waitForTimeout(1_500)
}

async function selectedScreenPoints(page: Page): Promise<SelectedScreenPoints> {
  // O SketchViewModel expõe o botão de cancelar antes de terminar de calcular
  // todas as alças de edição. Esperamos essa pequena janela de inicialização.
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const points = await page.evaluate(() => {
      const testWindow = window as typeof window & { polygonTestApi?: { getSelectedScreenPoints: () => SelectedScreenPoints } }
      try {
        return testWindow.polygonTestApi?.getSelectedScreenPoints() ?? null
      } catch {
        return null
      }
    })
    if (points) return points
    await page.waitForTimeout(100)
  }
  throw new Error('As coordenadas da edição não ficaram disponíveis.')
}

async function waitForPersistence(page: Page) {
  await page.evaluate(async () => {
    const testWindow = window as typeof window & {
      polygonTestApi?: { waitForPersistence: () => Promise<void> }
    }
    if (!testWindow.polygonTestApi) throw new Error('API de persistência E2E indisponível.')
    await testWindow.polygonTestApi.waitForPersistence()
  })
}

async function mapBox(map: Locator) {
  const box = await map.boundingBox()
  if (!box) throw new Error('Mapa não está visível.')
  return box
}

async function dragMapPoint(page: Page, point: ScreenPoint, deltaX: number, deltaY: number) {
  const box = await mapBox(page.getByTestId('arcgis-map'))
  const startX = box.x + point.x
  const startY = box.y + point.y
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.waitForTimeout(250)
  // Equivalente aos cinco pointerMove de 150 ms usados na suíte WebdriverIO.
  // O Sketch do ArcGIS precisa receber eventos espaçados para reconhecer um drag.
  const steps = 5
  for (let step = 1; step <= steps; step += 1) {
    await page.mouse.move(startX + (deltaX * step) / steps, startY + (deltaY * step) / steps)
    await page.waitForTimeout(150)
  }
  await page.waitForTimeout(250)
  await page.mouse.up()
}

async function clickMapPoint(page: Page, point: ScreenPoint) {
  const box = await mapBox(page.getByTestId('arcgis-map'))
  await page.mouse.click(box.x + point.x, box.y + point.y)
}

async function createPolygon(page: Page, points: Array<[number, number]>) {
  const map = page.getByTestId('arcgis-map')
  const box = await mapBox(map)
  const previousCount = await polygonItems(page).count()
  await page.getByTestId('draw-polygon').click()
  // O SDK ativa a ferramenta de forma assíncrona antes de receber o primeiro ponto.
  await page.waitForTimeout(300)
  for (const [x, y] of points) {
    // A suíte WebdriverIO usa coordenadas em relação ao centro do mapa.
    await page.mouse.click(box.x + box.width / 2 + x, box.y + box.height / 2 + y)
    // O SketchViewModel processa cada clique em um frame de renderização.
    await page.waitForTimeout(100)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(polygonItems(page)).toHaveCount(previousCount + 1)
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
}

async function clearPolygonsWithConfirmation(page: Page) {
  const clear = page.getByTestId('clear-polygons')
  if (await clear.isEnabled()) {
    await clear.click()
    await expect(page.locator('#clear-dialog')).toBeVisible()
    await page.locator('#confirm-clear').click()
    await expect(clear).toBeDisabled()
  }
}

async function waitForSketchEditing(page: Page) {
  // A visibilidade do botão ocorre antes da ativação das alças pelo ArcGIS.
  // WebdriverIO absorve esse intervalo por meio de seus comandos remotos;
  // em Playwright precisamos esperar explicitamente antes do primeiro gesto.
  await page.waitForTimeout(500)
}

test.describe('Editor de polígonos', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('map-ready')).toBeVisible()
    await clearPolygonsWithConfirmation(page)
  })

  test('cria, expande os vértices e mantém a edição até uma confirmação explícita', async ({ page }) => {
    await createPolygon(page, [[-120, -50], [0, -50], [-60, 50]])
    await expect(page.locator('#polygon-count')).toHaveText('1')
    await expect(page.getByTestId('clear-polygons')).toBeEnabled()
    await page.getByTestId('polygon-item').click()
    await expect(page.locator('.vertex-list li')).toHaveCount(3)
    await expect(page.getByTestId('expand-polygon')).toHaveAttribute('aria-expanded', 'true')
    await expect(page.getByTestId('polygon-item')).toHaveClass(/selected/)
    await page.locator('.polygon-label').click()
    await expect(page.locator('.vertex-list li')).toHaveCount(3)
    await expect(page.getByTestId('finish-drawing')).toBeHidden()
    await expect(page.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'edit')
    await page.getByTestId('draw-polygon').click()
    await expect(page.getByTestId('draw-polygon')).toBeHidden()
    await expect(page.getByTestId('finish-drawing')).toBeVisible()
    await expect(page.getByTestId('cancel-editing')).toBeVisible()
    const box = await mapBox(page.getByTestId('arcgis-map'))
    await page.mouse.click(box.x + 150, box.y + 120)
    await expect(page.getByTestId('cancel-editing')).toBeVisible()
    await page.getByTestId('finish-drawing').click()
    await expect(page.getByTestId('finish-drawing')).toBeHidden()
    await expect(page.getByTestId('draw-polygon')).toBeVisible()
  })

  test('restaura as coordenadas originais ao cancelar uma edição', async ({ page }) => {
    await createPolygon(page, [[-120, -50], [0, -50], [-60, 50]])
    await page.getByTestId('expand-polygon').click()
    const vertices = page.locator('.vertex-list')
    const originalCoordinates = await vertices.innerText()
    await page.locator('.polygon-label').click()
    await page.getByTestId('draw-polygon').click()
    await expect(page.getByTestId('cancel-editing')).toBeVisible()
    await waitForSketchEditing(page)
    await dragMapPoint(page, (await selectedScreenPoints(page)).vertices[0], 90, 50)
    await expect(page.getByTestId('last-edit')).toHaveText('Vértice ou aresta arrastada.')
    await expect.poll(() => vertices.innerText()).not.toBe(originalCoordinates)
    await page.getByTestId('cancel-editing').click()
    await expect.poll(() => vertices.innerText()).toBe(originalCoordinates)
  })

  test('move o polígono, arrasta um vértice e cria outro no meio da aresta', async ({ page }) => {
    await createPolygon(page, [[-120, -50], [0, -50], [-60, 50]])
    await page.getByTestId('expand-polygon').click()
    await page.locator('.polygon-label').click()
    await page.getByTestId('draw-polygon').click()
    await expect(page.getByTestId('cancel-editing')).toBeVisible()
    await waitForSketchEditing(page)
    await dragMapPoint(page, (await selectedScreenPoints(page)).center, 70, 40)
    await expect(page.getByTestId('last-edit')).toHaveText('Polígono movido.')
    await visualPause(page)
    await dragMapPoint(page, (await selectedScreenPoints(page)).vertices[0], 45, 35)
    await expect(page.getByTestId('last-edit')).toHaveText('Vértice ou aresta arrastada.')
    await visualPause(page)
    await clickMapPoint(page, (await selectedScreenPoints(page)).edgeMidpoint)
    await expect(page.locator('.vertex-list li')).toHaveCount(4)
    await visualPause(page)
  })

  test('persiste os polígonos após recarregar a aplicação', async ({ page }) => {
    await createPolygon(page, [[-120, -50], [0, -50], [-60, 50]])
    await waitForPersistence(page)
    await page.reload()
    await expect(page.getByTestId('map-ready')).toBeVisible()
    await expect(polygonItems(page)).toHaveCount(1)
    await expect(page.locator('#polygon-count')).toHaveText('1')
  })

  test('pede confirmação antes de excluir um polígono individual', async ({ page }) => {
    await createPolygon(page, [[-120, -50], [0, -50], [-60, 50]])
    await page.getByTestId('delete-polygon').click()
    await expect(page.locator('#clear-dialog')).toBeVisible()
    await expect(page.locator('#clear-dialog-title')).toHaveText('Apagar este polígono?')
    await page.locator('#dismiss-clear').click()
    await expect(polygonItems(page)).toHaveCount(1)
    await page.getByTestId('delete-polygon').click()
    await page.locator('#confirm-clear').click()
    await expect(polygonItems(page)).toHaveCount(0)
    await expect(page.getByTestId('clear-polygons')).toBeDisabled()
  })

  test('pede confirmação antes de apagar todos os polígonos', async ({ page }) => {
    await createPolygon(page, [[-120, -50], [0, -50], [-60, 50]])
    await createPolygon(page, [[40, -50], [140, -50], [90, 50]])
    await expect(polygonItems(page)).toHaveCount(2)
    await page.getByTestId('clear-polygons').click()
    await expect(page.locator('#clear-dialog-title')).toHaveText('Apagar todos os polígonos?')
    await page.locator('#dismiss-clear').click()
    await expect(polygonItems(page)).toHaveCount(2)
    await page.getByTestId('clear-polygons').click()
    await page.locator('#confirm-clear').click()
    await expect(polygonItems(page)).toHaveCount(0)
    await expect(page.getByTestId('clear-polygons')).toBeDisabled()
  })

})
