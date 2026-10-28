import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
type TestWindow = typeof window & { polygonTestApi: {
  getDrawingState(): { ready: boolean; vertices: number }
  getMapState(): { stationary: boolean; editingReady: boolean; selectedId: string | null }
  waitForPersistence(): Promise<void>
} }
async function create(page: Page, offset = 0) {
  await page.keyboard.press('n')
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().ready)).toBe(true)
  const map = (await page.getByTestId('arcgis-map').boundingBox())!
  let count = 0
  for (const [x, y] of [[-80, -50], [50, -50], [-15, 65]]) {
    await page.mouse.click(map.x + map.width / 2 + x + offset, map.y + map.height / 2 + y)
    count++
    await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(count)
  }
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
}
async function edit(controls: Page, map = controls) {
  await controls.getByTestId('polygon-item').first().locator('.polygon-label').click()
  await expect.poll(() => map.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().stationary)).toBe(true)
  await controls.keyboard.press('e')
  await expect(controls.getByTestId('polygon-name')).toBeVisible()
  await expect.poll(() => map.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().editingReady)).toBe(true)
}
async function escape(page: Page) {
  await page.locator('#map .esri-view-surface').focus()
  await page.keyboard.press('Escape')
}
async function deselected(page: Page) {
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.locator('[data-testid="polygon-item"].selected')).toHaveCount(0)
  await expect(page.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'create')
}
async function persist(page: Page) { await page.evaluate(() => (window as TestWindow).polygonTestApi.waitForPersistence()) }

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

test('switch fica na linha de Separar mapa e o modal funciona em desktop e celular', async ({ page }, testInfo) => {
  for (const width of [1280, 375]) {
    await page.setViewportSize({ width, height: 800 })
    await page.getByTestId('keyboard-shortcuts-enabled').scrollIntoViewIfNeeded()
    const toggle = (await page.getByTestId('keyboard-shortcuts-enabled').boundingBox())!
    const detach = (await page.getByTestId('detach-map').boundingBox())!
    const gear = (await page.getByTestId('keyboard-shortcuts-settings').boundingBox())!
    expect(toggle.y + toggle.height / 2).toBeCloseTo(detach.y + detach.height / 2, 0)
    expect(gear.y + gear.height / 2).toBeCloseTo(detach.y + detach.height / 2, 0)
    expect(gear.x + gear.width).toBeLessThanOrEqual(width)
    await page.getByTestId('keyboard-shortcuts-settings').click()
    const modal = page.getByRole('dialog', { name: 'Atalhos de teclado', exact: true })
    await expect(modal).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`shortcuts-modal-${width}.png`) })
    await page.keyboard.press('Escape')
    await expect(modal).toBeHidden()
  }
})

test('expandir e selecionar são independentes, inclusive ao recolher o card', async ({ page }) => {
  await create(page, -160)
  await create(page, 160)
  const first = page.getByTestId('polygon-item').first(), last = page.getByTestId('polygon-item').last()
  await first.getByTestId('expand-polygon').click()
  await expect(first.locator('.vertex-list li')).toHaveCount(3)
  await expect(page.locator('.pin.selected')).toHaveCount(0)
  await expect(page.getByTestId('draw-polygon')).toHaveAttribute('data-mode', 'create')
  await last.locator('.polygon-label').click()
  await expect(last).toHaveClass(/selected/)
  await expect(last.locator('.vertex-list')).toHaveCount(0)
  await expect(first.locator('.vertex-list li')).toHaveCount(3)
  await first.getByTestId('expand-polygon').click()
  await expect(first.locator('.vertex-list')).toHaveCount(0)
  await expect(last).toHaveClass(/selected/)
  await last.locator('.polygon-label').click()
  await expect(last.getByTestId('expand-polygon')).toHaveAttribute('aria-expanded', 'false')
  await page.keyboard.press('Escape')
  await expect(page.locator('.pin.selected')).toHaveCount(0)
})

