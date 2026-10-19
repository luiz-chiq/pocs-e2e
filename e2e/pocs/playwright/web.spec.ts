import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chromium, type BrowserContext, type Page } from '@playwright/test'
import { test, expect } from './fixtures'
import { appUrl, cases, dualCases, installFixture, installUrl, isAndroid, isPwa, isWeb, s, triangle, viewport, type Point, type PocWindow } from '../shared/fixtures'

async function open(page: Page, url = '/') {
  if (isWeb) await page.goto(url)
  await expect(page.locator(s.ready)).toBeVisible()
  await expect.poll(() => page.evaluate(() => typeof (window as PocWindow).polygonTestApi?.getSelectedScreenPoints)).toBe('function')
  if (isPwa) expect(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true)
  if (!isWeb) await expect(page.locator(s.install)).toBeHidden()
  if (isAndroid) await expect(page.locator(s.detach)).toBeHidden()
  await expect(page.locator(s.items)).toHaveCount(0)
  await page.waitForTimeout(300)
}

async function create(page: Page, offset = 0, controls = page) {
  const map = await page.locator(s.map).boundingBox()
  if (!map) throw new Error('Mapa ausente')
  const count = await controls.locator(s.items).count()
  if (await controls.locator(s.draw).getAttribute('data-mode') === 'edit') await page.keyboard.press('Escape')
  await controls.locator(s.draw).click()
  await expect(page.locator(s.finish)).toBeVisible()
  await page.waitForTimeout(300)
  for (const [x, y] of triangle) {
    const px = map.x + map.width / 2 + x + (isAndroid ? Math.min(offset, map.width / 4) : offset)
    if (isAndroid) await page.touchscreen.tap(px, map.y + map.height / 2 + y)
    else await page.mouse.click(px, map.y + map.height / 2 + y)
    await page.waitForTimeout(150)
  }
  await controls.locator(s.finish).click()
  await expect(controls.locator(s.items)).toHaveCount(count + 1)
  await expect(page.locator(s.finish)).toBeHidden()
  await controls.locator(s.items).last().click()
  await expect(controls.locator(s.vertices)).toHaveCount(3)
}

async function separate(page: Page) {
  const pending = page.waitForEvent('popup')
  await page.locator(s.detach).click()
  const popup = await pending
  await popup.setViewportSize(viewport)
  await expect(page.locator(s.connection)).toContainText('Mapa conectado')
  await expect(popup.locator(s.ready)).toBeVisible()
  await expect(page.locator(s.map)).toBeHidden()
  return popup
}

test.afterEach(async ({ context }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return
  for (const [index, page] of context.pages().entries()) {
    if (page.isClosed()) continue
    const path = testInfo.outputPath(`window-${index}.png`)
    try {
      await page.screenshot({ path })
      await testInfo.attach(`window-${index}`, { path, contentType: 'image/png' })
    } catch { /* Preservar o erro do cenário. */ }
  }
})

async function beginEdit(page: Page) {
  await page.locator(s.draw).click()
  await expect(page.locator(s.finish)).toBeVisible()
  await page.waitForTimeout(500)
}

async function persist(page: Page) {
  await page.evaluate(() => (window as PocWindow).polygonTestApi!.waitForPersistence())
}

async function deleteInEdit(page: Page) {
  await page.locator(s.items).first().click()
  await beginEdit(page)
  await page.locator(s.mapSurface).focus()
  await page.keyboard.press('Delete')
  await expect(page.locator(s.instructions)).toContainText('Polígono apagado nesta edição')
  await page.locator(s.finish).click()
  await expect(page.locator(s.deletedDialog)).toBeVisible()
}

async function points(page: Page) {
  return page.evaluate(() => (window as PocWindow).polygonTestApi!.getSelectedScreenPoints())
}

async function drag(page: Page, point: Point, dx: number, dy: number) {
  const map = await page.locator(s.map).boundingBox()
  if (!map) throw new Error('Mapa ausente')
  if (isAndroid) {
    const cdp = await page.context().newCDPSession(page)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: map.x + point.x, y: map.y + point.y }] })
    for (let step = 1; step <= 5; step++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: map.x + point.x + dx * step / 5, y: map.y + point.y + dy * step / 5 }] })
      await page.waitForTimeout(150)
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await cdp.detach()
    return
  }
  await page.mouse.move(map.x + point.x, map.y + point.y)
  await page.mouse.down()
  await page.waitForTimeout(250)
  for (let step = 1; step <= 5; step++) {
    await page.mouse.move(map.x + point.x + dx * step / 5, map.y + point.y + dy * step / 5)
    await page.waitForTimeout(150)
  }
  await page.mouse.up()
}

