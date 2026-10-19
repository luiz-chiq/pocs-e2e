import { expect, test, type Page } from '@playwright/test'

interface ViewpointState {
  rotation: number
  scale: number
  targetGeometry: { x: number; y: number }
}
type ObservedWindow = Window & { compassViewpoint?: ViewpointState }

async function currentViewpoint(page: Page) {
  return page.evaluate(() => (window as ObservedWindow).compassViewpoint!)
}

test('arrasta a agulha, mantém o ângulo ao soltar e retorna ao norte com clique ou teclado', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
  await page.evaluate(() => {
    window.addEventListener('message', (event) => {
      if (event.origin === location.origin && event.data?.app === 'polygon-detached-map' && event.data.type === 'state') {
        (window as ObservedWindow).compassViewpoint = event.data.payload.viewpoint
      }
    })
  })
  const popupPromise = page.waitForEvent('popup')
  await page.getByTestId('detach-map').click()
  const popup = await popupPromise
  await expect(page.locator('#connection-status')).toContainText('Mapa conectado')
  const initial = await currentViewpoint(page)
  const compass = popup.getByTestId('north-up')
  const box = await compass.boundingBox()
  if (!box) throw new Error('Bússola ausente')
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2

  // Arrastar a partir do centro funciona mesmo sem um movimento circular preciso.
  await popup.mouse.move(x, y)
  await popup.mouse.down()
  await popup.mouse.move(x + 60, y, { steps: 8 })
  await popup.mouse.up()
  await expect.poll(async () => (await currentViewpoint(page)).rotation).toBeCloseTo(60, 1)
  const rotated = await currentViewpoint(page)
  expect(rotated.scale).toBeCloseTo(initial.scale, 3)
  expect(rotated.targetGeometry.x).toBeCloseTo(initial.targetGeometry.x, 3)
  expect(rotated.targetGeometry.y).toBeCloseTo(initial.targetGeometry.y, 3)
  await expect(popup.locator('.north-indicator')).toHaveCSS('transform', /matrix/)

  await compass.click()
  await expect.poll(async () => (await currentViewpoint(page)).rotation).toBeCloseTo(0, 1)
  await compass.press('ArrowRight')
  await expect.poll(async () => (await currentViewpoint(page)).rotation).toBeCloseTo(15, 1)
  await compass.press('Home')
  await expect.poll(async () => (await currentViewpoint(page)).rotation).toBeCloseTo(0, 1)

  // A agulha também pode ser girada ao redor do centro.
  await popup.mouse.move(x, y - 12)
  await popup.mouse.down()
  for (let step = 1; step <= 8; step++) {
    const angle = -Math.PI / 2 + step * Math.PI / 16
    await popup.mouse.move(x + 12 * Math.cos(angle), y + 12 * Math.sin(angle))
  }
  await popup.mouse.up()
  await expect.poll(async () => (await currentViewpoint(page)).rotation).toBeCloseTo(90, 1)
  await popup.getByTestId('return-map').click()
  await expect(page.getByTestId('arcgis-map')).toBeVisible()
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(90deg);')
})

test('permite arrastar a agulha por toque na janela principal', async ({ page, context }) => {
  await page.goto('/')
  await expect(page.getByTestId('map-ready')).toBeVisible()
  const compass = page.getByTestId('north-up')
  const box = await compass.boundingBox()
  if (!box) throw new Error('Bússola ausente')
  const cdp = await context.newCDPSession(page)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] })
  for (let step = 1; step <= 6; step++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + step * 10, y }] })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(60deg);')
  await compass.click()
  await expect(page.locator('.north-indicator')).toHaveAttribute('style', 'transform: rotate(0deg);')
})
