import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })

async function createPolygon(page: Page) {
  const previousCount = await page.getByTestId('polygon-item').count()
  await page.getByTestId('draw-polygon').click()
  await page.waitForTimeout(200)
  const box = await page.getByTestId('arcgis-map').boundingBox()
  if (!box) throw new Error('Mapa ausente')
  for (const [x, y] of [[-100, -40], [40, -40], [-30, 70]]) {
    await page.mouse.click(box.x + box.width / 2 + x, box.y + box.height / 2 + y)
    await page.waitForTimeout(120)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(previousCount + 1)
}

async function editPolygon(page: Page) {
  await page.getByTestId('polygon-item').click()
  await page.getByTestId('draw-polygon').click()
  await expect(page.getByTestId('polygon-name')).toBeVisible()
}

async function waitForPersistence(page: Page) {
  await page.evaluate(async () => {
    const app = window as typeof window & { polygonTestApi: { waitForPersistence(): Promise<void> } }
    await app.polygonTestApi.waitForPersistence()
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

test('o nome vira input na edição, aceita acentos e fica salvo após recarregar', async ({ page }) => {
  await createPolygon(page)
  await expect(page.locator('.polygon-label')).toHaveText('Polígono 1')
  await expect(page.getByTestId('polygon-name')).toBeHidden()
  await editPolygon(page)
  const input = page.getByTestId('polygon-name')
  await expect(input).toHaveValue('Polígono 1')
  await expect(page.getByTestId('polygon-item').locator('.polygon-label')).toHaveCount(0)
  await input.fill('  Área   São José 12  ')
  await input.press('Enter')
  await expect(input).toBeHidden()
  await expect(page.locator('.polygon-label')).toHaveText('Área São José 12')
  await expect(page.getByTestId('delete-polygon')).toHaveAccessibleName('Excluir Área São José 12')
  await waitForPersistence(page)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('.polygon-label')).toHaveText('Área São José 12')
})

test('bloqueia nomes vazios e caracteres especiais, limita a 30 e cancela sem renomear', async ({ page }) => {
  await createPolygon(page)
  await editPolygon(page)
  const input = page.getByTestId('polygon-name')
  for (const value of ['   ', 'Área@1', 'Área-1', 'Área_1', 'Área 🌳']) {
    await input.fill(value)
    await page.getByTestId('finish-drawing').click()
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(page.getByTestId('finish-drawing')).toBeVisible()
  }
  await input.fill('A'.repeat(40))
  await expect(input).toHaveValue('A'.repeat(30))
  await input.press('End')
  await input.press('Delete')
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await page.getByTestId('cancel-editing').click()
  await expect(page.locator('.polygon-label')).toHaveText('Polígono 1')
  await waitForPersistence(page)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('.polygon-label')).toHaveText('Polígono 1')
})

test('salva um nome com exatamente 30 caracteres', async ({ page }) => {
  await createPolygon(page)
  await editPolygon(page)
  await page.getByTestId('polygon-name').fill('A'.repeat(30))
  await page.getByTestId('finish-drawing').click()
  await expect(page.locator('.polygon-label')).toHaveText('A'.repeat(30))
})

test('mantém a ordem dos cards e a seleção ao editar, salvar e cancelar nas duas telas', async ({ page }) => {
  await createPolygon(page)
  await createPolygon(page)
  const firstCard = page.getByTestId('polygon-item').first()
  await firstCard.click()
  await page.getByTestId('draw-polygon').click()
  await page.waitForTimeout(500)
  await expect(firstCard.getByTestId('polygon-name')).toHaveValue('Polígono 1')
  await page.getByTestId('cancel-editing').click()
  await expect(firstCard).toHaveClass(/selected/)
  await expect(page.locator('.polygon-label')).toHaveText(['Polígono 1', 'Polígono 2'])
  await page.getByTestId('draw-polygon').click()
  await page.getByTestId('polygon-name').fill('Área principal')
  await page.getByTestId('finish-drawing').click()
  await expect(page.locator('.polygon-label')).toHaveText(['Área principal', 'Polígono 2'])
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await popupPromise
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await firstCard.click()
  await page.getByTestId('draw-polygon').click()
  await page.waitForTimeout(500)
  await expect(firstCard.getByTestId('polygon-name')).toHaveValue('Área principal')
  await popup.getByTestId('cancel-editing').click()
  await expect(firstCard).toHaveClass(/selected/)
  await expect(page.locator('.polygon-label')).toHaveText(['Área principal', 'Polígono 2'])
  await page.getByTestId('reunite-windows').click()
  await waitForPersistence(page)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('.polygon-label')).toHaveText(['Área principal', 'Polígono 2'])
})

test('preserva polígonos antigos sem nome e atribui nomes estáveis', async ({ page }) => {
  await createPolygon(page)
  await waitForPersistence(page)
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve) => {
      const request = indexedDB.open('polygon-editor-poc', 1)
      request.onsuccess = () => resolve(request.result)
    })
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction('state', 'readwrite')
      const store = transaction.objectStore('state')
      const request = store.get('polygons')
      request.onsuccess = () => {
        const polygons = request.result
        delete polygons[0].attributes.name
        store.put(polygons, 'polygons')
      }
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
  })
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('.polygon-label')).toHaveText('Polígono 1')
  await editPolygon(page)
  await expect(page.getByTestId('polygon-name')).toHaveValue('Polígono 1')
  await page.getByTestId('cancel-editing').click()
  await expect(page.locator('.vertex-list li')).toHaveCount(3)
})