test(cases.create, async ({ page }) => {
  await open(page)
  await create(page)
  await expect(page.locator('#polygon-count')).toHaveText('1')
  await expect(page.locator(s.mapLabel)).toHaveText('Polígono 1')
  await expect(page.locator(s.items)).toHaveClass(/selected/)
  await expect(page.locator(s.draw)).toHaveAttribute('data-mode', 'edit')
})

test(cases.invalid, async ({ page }) => {
  await open(page)
  const map = (await page.locator(s.map).boundingBox())!
  for (const drawing of [[], triangle.slice(0, 1), triangle.slice(0, 2), [[-120, -50], [-60, -50], [0, -50]]]) {
    await page.locator(s.draw).click()
    await page.waitForTimeout(300)
    for (const [x, y] of drawing) {
      await page.mouse.click(map.x + map.width / 2 + x, map.y + map.height / 2 + y)
      await page.waitForTimeout(150)
    }
    await page.locator(s.finish).click()
    await expect(page.locator(s.instructions)).toHaveAttribute('role', 'alert')
    await expect(page.locator(s.instructions)).toContainText('formando uma área')
    await expect(page.locator(s.items)).toHaveCount(0)
    await expect(page.locator(s.finish)).toBeVisible()
    await page.locator(s.cancel).click()
  }
  await persist(page)
  await page.reload()
  await expect(page.locator(s.ready)).toBeVisible()
  await expect(page.locator(s.items)).toHaveCount(0)
})

test(cases.select, async ({ page }) => {
  await open(page)
  await create(page)
  await expect(page.locator(s.items)).toHaveClass(/selected/)
  await expect(page.locator(s.mapLabel)).toHaveClass(/is-selected/)
  await expect(page.locator(s.finish)).toBeHidden()
  const center = (await points(page)).center
  await page.keyboard.press('Escape')
  await expect(page.locator(s.draw)).toHaveAttribute('data-mode', 'create')
  const map = (await page.locator(s.map).boundingBox())!
  await page.mouse.click(map.x + center.x, map.y + center.y)
  await expect(page.locator(s.items)).toHaveClass(/selected/)
  await expect(page.locator(s.finish)).toBeHidden()
  if (isAndroid) await page.locator(s.draw).click()
  else await page.locator(s.label).press('Enter')
  await expect(page.locator(s.finish)).toBeVisible()
  await page.locator(s.cancel).click()
  await beginEdit(page)
  await page.locator(s.cancel).click()
})

test(cases.edit, async ({ page }) => {
  await open(page)
  await create(page)
  const original = await page.locator(s.vertexList).innerText()
  await page.locator(s.draw).click()
  await expect(page.locator(s.finish)).toBeVisible()
  await page.waitForTimeout(500)
  await drag(page, (await points(page)).center, 70, 40)
  await expect(page.locator(s.lastEdit)).toHaveText('Polígono movido.')
  await expect.poll(() => page.locator(s.vertexList).innerText()).not.toBe(original)
  const moved = await page.locator(s.vertexList).innerText()
  await drag(page, (await points(page)).vertices[0], 45, 35)
  await expect(page.locator(s.lastEdit)).toHaveText('Vértice ou aresta arrastada.')
  await expect.poll(() => page.locator(s.vertexList).innerText()).not.toBe(moved)
  const midpoint = (await points(page)).edgeMidpoint
  const map = (await page.locator(s.map).boundingBox())!
  await page.mouse.click(map.x + midpoint.x, map.y + midpoint.y)
  await expect(page.locator(s.vertices)).toHaveCount(4)
  const edited = await page.locator(s.vertexList).innerText()
  await page.locator(s.finish).click()
  await expect(page.locator(s.finish)).toBeHidden()
  await expect(page.locator(s.vertices)).toHaveCount(4)
  await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(edited)
})

