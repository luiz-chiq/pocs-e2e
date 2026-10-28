import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })

const triangle: Array<[number, number]> = [[-100, -40], [40, -40], [-30, 70]]

async function clickPoint(page: Page, [dx, dy]: [number, number]) {
  const box = await page.getByTestId('arcgis-map').boundingBox()
  if (!box) throw new Error('Mapa ausente')
  await page.mouse.click(box.x + box.width / 2 + dx, box.y + box.height / 2 + dy)
  await page.waitForTimeout(120)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

for (const count of [0, 1, 2]) {
  test(`não salva com ${count} pontos e permite continuar até formar um triângulo`, async ({ page }) => {
    await page.getByTestId('draw-polygon').click()
    for (const point of triangle.slice(0, count)) await clickPoint(page, point)
    await page.getByTestId('finish-drawing').click()
    await expect(page.getByRole('alert')).toContainText('pelo menos 3 pontos diferentes')
    await expect(page.getByTestId('polygon-item')).toHaveCount(0)
    await expect(page.getByTestId('finish-drawing')).toBeVisible()
    for (const point of triangle.slice(count)) await clickPoint(page, point)
    await page.getByTestId('finish-drawing').click()
    await expect(page.getByTestId('polygon-item')).toHaveCount(1)
    await expect(page.getByTestId('finish-drawing')).toBeHidden()
    await page.evaluate(async () => {
      const app = window as typeof window & { polygonTestApi: { waitForPersistence(): Promise<void> } }
      await app.polygonTestApi.waitForPersistence()
    })
    await page.reload()
    await expect(page.getByTestId('map-ready')).toBeVisible()
    await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  })
}

test('Enter não conta a posição do cursor como terceiro ponto', async ({ page }) => {
  await page.getByTestId('draw-polygon').click()
  for (const point of triangle.slice(0, 2)) await clickPoint(page, point)
  const box = await page.getByTestId('arcgis-map').boundingBox()
  if (!box) throw new Error('Mapa ausente')
  await page.mouse.move(box.x + box.width / 2 - 30, box.y + box.height / 2 + 70)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert')).toContainText('pelo menos 3 pontos diferentes')
  await expect(page.getByTestId('polygon-item')).toHaveCount(0)
  await clickPoint(page, triangle[2])
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
})

test('a validação acompanha desfazer e refazer vértices', async ({ page }) => {
  await page.getByTestId('draw-polygon').click()
  for (const point of triangle) await clickPoint(page, point)
  await page.keyboard.press('z')
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByRole('alert')).toContainText('pelo menos 3 pontos diferentes')
  await expect(page.getByTestId('polygon-item')).toHaveCount(0)
  await page.locator('#map .esri-view-surface').focus()
  await page.keyboard.press('r')
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
})

test('três pontos em linha não formam um polígono válido', async ({ page }) => {
  await page.getByTestId('draw-polygon').click()
  for (const point of [[-100, -40], [0, -40], [100, -40]] as Array<[number, number]>) await clickPoint(page, point)
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByRole('alert')).toContainText('formando uma área')
  await expect(page.getByTestId('polygon-item')).toHaveCount(0)
  await page.getByTestId('cancel-editing').click()
})

test('card seleciona sem editar e toque no desenho inicia edição imediatamente', async ({ page }) => {
  await page.getByTestId('draw-polygon').click()
  for (const point of triangle) await clickPoint(page, point)
  await page.getByTestId('finish-drawing').click()
  await page.getByTestId('polygon-item').click()
  await expect(page.locator('.vertex-list li')).toHaveCount(0)
  await page.getByTestId('expand-polygon').click()
  await expect(page.locator('.vertex-list li')).toHaveCount(3)
  await expect(page.getByTestId('draw-polygon')).toHaveAccessibleName('Editar polígono selecionado')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await page.getByTestId('draw-polygon').click()
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await page.getByTestId('cancel-editing').click()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'create')
  await clickPoint(page, [-30, 0])
  await expect(page.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'edit')
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await page.getByTestId('cancel-editing').click()
  await clickPoint(page, [-300, -150])
  await expect(page.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'create')
})

test('a janela principal recebe o alerta do mapa separado sem salvar um desenho vazio', async ({ page }) => {
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await popupPromise
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await page.getByTestId('draw-polygon').click()
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByRole('alert')).toContainText('pelo menos 3 pontos diferentes')
  await expect(popup.getByRole('alert')).toContainText('pelo menos 3 pontos diferentes')
  await expect(page.getByTestId('polygon-item')).toHaveCount(0)
  for (const point of triangle) await clickPoint(popup, point)
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await page.getByTestId('reunite-windows').click()
})