test('foco do mapa não desenha a borda azul; Esc sem alterações sai e desseleciona', async ({ page }) => {
  await create(page)
  await edit(page)
  const surface = page.locator('#map .esri-view-surface')
  await surface.focus()
  expect(await surface.evaluate(element => getComputedStyle(element, '::after').outlineStyle)).toBe('none')
  await page.keyboard.press('Escape')
  await expect(page.locator('#unsaved-edit-dialog')).toBeHidden()
  await deselected(page)
})

test('Esc detecta nome alterado, permite continuar e descartar sem salvar', async ({ page }) => {
  await create(page)
  await edit(page)
  await page.getByTestId('polygon-name').fill('Rascunho')
  await escape(page)
  await expect(page.locator('#unsaved-edit-dialog')).toBeVisible()
  await page.locator('#stay-editing').click()
  await expect(page.getByTestId('polygon-name')).toHaveValue('Rascunho')
  await escape(page)
  await page.locator('#discard-and-exit').click()
  await deselected(page)
  await expect(page.locator('.polygon-label')).toHaveText('Polígono 1')
})

test('salvar ao sair preserva nome, cor e bloqueio, e limpa a seleção', async ({ page }) => {
  await create(page)
  await edit(page)
  await page.getByTestId('polygon-name').fill('Área salva')
  await page.getByRole('button', { name: 'Roxo', exact: true }).click()
  await page.getByTestId('polygon-locked').check()
  await escape(page)
  await expect(page.locator('#unsaved-edit-dialog')).toBeVisible()
  await page.locator('#save-and-exit').click()
  await deselected(page)
  await persist(page)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.locator('.polygon-label')).toHaveText('Área salva')
  await expect(page.getByTestId('toggle-polygon-lock')).toHaveAttribute('aria-pressed', 'true')
})

test('salvar nome inválido não encerra a edição; reverter a alteração dispensa aviso', async ({ page }) => {
  await create(page)
  await edit(page)
  await page.getByTestId('polygon-name').fill('Inválido!')
  await escape(page)
  await page.locator('#save-and-exit').click()
  await expect(page.getByTestId('polygon-name')).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('letras')
  await page.getByTestId('polygon-name').fill('Polígono 1')
  await escape(page)
  await expect(page.locator('#unsaved-edit-dialog')).toBeHidden()
  await deselected(page)
})

test('Esc em um desenho novo pede decisão e Salvar respeita a validação de três pontos', async ({ page }) => {
  await page.keyboard.press('n')
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().ready)).toBe(true)
  const map = (await page.getByTestId('arcgis-map').boundingBox())!
  await page.mouse.click(map.x + 200, map.y + 200)
  await escape(page)
  await expect(page.locator('#unsaved-edit-dialog')).toBeVisible()
  await page.locator('#save-and-exit').click()
  await expect(page.getByRole('alert')).toContainText('pelo menos 3 pontos')
  await escape(page)
  await page.locator('#discard-and-exit').click()
  await deselected(page)
  await expect(page.getByTestId('polygon-item')).toHaveCount(0)
})