test(cases.name, async ({ page }) => {
  await open(page)
  await create(page)
  await beginEdit(page)
  const input = page.locator(s.name)
  for (const name of ['   ', 'Área@1', 'Área-1', 'Área_1']) {
    await input.fill(name)
    await page.locator(s.finish).click()
    await expect(input).toHaveAttribute('aria-invalid', 'true')
    await expect(page.locator(s.instructions)).toHaveAttribute('role', 'alert')
    await expect(page.locator(s.finish)).toBeVisible()
  }
  await input.fill('  Área   São José 12  ')
  await input.press('Enter')
  await expect(page.locator(s.label)).toHaveText('Área São José 12')
  await expect(page.locator(s.mapLabel)).toHaveText('Área São José 12')
  await beginEdit(page)
  await input.fill('A'.repeat(40))
  await expect(input).toHaveValue('A'.repeat(30))
  await page.locator(s.finish).click()
  await expect(page.locator(s.label)).toHaveText('A'.repeat(30))
  await expect(page.locator(s.mapLabel)).toHaveText('A'.repeat(30))
})

test(cases.cancel, async ({ page }) => {
  await open(page)
  await create(page)
  const original = await page.locator(s.vertexList).innerText()
  await beginEdit(page)
  await drag(page, (await points(page)).vertices[0], 45, 35)
  await expect.poll(() => page.locator(s.vertexList).innerText()).not.toBe(original)
  await page.locator(s.name).fill('Nome temporário')
  await page.locator(s.cancel).click()
  await expect(page.locator(s.label)).toHaveText('Polígono 1')
  await expect(page.locator(s.mapLabel)).toHaveText('Polígono 1')
  await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(original)
})

test(cases.persist, async ({ appSession }, testInfo) => {
  if (appSession) {
    let page = await appSession.main()
    await open(page)
    await create(page)
    await beginEdit(page)
    await drag(page, (await points(page)).vertices[0], 45, 35)
    await page.locator(s.name).fill('Reserva São José')
    await page.locator(s.finish).click()
    await expect(page.locator(s.finish)).toBeHidden()
    const saved = await page.locator(s.vertexList).innerText()
    await persist(page)
    page = await appSession.restart()
    await expect(page.locator(s.items)).toHaveCount(1)
    await expect(page.locator(s.label)).toHaveText('Reserva São José')
    await expect(page.locator(s.mapLabel)).toHaveText('Reserva São José')
    await page.locator(s.items).click()
    await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(saved)
    if (isPwa) expect(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true)
    return
  }
  const profile = await mkdtemp(join(tmpdir(), 'polygon-poc-playwright-'))
  let context: BrowserContext | undefined
  const launch = () => chromium.launchPersistentContext(profile, {
    channel: 'chrome', headless: process.env.HEADLESS !== 'false', viewport, hasTouch: true
  })
  try {
    context = await launch()
    let page = context.pages()[0]
    await open(page, appUrl)
    await create(page)
    await beginEdit(page)
    await drag(page, (await points(page)).vertices[0], 45, 35)
    await page.locator(s.name).fill('Reserva São José')
    await page.locator(s.finish).click()
    await expect(page.locator(s.finish)).toBeHidden()
    const saved = await page.locator(s.vertexList).innerText()
    await persist(page)
    await context.close()
    context = await launch()
    page = context.pages()[0]
    await page.goto(appUrl)
    await expect(page.locator(s.ready)).toBeVisible()
    await expect(page.locator(s.items)).toHaveCount(1)
    await expect(page.locator(s.label)).toHaveText('Reserva São José')
    await expect(page.locator(s.mapLabel)).toHaveText('Reserva São José')
    await page.locator(s.items).click()
    await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(saved)
  } catch (error) {
    const page = context?.pages()[0]
    if (page && !page.isClosed()) {
      const path = testInfo.outputPath('persistence-failed.png')
      await page.screenshot({ path })
      await testInfo.attach('persistence-failed', { path, contentType: 'image/png' })
    }
    throw error
  } finally {
    await context?.close()
    await rm(profile, { recursive: true, force: true })
  }
})

