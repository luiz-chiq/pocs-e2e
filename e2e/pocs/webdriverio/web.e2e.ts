import assert from 'node:assert/strict'
import { appUrl, cases, dualCases, installFixture, installUrl, isAndroid, isPwa, isWeb, s, triangle, viewport, type Point, type PocWindow } from '../shared/fixtures'
import { preparePwa } from './session'
import { androidPackage } from '../shared/android'

async function open(url = '/') {
  // Sessão exclusiva da automação. Remover dados via interface entre os casos.
  if (isWeb) await browser.url(url)
  else await browser.refresh()
  await $(s.ready).waitForDisplayed({ timeout: 45_000 })
  await browser.waitUntil(async () => browser.execute(() => typeof (window as PocWindow).polygonTestApi?.getSelectedScreenPoints === 'function'), {
    timeoutMsg: 'O deploy precisa incluir a API da build E2E.'
  })
  if (isPwa) assert.equal(await browser.execute(() => matchMedia('(display-mode: standalone)').matches), true)
  if (!isWeb) await expect($(s.install)).not.toBeDisplayed()
  if (isAndroid) await expect($(s.detach)).not.toBeDisplayed()
  if (await $(s.clear).isEnabled()) {
    await $(s.clear).click()
    await $(s.confirmClear).click()
  }
  await expect($$(s.items)).toBeElementsArrayOfSize(0)
  await browser.pause(300)
}

async function separate() {
  const main = await browser.getWindowHandle()
  const existing = await browser.getWindowHandles()
  await $(s.detach).click()
  let popup = ''
  await browser.waitUntil(async () => {
    popup = (await browser.getWindowHandles()).find(handle => !existing.includes(handle)) ?? ''
    return Boolean(popup)
  })
  await expect($(s.connection)).toHaveText(expect.stringContaining('Mapa conectado'))
  await browser.switchToWindow(popup)
  await browser.setWindowSize(viewport.width, viewport.height)
  const padding = await browser.execute(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }))
  await browser.setWindowSize(viewport.width + padding.width, viewport.height + padding.height)
  await $(s.ready).waitForDisplayed({ timeout: 45_000 })
  await browser.pause(300)
  await browser.switchToWindow(main)
  await expect($(s.map)).not.toBeDisplayed()
  return { main, popup }
}

async function createDetached(main: string, popup: string, offset = 0) {
  await browser.switchToWindow(main)
  const count = await $$(s.items).length
  if (await $(s.draw).getAttribute('data-mode') === 'edit') {
    await browser.switchToWindow(popup)
    await browser.keys('Escape')
    await browser.switchToWindow(main)
    await expect($(s.draw)).toHaveAttribute('data-mode', 'create')
  }
  await $(s.draw).click()
  await browser.switchToWindow(popup)
  await $(s.finish).waitForDisplayed()
  await browser.pause(300)
  const map = await $(s.map).getSize()
  for (const [x, y] of triangle) {
    await clickPoint({ x: map.width / 2 + x + offset, y: map.height / 2 + y })
    await browser.pause(150)
  }
  await browser.switchToWindow(main)
  await $(s.finish).click()
  await expect($$(s.items)).toBeElementsArrayOfSize(count + 1)
  await $(s.finish).waitForDisplayed({ reverse: true })
  const items = $$(s.items)
  await items[(await items.length) - 1].click()
  await expect($$(s.vertices)).toBeElementsArrayOfSize(3)
}

async function clickPoint(point: Point) {
  const map = await mapLocation()
  await browser.action('pointer', { parameters: { pointerType: isAndroid ? 'touch' : 'mouse' } })
    .move({ origin: 'viewport', x: Math.round(map.x + point.x), y: Math.round(map.y + point.y) })
    .down({ button: 0 }).up({ button: 0 }).perform()
}

async function mapLocation() {
  if (!isAndroid) return $(s.map).getLocation()
  await $(s.map).scrollIntoView({ block: 'start' })
  return browser.execute((selector: string) => {
    const rect = document.querySelector(selector)!.getBoundingClientRect()
    return { x: rect.x, y: rect.y }
  }, s.map)
}

async function deselect() {
  if (!isAndroid) return browser.keys('Escape')
  const size = await $(s.map).getSize()
  await clickPoint({ x: size.width - 30, y: size.height - 100 })
}

async function fillName(value: string) {
  await $(s.name).setValue(value)
  if (isAndroid && await browser.isKeyboardShown()) {
    await browser.hideKeyboard()
    await browser.pause(300)
  }
}