test('Esc e decisão de sair sincronizam nas duas janelas', async ({ page }) => {
  await create(page)
  const pending = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await pending
  await expect(popup.getByTestId('map-ready')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await edit(page, popup)
  await page.getByTestId('polygon-name').fill('Entre duas telas')
  await expect(popup.getByTestId('polygon-name')).toHaveValue('Entre duas telas')
  await escape(popup)
  await expect(page.locator('#unsaved-edit-dialog')).toBeVisible()
  await expect(popup.locator('#unsaved-edit-dialog')).toBeVisible()
  await page.locator('#save-and-exit').click()
  await expect(popup.locator('#unsaved-edit-dialog')).toBeHidden()
  await deselected(page)
  await expect(popup.getByTestId('polygon-map-label')).toHaveText('Entre duas telas')
  await page.getByTestId('reunite-windows').click()
})


test('criar e editar mostram somente Confirmar e Cancelar como ações', async ({ page }, testInfo) => {
  async function actions() {
    await expect(page.locator('.sidebar-actions button:visible')).toHaveText(['Confirmar', 'Cancelar'])
    await expect(page.getByTestId('clone-polygon')).toBeHidden()
    await expect(page.getByTestId('toggle-polygon-lock')).toBeHidden()
    await expect(page.getByTestId('delete-polygon')).toBeHidden()
    await expect(page.getByTestId('expand-polygon')).toBeHidden()
    await expect(page.getByTestId('polygon-locked')).toBeVisible()
    await expect(page.getByTestId('polygon-color-option')).toHaveCount(6)
  }
  await page.keyboard.press('n')
  await actions()
  await page.getByTestId('cancel-editing').click()
  await create(page)
  await edit(page)
  await actions()
  await page.screenshot({ path: testInfo.outputPath('only-confirm-cancel.png') })
  await page.getByTestId('cancel-editing').click()
  await expect(page.getByTestId('clone-polygon')).toBeVisible()
  await expect(page.getByTestId('keyboard-shortcuts-settings')).toBeVisible()
})

test('clonar por botão e C cria áreas independentes sem fusão e com nomes únicos', async ({ page }) => {
  await create(page)
  await page.getByTestId('clone-polygon').click()
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
  await expect(page.locator('.polygon-label').last()).toHaveText('Polígono 1 Cópia')
  await page.locator('.polygon-label').first().click()
  await page.keyboard.press('c')
  await expect(page.getByTestId('polygon-item')).toHaveCount(3)
  await expect(page.locator('.polygon-label').last()).toHaveText('Polígono 1 Cópia 2')
  await persist(page)
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('polygon-item')).toHaveCount(3)
})

test('L trava e destrava a seleção, e altera apenas o rascunho durante edição', async ({ page }) => {
  await create(page)
  await page.locator('.polygon-label').click()
  await page.keyboard.press('l')
  await expect(page.getByTestId('toggle-polygon-lock')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('e')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await page.keyboard.press('l')
  await expect(page.getByTestId('toggle-polygon-lock')).toHaveAttribute('aria-pressed', 'false')
  await edit(page)
  await page.keyboard.press('l')
  await expect(page.getByTestId('polygon-locked')).toBeChecked()
  await page.getByTestId('cancel-editing').click()
  await expect(page.getByTestId('toggle-polygon-lock')).toHaveAttribute('aria-pressed', 'false')
  await edit(page)
  await page.keyboard.press('l')
  await page.getByTestId('finish-drawing').click()
  await expect(page.getByTestId('toggle-polygon-lock')).toHaveAttribute('aria-pressed', 'true')
})


test('clonar, travar e ações exclusivas de edição sincronizam no mapa separado', async ({ page }) => {
  await create(page)
  const pending = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await pending
  await expect(popup.getByTestId('map-ready')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await page.locator('.polygon-label').click()
  await page.keyboard.press('c')
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
  await expect(popup.getByTestId('polygon-map-label')).toHaveCount(2)
  await page.keyboard.press('l')
  await expect(page.getByTestId('toggle-polygon-lock').last()).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('l')
  await page.keyboard.press('e')
  await expect(page.getByTestId('polygon-name')).toBeVisible()
  await expect(page.locator('.sidebar-actions button:visible')).toHaveText(['Confirmar', 'Cancelar'])
  await expect(popup.locator('.polygon-actions button:visible')).toHaveText(['Confirmar', 'Cancelar'])
  await expect(popup.locator('#return-map')).toBeHidden()
  await popup.locator('#map .esri-view-surface').focus()
  await popup.keyboard.press('l')
  await expect(page.getByTestId('polygon-locked')).toBeChecked()
  await popup.getByTestId('cancel-editing').click()
  await expect(page.getByTestId('toggle-polygon-lock').last()).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('keyboard-shortcuts-settings')).toBeVisible()
  await page.getByTestId('reunite-windows').click()
})
