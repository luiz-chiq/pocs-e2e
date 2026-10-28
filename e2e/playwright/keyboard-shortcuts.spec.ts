import { expect, test, type Page } from '@playwright/test'

test.use({ viewport: { width: 1280, height: 800 } })
type TestWindow = typeof window & { polygonTestApi: {
  getDrawingState(): { ready: boolean; vertices: number }
  getMapState(): { stationary: boolean; editingReady: boolean }
  getSelectedScreenPoints(): { vertices: { x: number; y: number }[] }
} }

async function settings(page: Page, enabled: boolean) {
  await page.getByTestId('keyboard-shortcuts-enabled').setChecked(enabled)
  await expect(page.locator('#keyboard-shortcuts-status')).toHaveText(enabled ? 'Ativos' : 'Desativados')
}
async function mapFocus(page: Page) { await page.locator('#map .esri-view-surface').focus() }
async function drawPoints(page: Page) {
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().ready)).toBe(true)
  const box = (await page.getByTestId('arcgis-map').boundingBox())!
  let count = 0
  for (const [x, y] of [[-80, -50], [70, -50], [-5, 80]]) {
    await page.mouse.click(box.x + box.width / 2 + x, box.y + box.height / 2 + y)
    count++
    await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(count)
  }
}
async function create(page: Page) {
  await mapFocus(page)
  await page.keyboard.press('n')
  await drawPoints(page)
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
}
async function select(page: Page) {
  await page.getByTestId('polygon-item').first().click()
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().stationary)).toBe(true)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
})

test('N cria, E edita, Enter salva e Escape cancela; N com seleção inicia outro desenho', async ({ page }) => {
  await create(page)
  await select(page)
  await page.keyboard.press('e')
  await expect(page.getByTestId('polygon-name')).toBeVisible()
  await page.getByTestId('polygon-name').fill('Área por atalho')
  await page.getByTestId('polygon-name').press('Enter')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.locator('.polygon-label')).toHaveText('Área por atalho')
  await mapFocus(page)
  await page.keyboard.press('n')
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await expect(page.getByTestId('polygon-name')).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
})

test('digitar o nome não aciona criação, cores, desfazer ou separação de janelas', async ({ page, context }) => {
  await create(page)
  await select(page)
  await page.keyboard.press('e')
  const input = page.getByTestId('polygon-name')
  await input.fill('')
  await input.pressSequentially('N E M Z R 123456')
  await expect(input).toHaveValue('N E M Z R 123456')
  await expect(page.getByTestId('polygon-color-option').first()).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#clear-dialog')).toBeHidden()
  expect(context.pages()).toHaveLength(1)
})

test('1 a 6 escolhem cores e Z/R ou Ctrl+Z/Ctrl+Shift+Z desfazem e refazem vértices', async ({ page }) => {
  await page.keyboard.press('n')
  await drawPoints(page)
  for (let index = 0; index < 6; index++) {
    await page.keyboard.press(String(index + 1))
    await expect(page.getByTestId('polygon-color-option').nth(index)).toHaveAttribute('aria-pressed', 'true')
  }
  for (const [undo, redo] of [['z', 'r'], ['Control+z', 'Control+Shift+z'], ['Meta+z', 'Meta+y']]) {
    await page.keyboard.press(undo)
    await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(2)
    await page.keyboard.press(redo)
    await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(3)
  }
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
})

test('desativar persiste, bloqueia atalhos do app e do SDK, e mantém os botões funcionando', async ({ page }) => {
  await settings(page, false)
  await mapFocus(page)
  await page.keyboard.press('n')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await page.getByTestId('draw-polygon').press('Enter')
  await drawPoints(page)
  await page.keyboard.press('z')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await expect(page.getByTestId('polygon-item')).toHaveCount(0)
  expect(await page.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(3)
  await page.getByTestId('finish-drawing').press('Enter')
  await select(page)
  await mapFocus(page)
  await page.keyboard.press('e')
  await page.keyboard.press('Enter')
  await page.keyboard.press('Delete')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.locator('#clear-dialog')).toBeHidden()
  await page.getByTestId('draw-polygon').click()
  await mapFocus(page)
  await page.keyboard.press('Delete')
  await page.keyboard.press('Control+Delete')
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await expect(page.locator('#clear-dialog')).toBeHidden()
  await page.getByTestId('cancel-editing').click()
  await page.reload()
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await expect(page.getByTestId('keyboard-shortcuts-enabled')).not.toBeChecked()
  await settings(page, true)
  await mapFocus(page)
  await page.keyboard.press('n')
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
})