test(cases.delete, async ({ page }) => {
  await open(page)
  await create(page)
  await create(page, 240)
  if (!isAndroid) {
  await deleteInEdit(page)
  await page.locator(s.restoreDeleted).click()
  await expect(page.locator(s.items)).toHaveCount(2)
  await expect(page.locator(s.finish)).toBeHidden()
  await deleteInEdit(page)
  await page.locator(s.confirmDeleted).click()
  await expect(page.locator(s.items)).toHaveCount(1)
  await expect(page.locator(s.mapLabel)).toHaveCount(1)
  }
  const remaining = await page.locator(s.items).count()
  await page.locator(s.remove).first().click()
  await page.locator(s.dismissClear).click()
  await expect(page.locator(s.items)).toHaveCount(remaining)
  await page.locator(s.remove).first().click()
  await page.locator(s.confirmClear).click()
  await expect(page.locator(s.items)).toHaveCount(remaining - 1)
  if (isAndroid) {
    await page.locator(s.clear).click()
    await page.locator(s.confirmClear).click()
  }
  await create(page)
  await create(page, 240)
  await page.locator(s.clear).click()
  await page.locator(s.dismissClear).click()
  await expect(page.locator(s.items)).toHaveCount(2)
  await page.locator(s.clear).click()
  await page.locator(s.confirmClear).click()
  await expect(page.locator(s.items)).toHaveCount(0)
  await expect(page.locator(s.mapLabel)).toHaveCount(0)
  await expect(page.locator(s.clear)).toBeDisabled()
})

test(cases.navigation, async ({ page }) => {
  await open(page)
  await create(page)
  const distance = async () => {
    const vertices = (await points(page)).vertices
    return Math.hypot(vertices[0].x - vertices[1].x, vertices[0].y - vertices[1].y)
  }
  const original = await distance()
  await page.locator(s.zoomIn).click()
  await expect.poll(distance).toBeGreaterThan(original * 1.5)
  await expect(page.locator(s.mapLabel)).toBeVisible()
  await page.locator(s.zoomOut).click()
  await expect.poll(distance).toBeCloseTo(original, 0)
  const compass = (await page.locator(s.compass).boundingBox())!
  const map = (await page.locator(s.map).boundingBox())!
  await drag(page, { x: compass.x + compass.width / 2 - map.x, y: compass.y + compass.height / 2 - map.y }, 60, 0)
  await expect(page.locator(s.needle)).toHaveAttribute('style', 'transform: rotate(60deg);')
  await page.locator(s.compass).click()
  await expect(page.locator(s.needle)).toHaveAttribute('style', 'transform: rotate(0deg);')
  await page.locator(s.compass).press('ArrowRight')
  await expect(page.locator(s.needle)).toHaveAttribute('style', 'transform: rotate(15deg);')
  await page.locator(s.compass).press('Home')
  await expect(page.locator(s.needle)).toHaveAttribute('style', 'transform: rotate(0deg);')
})

