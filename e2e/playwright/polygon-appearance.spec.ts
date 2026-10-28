import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
type TestWindow = typeof window & { polygonTestApi: { getDrawingState(): { ready: boolean }; waitForPersistence(): Promise<void> } }

async function create(page: Page, color?: string) {
  await page.getByTestId('draw-polygon').click()
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().ready)).toBe(true)
  if (color) await page.getByRole('button', { name: color, exact: true }).click()
  const box = await page.getByTestId('arcgis-map').boundingBox()
  if (!box) throw new Error('Mapa ausente')
  for (const [x, y] of [[-70, -40], [50, -40], [-10, 65]]) {
    await page.mouse.click(box.x + box.width / 2 + x, box.y + box.height / 2 + y)
    await page.waitForTimeout(150)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
}

async function edit(page: Page) {
  await page.getByTestId('polygon-item').locator('.polygon-label').click()
  await page.getByTestId('draw-polygon').click()
  await expect(page.getByTestId('polygon-name')).toBeVisible()
}

async function savedAppearance(page: Page) {
  return page.evaluate(async () => {
    await (window as TestWindow).polygonTestApi.waitForPersistence()
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('polygon-editor-poc', 1)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    try {
      return await new Promise<{ attributes: { color: string }; symbol: { color: number[]; outline: { color: number[] } } }>((resolve, reject) => {
        const request = database.transaction('state', 'readonly').objectStore('state').get('polygons')
        request.onsuccess = () => resolve(request.result[0])
        request.onerror = () => reject(request.error)
      })
    } finally { database.close() }
  })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

test('cor escolhida na criação colore o símbolo, persiste e pode ser alterada ou cancelada', async ({ page }, testInfo) => {
  await create(page, 'Vermelho')
  let saved = await savedAppearance(page)
  expect(saved.attributes.color).toBe('#cf4949')
  expect(saved.symbol.outline.color.slice(0, 3)).toEqual([207, 73, 73])
  expect(saved.symbol.color.slice(0, 3)).toEqual([207, 73, 73])
  expect(saved.symbol.color[3]).toBe(128) // Aproximadamente 50% de opacidade no JSON ArcGIS (0–255).
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await page.getByTestId('polygon-item').locator('.polygon-label').click()
  await page.waitForTimeout(250)
  await page.screenshot({ path: testInfo.outputPath('white-selection-glow.png') })
  await page.getByTestId('draw-polygon').click()
  await expect(page.getByTestId('polygon-name')).toBeVisible()
  await page.waitForTimeout(250)
  await page.screenshot({ path: testInfo.outputPath('white-edit-outline.png') })
  await expect(page.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#cf4949')
  await page.getByRole('button', { name: 'Verde', exact: true }).click()
  await page.getByTestId('cancel-editing').click()
  await edit(page)
  await expect(page.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#cf4949')
  await page.getByRole('button', { name: 'Verde', exact: true }).click()
  await page.getByTestId('finish-drawing').click()
  saved = await savedAppearance(page)
  expect(saved.attributes.color).toBe('#23845b')
  expect(saved.symbol.outline.color.slice(0, 3)).toEqual([35, 132, 91])
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await edit(page)
  await expect(page.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#23845b')
})

test('nome não tem label visível e tooltip só aparece com erro ou a partir de 24 caracteres', async ({ page }) => {
  await create(page)
  await edit(page)
  const input = page.getByTestId('polygon-name')
  const tooltip = page.getByRole('tooltip')
  await expect(page.locator('label[for="polygon-name"]')).toHaveCount(0)
  await expect(input).toHaveAccessibleName('Nome do polígono')
  await expect(tooltip).toBeHidden()
  await input.fill('A'.repeat(23))
  await expect(tooltip).toBeHidden()
  await input.fill('A'.repeat(24))
  await expect(tooltip).toContainText('24/30 caracteres')
  await expect(input).toHaveAttribute('aria-describedby', 'polygon-name-error')
  await input.fill('A'.repeat(30))
  await expect(tooltip).toContainText('Limite atingido')
  await input.fill('Área!')
  await expect(tooltip).toContainText('Use apenas letras')
  await expect(input).toHaveAttribute('aria-invalid', 'true')
  await input.fill('Área válida')
  await expect(tooltip).toBeHidden()
  await expect(input).toHaveAttribute('aria-invalid', 'false')
  await input.fill('')
  await expect(tooltip).toContainText('Informe um nome')
  await page.getByTestId('cancel-editing').click()
  await expect(tooltip).toBeHidden()
})

test('cadeado e lixeira permanecem alinhados com nomes longos e durante edição, em desktop e celular', async ({ page }, testInfo) => {
  await create(page)
  await edit(page)
  await page.getByTestId('polygon-name').fill('A'.repeat(30))
  await page.getByTestId('finish-drawing').click()
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 })
    for (const editing of [false, true]) {
      if (editing) await edit(page)
      const lock = await page.getByTestId('toggle-polygon-lock').boundingBox()
      const remove = await page.getByTestId('delete-polygon').boundingBox()
      if (!lock || !remove) throw new Error('Ações ausentes')
      expect(lock.y + lock.height / 2).toBeCloseTo(remove.y + remove.height / 2, 1)
      expect(lock.height).toBe(remove.height)
      expect(remove.x).toBeGreaterThan(lock.x + lock.width)
      if (editing) {
        await page.screenshot({ path: testInfo.outputPath(`appearance-${width}.png`), fullPage: true })
        await page.getByTestId('cancel-editing').click()
        await expect(page.locator('.polygon-label')).toBeVisible()
      }
    }
  }
})

test('cor e tooltip sincronizam nas duas janelas; cancelar restaura e salvar persiste', async ({ page }) => {
  await create(page)
  const pendingPopup = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await pendingPopup
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await edit(page)
  await page.getByRole('button', { name: 'Verde', exact: true }).click()
  await expect(popup.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#23845b')
  await popup.getByRole('button', { name: 'Roxo', exact: true }).click()
  await expect(page.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#8756b3')
  await page.getByTestId('polygon-name').fill('A'.repeat(24))
  await expect(popup.getByRole('tooltip')).toContainText('24/30')
  await expect(page.getByRole('tooltip')).toContainText('24/30')
  await popup.getByTestId('cancel-editing').click()
  await edit(page)
  await expect(page.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#1261a0')
  await popup.getByRole('button', { name: 'Dourado', exact: true }).click()
  await expect(page.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#d6a323')
  await popup.reload()
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await expect(popup.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#d6a323')
  await page.getByTestId('finish-drawing').click()
  await expect(popup.getByTestId('finish-drawing')).toBeHidden()
  expect((await savedAppearance(popup)).attributes.color).toBe('#d6a323')
  await page.getByTestId('reunite-windows').click()
  await edit(page)
  await expect(page.locator('[data-testid="polygon-color-option"][aria-pressed="true"]')).toHaveAttribute('data-color', '#d6a323')
})