test('sincroniza nome, validação, foco e cancelamento nas duas janelas', async ({ page }) => {
  await createPolygon(page)
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await popupPromise
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await editPolygon(page)
  const input = page.getByTestId('polygon-name')
  const mapInput = popup.getByTestId('polygon-name')
  await expect(popup.locator('.map-window-menu').getByTestId('polygon-name')).toBeVisible()
  await input.fill('Área ')
  await input.pressSequentially('São José', { delay: 30 })
  await expect(input).toHaveValue('Área São José')
  await expect(input).toBeFocused()
  await expect(mapInput).toHaveValue('Área São José')
  await mapInput.fill('Área@1')
  await expect(input).toHaveValue('Área@1')
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByRole('alert')).toContainText('apenas letras')
  await expect(popup.getByRole('alert')).toContainText('apenas letras')
  await mapInput.fill('Área São José')
  await expect(input).toHaveValue('Área São José')
  await popup.reload()
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await expect(mapInput).toHaveValue('Área São José')
  await page.getByTestId('finish-drawing').click()
  await expect(page.locator('.polygon-label')).toHaveText('Área São José')
  await editPolygon(page)
  await mapInput.fill('Nome temporário')
  await expect(input).toHaveValue('Nome temporário')
  await popup.getByTestId('cancel-editing').click()
  await expect(page.locator('.polygon-label')).toHaveText('Área São José')
  await page.getByTestId('reunite-windows').click()
  await waitForPersistence(page)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('.polygon-label')).toHaveText('Área São José')
})

for (const width of [320, 800, 1280]) {
  test(`mensagens longas não cobrem os controles verticais com largura ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 })
    await page.getByTestId('draw-polygon').click()
    await page.getByTestId('finish-drawing').click()
    await expect(page.getByRole('alert')).toContainText('pelo menos 3 pontos')
    const message = await page.locator('.map-status').boundingBox()
    if (!message) throw new Error('Mensagem ausente')
    let lastBottom = 0
    let x = 0
    for (const id of ['zoom-in', 'zoom-out', 'north-up']) {
      const button = await page.getByTestId(id).boundingBox()
      if (!button) throw new Error('Controle ausente')
      if (lastBottom) {
        expect(button.y).toBeGreaterThan(lastBottom)
        expect(button.x).toBeCloseTo(x, 1)
      }
      expect(message.x).toBeGreaterThan(button.x + button.width)
      expect(message.x + message.width).toBeLessThanOrEqual(width)
      lastBottom = button.y + button.height
      x = button.x
    }
  })
}