if (!isAndroid) {
test(dualCases.sync, async ({ page }) => {
  await open(page)
  await create(page)
  await create(page, 240)
  const popup = await separate(page)
  await expect(popup.locator(s.mapLabel)).toHaveCount(2)
  await page.locator(s.items).first().click()
  await expect(popup.locator(`${s.mapLabel}.is-selected`)).toHaveText('Polígono 1')
  const firstCenter = (await points(popup)).center
  await page.locator(s.items).last().click()
  await expect(popup.locator(`${s.mapLabel}.is-selected`)).toHaveText('Polígono 2')
  const map = (await popup.locator(s.map).boundingBox())!
  await popup.mouse.click(map.x + firstCenter.x, map.y + firstCenter.y)
  await expect(page.locator(`${s.items}.selected ${s.label}`)).toHaveText('Polígono 1')
  await expect(page.locator(s.finish)).toBeHidden()
  await create(popup, -240, page)
  await expect(popup.locator(s.mapLabel)).toHaveCount(3)
  await beginEdit(page)
  await popup.locator(s.name).fill('Área compartilhada')
  await expect(page.locator(s.name)).toHaveValue('Área compartilhada')
  const original = await page.locator(s.vertexList).innerText()
  await drag(popup, (await points(popup)).vertices[0], 45, 35)
  await expect.poll(() => page.locator(s.vertexList).innerText()).not.toBe(original)
  await page.locator(s.finish).click()
  await expect(popup.locator(s.finish)).toBeHidden()
  await expect(popup.locator(s.mapLabel).last()).toHaveText('Área compartilhada')
  const saved = await page.locator(s.vertexList).innerText()
  await beginEdit(popup)
  await page.locator(s.name).fill('Rascunho')
  await expect(popup.locator(s.name)).toHaveValue('Rascunho')
  await drag(popup, (await points(popup)).center, 35, 25)
  await expect.poll(() => page.locator(s.vertexList).innerText()).not.toBe(saved)
  await popup.locator(s.cancel).click()
  await expect(page.locator(s.label).last()).toHaveText('Área compartilhada')
  await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(saved)
  const remove = page.locator(s.items).last().locator(s.remove)
  await remove.click()
  await page.locator(s.dismissClear).click()
  await expect(popup.locator(s.mapLabel)).toHaveCount(3)
  await remove.click()
  await page.locator(s.confirmClear).click()
  await expect(page.locator(s.items)).toHaveCount(2)
  await expect(popup.locator(s.mapLabel)).toHaveCount(2)
})

for (const fromMap of [false, true]) {
  test(fromMap ? dualCases.reuniteMap : dualCases.reuniteMain, async ({ page }) => {
    await open(page)
    const popup = await separate(page)
    await create(popup, 0, page)
    await beginEdit(page)
    await popup.locator(s.name).fill('Área reunida')
    await page.locator(s.finish).click()
    await expect(page.locator(s.label)).toHaveText('Área reunida')
    const saved = await page.locator(s.vertexList).innerText()
    if (fromMap) await popup.locator(s.returnMap).click()
    else await page.locator(s.reunite).click()
    await expect.poll(() => popup.isClosed()).toBe(true)
    await expect(page.locator(s.map)).toBeVisible()
    await expect(page.locator(s.mapLabel)).toHaveText('Área reunida')
    await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(saved)
    const again = await separate(page)
    await expect(again.locator(s.mapLabel)).toHaveCount(1)
    await beginEdit(page)
    await again.locator(s.name).fill('Área reconectada')
    await page.locator(s.finish).click()
    await expect(page.locator(s.label)).toHaveText('Área reconectada')
    await expect(again.locator(s.mapLabel)).toHaveText('Área reconectada')
    await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(saved)
  })
}

test(dualCases.close, async ({ page }) => {
  await open(page)
  await create(page)
  const saved = await page.locator(s.vertexList).innerText()
  const popup = await separate(page)
  await beginEdit(page)
  await popup.locator(s.name).fill('Rascunho pendente')
  await drag(popup, (await points(popup)).vertices[0], 45, 35)
  await expect.poll(() => page.locator(s.vertexList).innerText()).not.toBe(saved)
  await popup.close()
  await expect(page.locator(s.map)).toBeVisible()
  await expect(page.locator(s.label)).toHaveText('Polígono 1')
  await expect.poll(() => page.locator(s.vertexList).innerText()).toBe(saved)
  await expect(page.locator(s.finish)).toBeHidden()
  const again = await separate(page)
  await beginEdit(page)
  await again.locator(s.name).fill('Sessão recuperada')
  await page.locator(s.finish).click()
  await expect(page.locator(s.label)).toHaveText('Sessão recuperada')
  await expect(again.locator(s.mapLabel)).toHaveText('Sessão recuperada')
})
}

for (const pointerType of (isWeb ? ['mouse', 'touch'] as const : [])) {
  test(cases[pointerType], async ({ page }, testInfo) => {
    await page.addInitScript(installFixture)
    await open(page, installUrl())
    const button = page.locator(s.install)
    await expect(button).toBeVisible()
    if (pointerType === 'mouse') await button.click()
    else await button.tap()
    const inputs = await page.evaluate(() => (window as PocWindow).pocInstallInputs)
    await testInfo.attach('input-events', { body: JSON.stringify(inputs), contentType: 'application/json' })
    expect(inputs).toEqual([{ pointerType, isTrusted: true }])
    // As duas entradas devem funcionar. Não marcar o defeito atual como expectedFailure.
    await expect(page.locator(s.installDialog), 'O botão deve responder à interação e abrir as instruções.').toBeVisible()
    await expect(page.locator('#install-dialog-description')).not.toBeEmpty()
  })
}
