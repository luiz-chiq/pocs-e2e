import { expect, test, type Page } from '@playwright/test'

async function separateMap(page: Page) {
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await popupPromise
  await expect(page.locator('#connection-status')).toHaveText('Mapa conectado. Alterações sincronizadas.')
  await expect(popup.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('arcgis-map')).toBeHidden()
  await expect(popup.locator('.polygon-sidebar')).toBeHidden()
  return popup
}

async function drawTriangle(mapPage: Page, controlsPage = mapPage) {
  const map = await mapPage.getByTestId('arcgis-map').boundingBox()
  if (!map) throw new Error('Mapa ausente')
  if (controlsPage === mapPage) await mapPage.getByTestId('draw-polygon').click()
  else await controlsPage.getByTestId('draw-polygon').click()
  await expect(mapPage.getByTestId('finish-drawing')).toBeVisible()
  await mapPage.waitForTimeout(150)
  for (const [x, y] of [[-100, -40], [20, -40], [-40, 70]]) {
    await mapPage.mouse.click(map.x + map.width / 2 + x, map.y + map.height / 2 + y)
    await mapPage.waitForTimeout(150)
  }
  if (controlsPage === mapPage) await mapPage.getByTestId('finish-drawing').click()
  else await controlsPage.getByTestId('finish-drawing').click()
  await expect(mapPage.getByTestId('finish-drawing')).toBeHidden()
}

async function moveVertex(mapPage: Page) {
  await expect(mapPage.getByTestId('cancel-editing')).toBeVisible()
  await mapPage.waitForTimeout(500)
  const vertex = await mapPage.evaluate(() => {
    const app = window as typeof window & {
      polygonTestApi: { getSelectedScreenPoints(): { vertices: Array<{ x: number; y: number }> } }
    }
    return app.polygonTestApi.getSelectedScreenPoints().vertices[0]
  })
  const box = await mapPage.getByTestId('arcgis-map').boundingBox()
  if (!box) throw new Error('Mapa ausente')
  await mapPage.mouse.move(box.x + vertex.x, box.y + vertex.y)
  await mapPage.mouse.down()
  for (let step = 1; step <= 5; step++) {
    await mapPage.mouse.move(box.x + vertex.x + step * 9, box.y + vertex.y + step * 6)
    await mapPage.waitForTimeout(150)
  }
  await mapPage.mouse.up()
  await expect(mapPage.getByTestId('last-edit')).toHaveText('Vértice ou aresta arrastada.')
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

test('sincroniza criação, edição, cancelamento e exclusão entre as janelas', async ({ page }) => {
  const popup = await separateMap(page)
  await drawTriangle(popup, page)
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await page.getByTestId('expand-polygon').click()
  await expect(page.locator('.vertex-list li')).toHaveCount(3)
  const original = await page.locator('.vertex-list').innerText()

  await page.locator('.polygon-label').click()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(popup.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'edit')
  await page.getByTestId('draw-polygon').click()
  await moveVertex(popup)
  await expect.poll(() => page.locator('.vertex-list').innerText()).not.toBe(original)
  await page.getByTestId('cancel-editing').click()
  await expect.poll(() => page.locator('.vertex-list').innerText()).toBe(original)

  await page.locator('.polygon-label').click()
  await page.getByTestId('draw-polygon').click()
  await moveVertex(popup)
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect.poll(() => page.locator('.vertex-list').innerText()).not.toBe(original)
  const edited = await page.locator('.vertex-list').innerText()

  // Recarregar o mapa usa o estado da sessão, inclusive seleção e vértices expandidos.
  await popup.reload()
  await expect(page.locator('#connection-status')).toHaveText('Mapa conectado. Alterações sincronizadas.')
  await expect(popup.getByTestId('map-ready')).toBeVisible()
  await expect.poll(() => page.locator('.vertex-list').innerText()).toBe(edited)

  await page.getByTestId('delete-polygon').click()
  await page.locator('#confirm-clear').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(0)
  await expect(popup.getByTestId('polygon-item')).toHaveCount(0)
  await popup.getByTestId('return-map').click()
  await expect(page.getByTestId('arcgis-map')).toBeVisible()
  await expect.poll(() => popup.isClosed()).toBe(true)
})

test('transfere os polígonos existentes e restaura o mapa ao fechar a janela', async ({ page }) => {
  await drawTriangle(page)
  await page.getByTestId('expand-polygon').click()
  const original = await page.locator('.vertex-list').innerText()
  const popup = await separateMap(page)
  await expect(popup.getByTestId('polygon-item')).toHaveCount(1)
  await page.locator('.polygon-label').click()
  await page.getByTestId('draw-polygon').click()
  await moveVertex(popup)
  await expect.poll(() => page.locator('.vertex-list').innerText()).not.toBe(original)
  // Fechar com edição pendente restaura a última geometria confirmada.
  await popup.close()
  await expect(page.getByTestId('arcgis-map')).toBeVisible()
  await expect.poll(() => page.locator('.vertex-list').innerText()).toBe(original)
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
})

test('reúne pela janela principal e permite separar novamente sem duplicar polígonos', async ({ page }) => {
  const first = await separateMap(page)
  await drawTriangle(first)
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await page.getByTestId('reunite-windows').click()
  await expect(page.getByTestId('arcgis-map')).toBeVisible()
  await expect.poll(() => first.isClosed()).toBe(true)
  const second = await separateMap(page)
  await expect(second.getByTestId('polygon-item')).toHaveCount(1)
  await page.getByTestId('clear-polygons').click()
  await page.locator('#confirm-clear').click()
  await expect(second.getByTestId('polygon-item')).toHaveCount(0)
  await second.close()
})

test('mantém o mapa na tela quando o navegador bloqueia o pop-up', async ({ page }) => {
  await page.evaluate(() => { window.open = () => null })
  await page.getByTestId('detach-map').click()
  await expect(page.locator('#window-feedback')).toContainText('Permita pop-ups')
  await expect(page.getByTestId('arcgis-map')).toBeVisible()
  await expect(page.locator('#detached-tools')).toBeHidden()
})

test('fecha o mapa separado ao recarregar a janela principal', async ({ page }) => {
  const popup = await separateMap(page)
  await drawTriangle(popup)
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await popup.evaluate(async () => {
    const app = window as typeof window & { polygonTestApi: { waitForPersistence(): Promise<void> } }
    await app.polygonTestApi.waitForPersistence()
  })
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await expect(page.getByTestId('arcgis-map')).toBeVisible()
  await expect.poll(() => popup.isClosed()).toBe(true)
})