async function create(offset = 0) {
  const map = await $(s.map).getSize()
  const count = await $$(s.items).length
  if (await $(s.draw).getAttribute('data-mode') === 'edit') await deselect()
  await $(s.draw).click()
  await $(s.finish).waitForDisplayed()
  await browser.pause(300)
  for (const [x, y] of triangle) {
    await clickPoint({ x: map.width / 2 + x + (isAndroid ? Math.min(offset, map.width / 4) : offset), y: map.height / 2 + y })
    await browser.pause(150)
  }
  await $(s.finish).click()
  await expect($$(s.items)).toBeElementsArrayOfSize(count + 1)
  await $(s.finish).waitForDisplayed({ reverse: true })
  const items = $$(s.items)
  await items[(await items.length) - 1].click()
  await expect($$(s.vertices)).toBeElementsArrayOfSize(3)
}

async function beginEdit() {
  await $(s.draw).click()
  await $(s.finish).waitForDisplayed()
  await browser.pause(500)
}

async function persist() {
  await browser.executeAsync((done: (error: string | null) => void) => {
    (window as PocWindow).polygonTestApi!.waitForPersistence().then(() => done(null), error => done(String(error)))
  }).then(error => { if (error) throw new Error(error) })
}

async function deleteInEdit() {
  await $(s.items).click()
  await beginEdit()
  await browser.execute((selector: string) => document.querySelector<HTMLElement>(selector)!.focus(), s.mapSurface)
  await browser.keys('Delete')
  await expect($(s.instructions)).toHaveText(expect.stringContaining('Polígono apagado nesta edição'))
  await $(s.finish).click()
  await $(s.deletedDialog).waitForDisplayed()
}

async function points() {
  return browser.execute(() => (window as PocWindow).polygonTestApi!.getSelectedScreenPoints())
}

async function drag(point: Point, dx: number, dy: number) {
  const map = await mapLocation()
  await browser.performActions([{
    type: 'pointer', id: 'polygon-drag', parameters: { pointerType: isAndroid ? 'touch' : 'mouse' },
    actions: [
      { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(map.x + point.x), y: Math.round(map.y + point.y) },
      { type: 'pointerDown', button: 0 },
      { type: 'pause', duration: 250 },
      ...Array.from({ length: 5 }, (_, step) => ({
        type: 'pointerMove' as const, duration: 150, origin: 'viewport' as const,
        x: Math.round(map.x + point.x + dx * (step + 1) / 5),
        y: Math.round(map.y + point.y + dy * (step + 1) / 5)
      })),
      { type: 'pointerUp', button: 0 }
    ]
  }])
}

