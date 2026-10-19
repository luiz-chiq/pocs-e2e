import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })

async function createPolygon(page: Page, offset: number) {
  const box = await page.getByTestId('arcgis-map').boundingBox()
  if (!box) throw new Error('Mapa ausente')
  await page.getByTestId('draw-polygon').click()
  await page.waitForTimeout(200)
  for (const [x, y] of [[-140 + offset, -40], [-40 + offset, -40], [-90 + offset, 60]]) {
    await page.mouse.click(box.x + box.width / 2 + x, box.y + box.height / 2 + y)
    await page.waitForTimeout(120)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
}

async function deleteWhileEditing(controls: Page, map: Page = controls) {
  await controls.getByTestId('polygon-item').first().click()
  await expect(controls.locator('.vertex-list li')).toHaveCount(3)
  const original = await controls.locator('.vertex-list li').allTextContents()
  await controls.getByTestId('draw-polygon').click()
  await expect(map.getByTestId('finish-drawing')).toBeVisible()
  await map.waitForTimeout(500)
  await map.locator('#map .esri-view-surface').focus()
  await map.keyboard.press('Delete')
  await expect(controls.getByTestId('polygon-item')).toHaveCount(1)
  await expect(map.locator('#map-instructions')).toContainText('Polígono apagado nesta edição')
  await expect(controls.getByTestId('finish-drawing')).toBeVisible()
  return original
}

async function reloadAndCount(page: Page, count: number) {
  await page.evaluate(async () => {
    const app = window as typeof window & { polygonTestApi: { waitForPersistence(): Promise<void> } }
    await app.polygonTestApi.waitForPersistence()
  })
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

test('salvar após Delete pede confirmação e persiste só a exclusão escolhida', async ({ page }) => {
  await deleteWhileEditing(page)
  await page.getByTestId('finish-drawing').click()
  await expect(page.locator('#deleted-edit-dialog')).toBeVisible()
  await expect(page.locator('#deleted-edit-description')).toContainText('restaurar o desenho original')
  await page.locator('#confirm-deleted-edit').click()
  await expect(page.locator('#deleted-edit-dialog')).toBeHidden()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.locator('#map-instructions')).toHaveText('Polígono 1 removido.')
  await reloadAndCount(page, 1)
})

for (const option of ['Cancelar edição', 'Escape', 'Cancelar direto']) {
  test(`${option} restaura o polígono apagado com Delete sem alterar o outro`, async ({ page }) => {
    const original = await deleteWhileEditing(page)
    if (option === 'Cancelar direto') {
      await page.getByTestId('cancel-editing').click()
    } else {
      await page.keyboard.press('Enter')
      await expect(page.locator('#deleted-edit-dialog')).toBeVisible()
      if (option === 'Escape') await page.keyboard.press('Escape')
      else await page.locator('#restore-deleted-edit').click()
    }
    await expect(page.locator('#deleted-edit-dialog')).toBeHidden()
    await expect(page.getByTestId('polygon-item')).toHaveCount(2)
    await expect(page.getByTestId('finish-drawing')).toBeHidden()
    await page.getByTestId('polygon-item').first().click()
    await expect(page.locator('.vertex-list li')).toHaveText(original)
    await reloadAndCount(page, 2)
  })
}

test('salvar pela tela principal e decidir em qualquer janela sincroniza exclusão e restauração', async ({ page }) => {
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await popupPromise
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  const original = await deleteWhileEditing(page, popup)
  await page.getByTestId('finish-drawing').click()
  await expect(page.locator('#deleted-edit-dialog')).toBeVisible()
  await expect(popup.locator('#deleted-edit-dialog')).toBeVisible()
  await page.locator('#restore-deleted-edit').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
  await expect(popup.locator('#deleted-edit-dialog')).toBeHidden()
  await page.getByTestId('polygon-item').first().click()
  await expect(page.locator('.vertex-list li')).toHaveText(original)
  await deleteWhileEditing(page, popup)
  await popup.getByTestId('finish-drawing').click()
  await expect(page.locator('#deleted-edit-dialog')).toBeVisible()
  await popup.locator('#confirm-deleted-edit').click()
  await expect(page.locator('#deleted-edit-dialog')).toBeHidden()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await page.getByTestId('reunite-windows').click()
  await reloadAndCount(page, 1)
})