test('zoom e norte usam atalhos globais', async ({ page }) => {
  await create(page)
  await select(page)
  const distance = () => page.evaluate(() => {
    const [a, b] = (window as TestWindow).polygonTestApi.getSelectedScreenPoints().vertices
    return Math.hypot(a.x - b.x, a.y - b.y)
  })
  const before = await distance()
  await mapFocus(page)
  await page.keyboard.press('Equal')
  await expect.poll(distance).toBeGreaterThan(before * 1.1)
  await expect.poll(() => page.evaluate(() => (window as TestWindow).polygonTestApi.getMapState().stationary)).toBe(true)
  const zoomed = await distance()
  await page.keyboard.press('Minus')
  await expect.poll(distance).toBeLessThan(zoomed * .9)
  await page.getByTestId('north-up').press('ArrowRight')
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(15deg);')
  await mapFocus(page)
  await page.keyboard.press('0')
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(0deg);')
})

test('atalho de edição respeita o bloqueio e Enter confirma após marcar Travar ao salvar', async ({ page }) => {
  await page.keyboard.press('n')
  await drawPoints(page)
  await page.getByTestId('polygon-locked').check()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await select(page)
  await page.keyboard.press('e')
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await expect(page.locator('#map-instructions')).toContainText('travado')
  await page.keyboard.press('n')
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('polygon-item')).toHaveCount(1)
})

test('M separa e reúne; preferências, cores e desfazer funcionam entre as duas janelas', async ({ page }) => {
  await create(page)
  await mapFocus(page)
  const pending = page.waitForEvent('popup')
  await page.keyboard.press('m')
  const popup = await pending
  await expect(popup.getByTestId('map-ready')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  await settings(page, false)
  await expect.poll(() => popup.evaluate(() => localStorage.getItem('polygon-keyboard-shortcuts'))).toBe('false')
  await mapFocus(popup)
  await popup.keyboard.press('n')
  await popup.waitForTimeout(200)
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
  await settings(page, true)
  await expect.poll(() => popup.locator('#keyboard-shortcuts-enabled').isChecked()).toBe(true)
  await page.keyboard.press('n')
  await drawPoints(popup)
  await page.keyboard.press('z')
  await expect.poll(() => popup.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(2)
  await page.keyboard.press('r')
  await expect.poll(() => popup.evaluate(() => (window as TestWindow).polygonTestApi.getDrawingState().vertices)).toBe(3)
  await page.keyboard.press('2')
  await expect(popup.getByRole('button', { name: 'Verde', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('polygon-item')).toHaveCount(2)
  await mapFocus(popup)
  await popup.keyboard.press('m')
  await expect(page.getByTestId('detach-map')).toBeVisible()
})

test('modal acessível no celular e ações reduzidas durante criação', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await settings(page, false)
  await expect(page.getByTestId('keyboard-shortcuts-enabled')).toBeInViewport()
  await page.getByTestId('keyboard-shortcuts-settings').click()
  const dialog = page.getByRole('dialog', { name: 'Atalhos de teclado', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('dd').last()).toHaveText('Separar / reunir mapa')
  await dialog.locator('dd').last().scrollIntoViewIfNeeded()
  await expect(page.getByRole('button', { name: 'Fechar atalhos de teclado', exact: true })).toBeInViewport()
  await page.screenshot({ path: testInfo.outputPath('mobile-keyboard-modal.png') })
  await page.getByRole('button', { name: 'Fechar atalhos de teclado', exact: true }).click()
  await expect(dialog).toBeHidden()
  await page.getByTestId('draw-polygon').click()
  await expect(page.getByTestId('keyboard-shortcuts-enabled')).toBeHidden()
  await expect(page.getByTestId('keyboard-shortcuts-settings')).toBeHidden()
  await expect(page.getByTestId('finish-drawing')).toBeVisible()
})

test('modal sincroniza o switch e fecha com Escape preservando a seleção', async ({ page }) => {
  await create(page)
  await select(page)
  await page.getByTestId('keyboard-shortcuts-settings').click()
  const dialog = page.getByRole('dialog', { name: 'Atalhos de teclado', exact: true })
  await expect(dialog).toBeVisible()
  await page.getByTestId('keyboard-shortcuts-dialog-enabled').uncheck()
  await expect(page.getByTestId('keyboard-shortcuts-enabled')).not.toBeChecked()
  await page.getByTestId('keyboard-shortcuts-dialog-enabled').check()
  await expect(page.getByTestId('keyboard-shortcuts-enabled')).toBeChecked()
  await page.keyboard.press('n')
  await page.keyboard.press('Delete')
  await expect(dialog).toBeVisible()
  await expect(page.locator('#clear-dialog')).toBeHidden()
  for (let index = 0; index < 4; index++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('#keyboard-shortcuts-dialog')))).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(page.getByTestId('keyboard-shortcuts-settings')).toBeFocused()
  await expect(page.getByTestId('polygon-item')).toHaveClass(/selected/)
  await expect(page.getByTestId('finish-drawing')).toBeHidden()
})