describe('POC WebdriverIO — web', () => {
  before(async () => { if (isPwa) await preparePwa(true) })
  it(cases.create, async () => {
    await open()
    await create()
    await expect($('#polygon-count')).toHaveText('1')
    await expect($(s.mapLabel)).toHaveText('Polígono 1')
    await expect($(s.items)).toHaveElementClass('selected')
    await expect($(s.draw)).toHaveAttribute('data-mode', 'edit')
  })

  it(cases.invalid, async () => {
    await open()
    const map = await $(s.map).getSize()
    for (const drawing of [[], triangle.slice(0, 1), triangle.slice(0, 2), [[-120, -50], [-60, -50], [0, -50]]]) {
      await $(s.draw).click()
      await browser.pause(300)
      for (const [x, y] of drawing) {
        await clickPoint({ x: map.width / 2 + x, y: map.height / 2 + y })
        await browser.pause(150)
      }
      await $(s.finish).click()
      await expect($(s.instructions)).toHaveAttribute('role', 'alert')
      await expect($(s.instructions)).toHaveText(expect.stringContaining('formando uma área'))
      await expect($$(s.items)).toBeElementsArrayOfSize(0)
      await expect($(s.finish)).toBeDisplayed()
      await $(s.cancel).click()
    }
    await persist()
    await browser.refresh()
    await $(s.ready).waitForDisplayed()
    await expect($$(s.items)).toBeElementsArrayOfSize(0)
  })

  it(cases.select, async () => {
    await open()
    await create()
    await expect($(s.items)).toHaveElementClass('selected')
    await expect($(s.mapLabel)).toHaveElementClass('is-selected')
    await expect($(s.finish)).not.toBeDisplayed()
    const center = (await points()).center
    await deselect()
    await expect($(s.draw)).toHaveAttribute('data-mode', 'create')
    await clickPoint(center)
    await expect($(s.items)).toHaveElementClass('selected')
    await expect($(s.finish)).not.toBeDisplayed()
    if (isAndroid) await $(s.draw).click()
    else { await $(s.label).click(); await browser.keys('Enter') }
    await $(s.finish).waitForDisplayed()
    await $(s.cancel).click()
    await beginEdit()
    await $(s.cancel).click()
  })

  it(cases.edit, async () => {
    await open()
    await create()
    const original = await $(s.vertexList).getText()
    await $(s.draw).click()
    await $(s.finish).waitForDisplayed()
    await browser.pause(500)
    await drag((await points()).center, 70, 40)
    await expect($(s.lastEdit)).toHaveText('Polígono movido.')
    await browser.waitUntil(async () => await $(s.vertexList).getText() !== original)
    const moved = await $(s.vertexList).getText()
    await drag((await points()).vertices[0], 45, 35)
    await expect($(s.lastEdit)).toHaveText('Vértice ou aresta arrastada.')
    await browser.waitUntil(async () => await $(s.vertexList).getText() !== moved)
    await clickPoint((await points()).edgeMidpoint)
    await expect($$(s.vertices)).toBeElementsArrayOfSize(4)
    const edited = await $(s.vertexList).getText()
    await $(s.finish).click()
    await $(s.finish).waitForDisplayed({ reverse: true })
    await expect($$(s.vertices)).toBeElementsArrayOfSize(4)
    await expect($(s.vertexList)).toHaveText(edited)
  })

  it(cases.name, async () => {
    await open()
    await create()
    await beginEdit()
    const input = $(s.name)
    for (const name of ['   ', 'Área@1', 'Área-1', 'Área_1']) {
      await fillName(name)
      await $(s.finish).click()
      await expect(input).toHaveAttribute('aria-invalid', 'true')
      await expect($(s.instructions)).toHaveAttribute('role', 'alert')
      await expect($(s.finish)).toBeDisplayed()
    }
    await fillName('  Área   São José 12  ')
    if (isAndroid) await $(s.finish).click()
    else await browser.keys('Enter')
    await expect($(s.label)).toHaveText('Área São José 12')
    await expect($(s.mapLabel)).toHaveText('Área São José 12')
    await beginEdit()
    await fillName('A'.repeat(40))
    await expect(input).toHaveValue('A'.repeat(30))
    await $(s.finish).click()
    await expect($(s.label)).toHaveText('A'.repeat(30))
    await expect($(s.mapLabel)).toHaveText('A'.repeat(30))
  })

  it(cases.cancel, async () => {
    await open()
    await create()
    const original = await $(s.vertexList).getText()
    await beginEdit()
    await drag((await points()).vertices[0], 45, 35)
    await browser.waitUntil(async () => await $(s.vertexList).getText() !== original)
    await fillName('Nome temporário')
    await $(s.cancel).click()
    await expect($(s.label)).toHaveText('Polígono 1')
    await expect($(s.mapLabel)).toHaveText('Polígono 1')
    await expect($(s.vertexList)).toHaveText(original)
  })

  it(cases.persist, async () => {
    await open()
    await create()
    await beginEdit()
    await drag((await points()).vertices[0], 45, 35)
    await fillName('Reserva São José')
    await $(s.finish).click()
    await $(s.finish).waitForDisplayed({ reverse: true })
    const saved = await $(s.vertexList).getText()
    await persist()
    if (isAndroid) {
      await browser.switchContext('NATIVE_APP')
      await browser.terminateApp(androidPackage)
      await browser.activateApp(androidPackage)
      let webview = ''
      await browser.waitUntil(async () => {
        webview = (await browser.getContexts() as string[]).find(context => context.startsWith('WEBVIEW')) ?? ''
        return Boolean(webview)
      }, { timeout: 45_000 })
      await browser.switchContext(webview)
    } else {
    await browser.reloadSession()
    await browser.setWindowSize(viewport.width, viewport.height)
    const padding = await browser.execute(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }))
    await browser.setWindowSize(viewport.width + padding.width, viewport.height + padding.height)
    if (isWeb) {
      await browser.addInitScript((source: string) => { new Function(source)() }, installFixture)
      await browser.url(appUrl)
    }
    if (isPwa) await preparePwa(false)
    }
    await $(s.ready).waitForDisplayed({ timeout: 45_000 })
    await expect($$(s.items)).toBeElementsArrayOfSize(1)
    await expect($(s.label)).toHaveText('Reserva São José')
    await expect($(s.mapLabel)).toHaveText('Reserva São José')
    await $(s.items).click()
    await expect($(s.vertexList)).toHaveText(saved)
  })

  it(cases.delete, async () => {
    await open()
    await create()
    await create(240)
    if (!isAndroid) {
    await deleteInEdit()
    await $(s.restoreDeleted).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(2)
    await expect($(s.finish)).not.toBeDisplayed()
    await deleteInEdit()
    await $(s.confirmDeleted).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(1)
    await expect($$(s.mapLabel)).toBeElementsArrayOfSize(1)
    }
    const remaining = await $$(s.items).length
    await $(s.remove).click()
    await $(s.dismissClear).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(remaining)
    await $(s.remove).click()
    await $(s.confirmClear).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(remaining - 1)
    if (isAndroid) { await $(s.clear).click(); await $(s.confirmClear).click() }
    await create()
    await create(240)
    await $(s.clear).click()
    await $(s.dismissClear).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(2)
    await $(s.clear).click()
    await $(s.confirmClear).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(0)
    await expect($$(s.mapLabel)).toBeElementsArrayOfSize(0)
    await expect($(s.clear)).toBeDisabled()
  })

  it(cases.navigation, async () => {
    await open()
    await create()
    const distance = async () => {
      const vertices = (await points()).vertices
      return Math.hypot(vertices[0].x - vertices[1].x, vertices[0].y - vertices[1].y)
    }
    const original = await distance()
    await $(s.zoomIn).click()
    await browser.waitUntil(async () => await distance() > original * 1.5)
    await expect($(s.mapLabel)).toBeDisplayed()
    await $(s.zoomOut).click()
    await browser.waitUntil(async () => Math.abs(await distance() - original) < 0.5)
    const compass = await $(s.compass).getLocation()
    const size = await $(s.compass).getSize()
    const map = await mapLocation()
    await drag({ x: compass.x + size.width / 2 - map.x, y: compass.y + size.height / 2 - map.y }, 60, 0)
    await expect($(s.needle)).toHaveAttribute('style', 'transform: rotate(60deg);')
    await $(s.compass).click()
    await expect($(s.needle)).toHaveAttribute('style', 'transform: rotate(0deg);')
    if (!isAndroid) {
    await browser.keys('ArrowRight')
    await expect($(s.needle)).toHaveAttribute('style', 'transform: rotate(15deg);')
    await browser.keys('Home')
    await expect($(s.needle)).toHaveAttribute('style', 'transform: rotate(0deg);')
    }
  })

  if (!isAndroid) {
  it(dualCases.sync, async () => {
    await open()
    await create()
    await create(240)
    const { main, popup } = await separate()
    await $(s.items).click()
    await browser.switchToWindow(popup)
    await expect($(`${s.mapLabel}.is-selected`)).toHaveText('Polígono 1')
    const center = (await points()).center
    await browser.switchToWindow(main)
    await $$(s.items)[1].click()
    await browser.switchToWindow(popup)
    await expect($(`${s.mapLabel}.is-selected`)).toHaveText('Polígono 2')
    await clickPoint(center)
    await browser.switchToWindow(main)
    await expect($(`${s.items}.selected ${s.label}`)).toHaveText('Polígono 1')
    await expect($(s.finish)).not.toBeDisplayed()
    await createDetached(main, popup, -240)
    await beginEdit()
    const original = await $(s.vertexList).getText()
    await browser.switchToWindow(popup)
    await $(s.name).setValue('Área compartilhada')
    await drag((await points()).vertices[0], 45, 35)
    await browser.switchToWindow(main)
    await expect($(s.name)).toHaveValue('Área compartilhada')
    await browser.waitUntil(async () => await $(s.vertexList).getText() !== original)
    await $(s.finish).click()
    await $(s.finish).waitForDisplayed({ reverse: true })
    const saved = await $(s.vertexList).getText()
    await browser.switchToWindow(popup)
    await expect($$(s.mapLabel)[2]).toHaveText('Área compartilhada')
    await beginEdit()
    await browser.switchToWindow(main)
    await $(s.name).setValue('Rascunho')
    await browser.switchToWindow(popup)
    await expect($(s.name)).toHaveValue('Rascunho')
    await drag((await points()).center, 35, 25)
    await browser.switchToWindow(main)
    await browser.waitUntil(async () => await $(s.vertexList).getText() !== saved)
    await browser.switchToWindow(popup)
    await $(s.cancel).click()
    await browser.switchToWindow(main)
    await expect($$(s.label)[2]).toHaveText('Área compartilhada')
    await expect($(s.vertexList)).toHaveText(saved)
    await $$(s.remove)[2].click()
    await $(s.dismissClear).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(3)
    await $$(s.remove)[2].click()
    await $(s.confirmClear).click()
    await expect($$(s.items)).toBeElementsArrayOfSize(2)
    await browser.switchToWindow(popup)
    await expect($$(s.mapLabel)).toBeElementsArrayOfSize(2)
  })

  for (const fromMap of [false, true]) {
    it(fromMap ? dualCases.reuniteMap : dualCases.reuniteMain, async () => {
      await open()
      const { main, popup } = await separate()
      await createDetached(main, popup)
      await beginEdit()
      await browser.switchToWindow(popup)
      await $(s.name).setValue('Área reunida')
      await browser.switchToWindow(main)
      await $(s.finish).click()
      await expect($(s.label)).toHaveText('Área reunida')
      const saved = await $(s.vertexList).getText()
      if (fromMap) { await browser.switchToWindow(popup); await $(s.returnMap).click() }
      else await $(s.reunite).click()
      await browser.waitUntil(async () => !(await browser.getWindowHandles()).includes(popup))
      await browser.switchToWindow(main)
      await expect($(s.map)).toBeDisplayed()
      await expect($(s.mapLabel)).toHaveText('Área reunida')
      await expect($(s.vertexList)).toHaveText(saved)
      const again = await separate()
      await beginEdit()
      await browser.switchToWindow(again.popup)
      await expect($$(s.mapLabel)).toBeElementsArrayOfSize(1)
      await $(s.name).setValue('Área reconectada')
      await browser.switchToWindow(main)
      await $(s.finish).click()
      await expect($(s.label)).toHaveText('Área reconectada')
      await expect($(s.vertexList)).toHaveText(saved)
      await browser.switchToWindow(again.popup)
      await expect($(s.mapLabel)).toHaveText('Área reconectada')
    })
  }

  it(dualCases.close, async () => {
    await open()
    await create()
    const saved = await $(s.vertexList).getText()
    const { main, popup } = await separate()
    await beginEdit()
    await browser.switchToWindow(popup)
    await $(s.name).setValue('Rascunho pendente')
    await drag((await points()).vertices[0], 45, 35)
    await browser.switchToWindow(main)
    await browser.waitUntil(async () => await $(s.vertexList).getText() !== saved)
    await browser.switchToWindow(popup)
    await browser.closeWindow()
    await browser.switchToWindow(main)
    await expect($(s.map)).toBeDisplayed()
    await expect($(s.label)).toHaveText('Polígono 1')
    await expect($(s.vertexList)).toHaveText(saved)
    await expect($(s.finish)).not.toBeDisplayed()
    const again = await separate()
    await beginEdit()
    await browser.switchToWindow(again.popup)
    await $(s.name).setValue('Sessão recuperada')
    await browser.switchToWindow(main)
    await $(s.finish).click()
    await expect($(s.label)).toHaveText('Sessão recuperada')
    await browser.switchToWindow(again.popup)
    await expect($(s.mapLabel)).toHaveText('Sessão recuperada')
  })
  }

  for (const pointerType of (isWeb ? ['mouse', 'touch'] as const : [])) {
    it(cases[pointerType], async () => {
      await open(installUrl())
      const button = $(s.install)
      await button.waitForDisplayed()
      if (pointerType === 'mouse') await button.click()
      else {
        const position = await button.getLocation()
        const size = await button.getSize()
        await browser.performActions([{
          type: 'pointer', id: 'installation-touch', parameters: { pointerType: 'touch' },
          actions: [
            { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(position.x + size.width / 2), y: Math.round(position.y + size.height / 2) },
            { type: 'pointerDown', button: 0 },
            { type: 'pause', duration: 100 },
            { type: 'pointerUp', button: 0 }
          ]
        }])
      }
      const inputs = await browser.execute(() => (window as PocWindow).pocInstallInputs)
      assert.deepEqual(inputs, [{ pointerType, isTrusted: true }])
      await $(s.installDialog).waitForDisplayed({ timeoutMsg: 'O botão deve responder à interação e abrir as instruções.' })
      assert.ok((await $('#install-dialog-description').getText()).length > 0)
    })
  }
})
