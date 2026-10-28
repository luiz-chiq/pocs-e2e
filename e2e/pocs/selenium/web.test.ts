import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolve } from 'node:path'
import { createRequire } from 'node:module'
import { after, test } from 'node:test'
import { Builder, By, Key, until, error as webdriverError } from 'selenium-webdriver'
import chrome from 'selenium-webdriver/chrome.js'
import { Command, Name } from 'selenium-webdriver/lib/command.js'
import type { Executor } from 'selenium-webdriver/http.js'
import { appUrl, cases, dualCases, installFixture, installUrl, isAndroid, isElectron, isPwa, isWeb, s, target, triangle, viewport, type Point, type PocWindow, type ScreenPoints } from '../shared/fixtures.ts'
import { installPwa, launchPwa } from '../shared/pwa.ts'
import { ChromePipe } from '../shared/chrome-pipe.ts'
import { electronDriver } from '../shared/electron.ts'
import { systemChrome } from '../shared/chrome.ts'
import { androidCapabilities, androidPackage, appiumUrl } from '../shared/android.ts'

const directory = `${process.env.POC_RESULTS_DIR ?? `test-results/pocs/${target}`}/selenium`
const results: object[] = []
mkdirSync(directory, { recursive: true })

async function element(driver: chrome.Driver, selector: string) {
  return driver.findElement(By.css(selector))
}

async function visible(driver: chrome.Driver, selector: string, message?: string) {
  const target = await driver.wait(until.elementLocated(By.css(selector)), 10_000)
  await driver.wait(until.elementIsVisible(target), 10_000, message)
  return target
}

async function count(driver: chrome.Driver, selector: string, expected: number) {
  await driver.wait(async () => (await driver.findElements(By.css(selector))).length === expected, 10_000, `${selector}: esperado ${expected} elementos`)
}

async function text(driver: chrome.Driver, selector: string, expected: string) {
  await driver.wait(async () => {
    const targets = await driver.findElements(By.css(selector))
    if (!targets.length) return false
    try { return await targets[0].getText() === expected } catch { return false }
  }, 10_000, `${selector}: texto esperado ${JSON.stringify(expected)}`)
}

// A sincronização entre janelas recria a lista durante o movimento do mapa.
// Reconsultar a cada leitura; somente referência obsoleta é transitória aqui.
async function textChanged(driver: chrome.Driver, selector: string, previous: string) {
  await driver.wait(async () => {
    try { return await (await element(driver, selector)).getText() !== previous }
    catch (failure) {
      if (failure instanceof webdriverError.StaleElementReferenceError) return false
      throw failure
    }
  }, 10_000, `${selector}: aguardando alteração do texto`)
}

async function attribute(driver: chrome.Driver, selector: string, name: string, expected: string) {
  await driver.wait(async () => await (await element(driver, selector)).getAttribute(name) === expected, 10_000)
}

async function open(driver: chrome.Driver, url = appUrl) {
  if (isWeb) await driver.get(url)
  const ready = await driver.wait(until.elementLocated(By.css(s.ready)), 45_000)
  await driver.wait(until.elementIsVisible(ready), 10_000)
  await driver.wait(() => driver.executeScript(() => typeof (window as PocWindow).polygonTestApi?.getSelectedScreenPoints === 'function'), 10_000, 'O deploy precisa incluir a API da build E2E.')
  if (isPwa) assert.equal(await driver.executeScript(() => matchMedia('(display-mode: standalone)').matches), true)
  if (!isWeb) assert.equal(await (await element(driver, s.install)).isDisplayed(), false)
  if (isAndroid) assert.equal(await (await element(driver, s.detach)).isDisplayed(), false)
  if (isAndroid) assert.equal(await driver.executeScript(() => typeof (window as PocWindow).polygonTestApi?.getDrawingState), 'function', 'Instale o APK E2E atualizado com a consulta de prontidão.')
  if (isAndroid) await driver.executeScript((mapSelector: string, diagnostics: boolean) => {
    const view = window as PocWindow
    view.pocMapInputs = []
    for (const type of (diagnostics ? ['keydown', 'keyup', 'click'] : ['click'])) document.addEventListener(type, event => {
      const target = event.target as Element
      view.pocMapInputs!.push({
        pointerType: '', x: 0, y: 0, inMap: false, isTrusted: event.isTrusted,
        event: event instanceof KeyboardEvent ? type + ':' + event.key + ':' + event.code : type,
        control: target?.closest('[data-testid]')?.getAttribute('data-testid') ?? undefined,
        timestamp: event.timeStamp, target: target?.tagName + '#' + target?.id,
        vertices: view.polygonTestApi?.getDrawingState?.().vertices
      })
    }, { capture: true, passive: true })
    for (const type of ['pointerdown', 'pointerup', 'pointercancel'] as const) document.addEventListener(type, event => {
      view.pocMapInputs!.push({ pointerType: event.pointerType, x: event.clientX, y: event.clientY, inMap: event.target instanceof Element && Boolean(event.target.closest(mapSelector)), isTrusted: event.isTrusted, event: event.type, timestamp: event.timeStamp, target: (event.target as Element)?.tagName + '#' + (event.target as Element)?.id + '.' + (event.target as Element)?.className?.toString(), vertices: view.polygonTestApi?.getDrawingState?.().vertices })
    }, { passive: true })
  }, s.map, Boolean(process.env.POC_INPUT_DIAGNOSTICS))
  await count(driver, s.items, 0)
  await driver.sleep(300)
}

async function clickPoint(driver: chrome.Driver, point: Point) {
  const map = await mapRect(driver)
  if (isAndroid) {
    await driver.execute(new Command(Name.ACTIONS).setParameter('actions', [{
      type: 'pointer', id: 'map-touch', parameters: { pointerType: 'touch' }, actions: [
        { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(map.x + point.x), y: Math.round(map.y + point.y) },
        { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }
      ]
    }]))
    await driver.sleep(400)
  } else await driver.actions().move({ x: Math.round(map.x + point.x), y: Math.round(map.y + point.y), duration: 0 }).pause(150).click().perform()
}

async function mapRect(driver: chrome.Driver) {
  if (!isAndroid) return (await element(driver, s.map)).getRect()
  await driver.executeScript((selector: string) => document.querySelector(selector)!.scrollIntoView({ block: 'start' }), s.map)
  await driver.sleep(150)
  return driver.executeScript<{ x: number; y: number; width: number; height: number }>((selector: string) => {
    const map = document.querySelector(selector)!
    const rect = map.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }, s.map)
}

async function deselect(driver: chrome.Driver) {
  if (!isAndroid) return driver.actions().sendKeys(Key.ESCAPE).perform()
  const map = await mapRect(driver)
  await clickPoint(driver, { x: map.width - 30, y: map.height - 100 })
}

async function create(driver: chrome.Driver, offset = 0) {
  const map = await mapRect(driver)
  const previous = (await driver.findElements(By.css(s.items))).length
  if (await (await element(driver, s.draw)).getAttribute('data-mode') === 'edit') await deselect(driver)
  await (await element(driver, s.draw)).click()
  await visible(driver, s.finish)
  await driver.sleep(300)
  // Usar cores diferentes quando o cenário precisa de áreas independentes.
  if (previous) await (await driver.findElements(By.css('[data-testid="polygon-color-option"]')))[previous % 6].click()
  const acknowledged = isAndroid && await driver.executeScript(() => typeof (window as PocWindow).polygonTestApi?.getDrawingState === 'function')
  if (acknowledged) await driver.wait(() => driver.executeScript(() => (window as PocWindow).polygonTestApi!.getDrawingState!().ready), 15_000, 'SDK ainda não está pronto para desenhar.')
  let vertices = 0
  for (const [x, y] of triangle) {
    await clickPoint(driver, { x: map.width / 2 + x + (isAndroid ? Math.min(offset, map.width / 2 - 20) : offset), y: map.height / 2 + y })
    if (acknowledged) {
      vertices++
      await driver.wait(async () => await driver.executeScript(() => (window as PocWindow).polygonTestApi!.getDrawingState!().vertices) === vertices, 5_000, `O SDK não recebeu o vértice ${vertices}.`)
    }
    await driver.sleep(150)
  }
  await (await element(driver, s.finish)).click()
  await count(driver, s.items, previous + 1)
  await driver.wait(until.elementIsNotVisible(await element(driver, s.finish)), 10_000)
  const items = await driver.findElements(By.css(s.items))
  await items[items.length - 1].click()
  const expand = (await driver.findElements(By.css('[data-testid="expand-polygon"]'))).at(-1)!
  if (await expand.getAttribute('aria-expanded') !== 'true') await expand.click()
  await count(driver, s.vertices, 3)
}

async function beginEdit(driver: chrome.Driver) {
  await (await element(driver, s.draw)).click()
  await visible(driver, s.finish)
  await driver.sleep(500)
}

async function persist(driver: chrome.Driver) {
  const error = await driver.executeAsyncScript<string | null>((done: (error: string | null) => void) => {
    (window as PocWindow).polygonTestApi!.waitForPersistence().then(() => done(null), error => done(String(error)))
  })
  if (error) throw new Error(error)
}

async function fillName(driver: chrome.Driver, value: string) {
  const input = await element(driver, s.name)
  await input.sendKeys(Key.chord(!isAndroid && process.platform === 'darwin' ? Key.COMMAND : Key.CONTROL, 'a'), Key.BACK_SPACE)
  if (value) await input.sendKeys(value)
}

async function confirmName(driver: chrome.Driver) {
  if (!isAndroid) return (await element(driver, s.finish)).click()
  // hideKeyboard tenta Escape antes de Back neste driver e Escape cancela a edição.
  // Back nativo só é enviado quando o IME está comprovadamente aberto.
  if (await driver.execute(new Command('isKeyboardShown')) as unknown as boolean) {
    await driver.executeScript('mobile: pressKey', { keycode: 4 })
    await driver.wait(async () => !(await driver.execute(new Command('isKeyboardShown')) as unknown as boolean), 5_000, 'O teclado Android não fechou.')
  }
  await visible(driver, s.finish)
  await driver.executeScript((selector: string) => document.querySelector(selector)!.scrollIntoView({ block: 'center', behavior: 'instant' }), s.finish)
  let previous = ''
  let point: Point
  await driver.wait(async () => {
    const current = await driver.executeScript<Point & { height: number; width: number; visibleHeight: number; hit: boolean }>((selector: string) => {
      const button = document.querySelector(selector)!
      button.scrollIntoView({ block: 'center', behavior: 'instant' })
      const rect = button.getBoundingClientRect()
      const x = Math.round(rect.x + rect.width / 2), y = Math.round(rect.y + rect.height / 2)
      const hit = document.elementFromPoint(x, y)
      return { x, y, height: innerHeight, width: innerWidth, visibleHeight: visualViewport?.height ?? innerHeight, hit: hit === button || button.contains(hit) }
    }, s.finish)
    point = current
    const snapshot = JSON.stringify(current)
    const stable = snapshot === previous
    previous = snapshot
    return stable && current.hit && current.x > 0 && current.x < current.width && current.y > 0 && current.y < Math.min(current.height, current.visibleHeight)
  }, 5_000, 'Botão de confirmação fora da viewport ou ainda em movimento.')
  const deliveredClicks = () => driver.executeScript<number>(() => (window as PocWindow).pocMapInputs!.filter(event => event.event === 'click' && event.control === 'finish-drawing' && event.isTrusted).length)
  const clicks = await deliveredClicks()
  await driver.execute(new Command(Name.ACTIONS).setParameter('actions', [{ type: 'pointer', id: 'confirm-touch', parameters: { pointerType: 'touch' }, actions: [
    { type: 'pointerMove', duration: 0, origin: 'viewport', x: point!.x, y: point!.y },
    { type: 'pointerDown', button: 0 }, { type: 'pointerUp', button: 0 }
  ] }]))
  // pointerUp pode retornar antes da entrega do clique de compatibilidade touch.
  // Não preencher o próximo nome enquanto a confirmação anterior ainda está pendente.
  await driver.wait(async () => await deliveredClicks() > clicks, 5_000, 'O toque não gerou um clique confiável no botão de confirmação.')
}

async function deleteInEdit(driver: chrome.Driver) {
  await (await element(driver, s.items)).click()
  await beginEdit(driver)
  await driver.executeScript((selector: string) => document.querySelector<HTMLElement>(selector)!.focus(), s.mapSurface)
  await driver.actions().sendKeys(Key.DELETE).perform()
  await visible(driver, '#clear-dialog')
  await visible(driver, s.mapLabel)
}

async function separate(driver: chrome.Driver) {
  const main = await driver.getWindowHandle()
  const existing = await driver.getAllWindowHandles()
  await (await element(driver, s.detach)).click()
  let popup = ''
  await driver.wait(async () => {
    popup = (await driver.getAllWindowHandles()).find(handle => !existing.includes(handle)) ?? ''
    return Boolean(popup)
  }, 10_000)
  await driver.wait(until.elementTextContains(await element(driver, s.connection), 'Mapa conectado'), 30_000)
  await driver.switchTo().window(popup)
  if (!isElectron) {
    await driver.manage().window().setRect({ width: viewport.width, height: viewport.height })
    const padding = await driver.executeScript<{ width: number; height: number }>(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }))
    await driver.manage().window().setRect({ width: viewport.width + padding.width, height: viewport.height + padding.height })
  }
  await visible(driver, s.ready)
  await driver.sleep(300)
  await driver.switchTo().window(main)
  assert.equal(await (await element(driver, s.map)).isDisplayed(), false)
  return { main, popup }
}

async function createDetached(driver: chrome.Driver, main: string, popup: string, offset = 0) {
  await driver.switchTo().window(main)
  const previous = (await driver.findElements(By.css(s.items))).length
  if (await (await element(driver, s.draw)).getAttribute('data-mode') === 'edit') {
    await driver.switchTo().window(popup)
    await driver.actions().sendKeys(Key.ESCAPE).perform()
    await driver.switchTo().window(main)
    await attribute(driver, s.draw, 'data-mode', 'create')
  }
  await (await element(driver, s.draw)).click()
  await driver.switchTo().window(popup)
  await visible(driver, s.finish)
  await driver.sleep(300)
  if (previous) await (await driver.findElements(By.css('[data-testid="polygon-color-option"]')))[previous % 6].click()
  const map = await (await element(driver, s.map)).getRect()
  for (const [x, y] of triangle) {
    await clickPoint(driver, { x: map.width / 2 + x + offset, y: map.height / 2 + y })
    await driver.sleep(150)
  }
  await driver.switchTo().window(main)
  await (await element(driver, s.finish)).click()
  await count(driver, s.items, previous + 1)
  await driver.wait(until.elementIsNotVisible(await element(driver, s.finish)), 10_000)
  const items = await driver.findElements(By.css(s.items))
  await items[items.length - 1].click()
  const expand = (await driver.findElements(By.css('[data-testid="expand-polygon"]'))).at(-1)!
  if (await expand.getAttribute('aria-expanded') !== 'true') await expand.click()
  await count(driver, s.vertices, 3)
}

async function points(driver: chrome.Driver): Promise<ScreenPoints> {
  return driver.executeScript(() => (window as PocWindow).polygonTestApi!.getSelectedScreenPoints())
}

async function drag(driver: chrome.Driver, point: Point, dx: number, dy: number) {
  const map = await mapRect(driver)
  if (isAndroid) {
    await driver.execute(new Command(Name.ACTIONS).setParameter('actions', [{
      type: 'pointer', id: 'map-touch', parameters: { pointerType: 'touch' }, actions: [
        { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(map.x + point.x), y: Math.round(map.y + point.y) },
        { type: 'pointerDown', button: 0 }, { type: 'pause', duration: 250 },
        ...Array.from({ length: 5 }, (_, step) => ({ type: 'pointerMove', duration: 150, origin: 'viewport', x: Math.round(map.x + point.x + dx * (step + 1) / 5), y: Math.round(map.y + point.y + dy * (step + 1) / 5) })),
        { type: 'pointerUp', button: 0 }
      ]
    }]))
    return
  }
  // Permitir que o SDK processe o hover antes de pressionar para arrastar.
  const gesture = driver.actions().move({ x: Math.round(map.x + point.x), y: Math.round(map.y + point.y), duration: 0 }).pause(150).press().pause(250)
  for (let step = 1; step <= 5; step++) {
    gesture.move({ x: Math.round(map.x + point.x + dx * step / 5), y: Math.round(map.y + point.y + dy * step / 5), duration: 150 })
  }
  await gesture.release().perform()
}

function scenario(title: string, body: (driver: chrome.Driver, restart: () => Promise<chrome.Driver>) => Promise<void>) {
  test(title, { timeout: isAndroid ? 180_000 : 90_000 }, async () => {
    const started = performance.now()
    const profile = mkdtempSync(join(tmpdir(), 'polygon-poc-selenium-'))
    const options = new chrome.Options()
    options.addArguments(`--window-size=${viewport.width},${viewport.height}`, `--user-data-dir=${profile}`)
    if (isWeb && process.env.HEADLESS !== 'false') options.addArguments('--headless=new')
    if (isPwa) options.setChromeBinaryPath(systemChrome())
    if (isElectron) {
      options.setChromeBinaryPath(process.env.ELECTRON_APP_PATH ?? createRequire(import.meta.url)('electron'))
      if (!process.env.ELECTRON_APP_PATH) options.addArguments(`--app=${resolve('electron/main.cjs')}`)
    }
    let driver: chrome.Driver | undefined
    let status = 'passed'
    let error: string | undefined
    let inputs: unknown
    let mapInputs: unknown
    const artifacts: string[] = []
    let cdp: ChromePipe | undefined
    const manifestId = new URL('./', appUrl).href
    let pwaInstalled = false
    let bootstrap: string
    const previousUserData = process.env.POLYGON_USER_DATA_DIR
    if (isElectron) process.env.POLYGON_USER_DATA_DIR = profile
    let cleanupFailure: unknown
    const start = async () => {
      if (isPwa) {
        cdp = await ChromePipe.launch(profile)
        options.debuggerAddress(cdp.debuggerAddress)
      }
      const builder = isAndroid
        ? new Builder().usingServer(appiumUrl).withCapabilities({ ...androidCapabilities, browserName: '' })
        : new Builder().forBrowser('chrome').setChromeOptions(options)
      if (isElectron) builder.setChromeService(new chrome.ServiceBuilder(await electronDriver()))
      driver = await builder.build() as chrome.Driver
      await driver.manage().setTimeouts({ pageLoad: 45_000, script: 15_000, implicit: 0 })
      if (isAndroid) {
        const executor = driver.getExecutor() as Executor
        executor.defineCommand('getContexts', 'GET', '/session/:sessionId/contexts')
        executor.defineCommand('setContext', 'POST', '/session/:sessionId/context')
        executor.defineCommand('isKeyboardShown', 'GET', '/session/:sessionId/appium/device/is_keyboard_shown')
        executor.defineCommand('hideKeyboard', 'POST', '/session/:sessionId/appium/device/hide_keyboard')
      } else if (!isElectron) {
      const padding = await driver.executeScript<{ width: number; height: number }>(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }))
      await driver.manage().window().setRect({ width: viewport.width + padding.width, height: viewport.height + padding.height })
      }
      if (isWeb) await driver.sendDevToolsCommand('Page.addScriptToEvaluateOnNewDocument', { source: installFixture })
      if (isPwa) {
        bootstrap = await driver.getWindowHandle()
        if (!pwaInstalled) {
          await driver.get(appUrl)
          await installPwa(cdp!)
          pwaInstalled = true
          await driver.get('about:blank')
        }
        await launchPwa(cdp!, manifestId)
        await driver.wait(async () => {
          for (const handle of await driver!.getAllWindowHandles()) {
            await driver!.switchTo().window(handle)
            if (await driver!.executeScript(() => matchMedia('(display-mode: standalone)').matches)) return true
          }
          return false
        }, 20_000, 'O Chrome não abriu o PWA realmente instalado em modo standalone.')
        await driver.manage().window().setRect({ width: viewport.width, height: viewport.height })
        const appPadding = await driver.executeScript<{ width: number; height: number }>(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }))
        await driver.manage().window().setRect({ width: viewport.width + appPadding.width, height: viewport.height + appPadding.height })
      }
      return driver
    }
    try {
      await body(await start(), async () => {
        if (isAndroid) {
          await driver!.execute(new Command('setContext').setParameter('name', 'NATIVE_APP'))
          await driver!.executeScript('mobile: terminateApp', { appId: androidPackage })
          await driver!.executeScript('mobile: activateApp', { appId: androidPackage })
          let context = ''
          await driver!.wait(async () => {
            context = (await driver!.execute(new Command('getContexts')) as unknown as string[]).find(item => item.startsWith('WEBVIEW')) ?? ''
            return Boolean(context)
          }, 45_000)
          await driver!.execute(new Command('setContext').setParameter('name', context))
          return driver!
        }
        await driver!.quit()
        await cdp?.close()
        driver = undefined
        return start()
      })
    } catch (failure) {
      status = 'failed'
      error = failure instanceof Error ? failure.message : String(failure)
      if (driver) {
        try {
          for (const [index, handle] of (await driver.getAllWindowHandles()).entries()) {
            await driver.switchTo().window(handle)
            const path = `${directory}/${title.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 90)}-window-${index}.png`
            writeFileSync(path, await driver.takeScreenshot(), 'base64')
            artifacts.push(path)
          }
        } catch { /* O erro de captura não deve ocultar a falha original. */ }
      }
      throw failure
    } finally {
      if (driver) {
        try { inputs = await driver.executeScript(() => (window as PocWindow).pocInstallInputs) } catch { /* Janela indisponível. */ }
        if (isAndroid) try { mapInputs = await driver.executeScript(() => (window as PocWindow).pocMapInputs) } catch { /* Sessão indisponível. */ }
        if (pwaInstalled) {
          try { await cdp!.send('PWA.uninstall', { manifestId }); await driver.switchTo().window(bootstrap!) } catch { /* Encerrar ainda libera todas as janelas. */ }
        }
        try { await driver.quit() } catch (cleanupError) {
          if (status === 'passed') cleanupFailure = cleanupError
          status = 'failed'
          error ??= `Falha ao encerrar sessão: ${String(cleanupError)}`
        }
      }
      await cdp?.close()
      results.push({ title, status, durationMs: Math.round(performance.now() - started), error, inputs, mapInputs, artifacts })
      rmSync(profile, { recursive: true, force: true })
      if (previousUserData === undefined) delete process.env.POLYGON_USER_DATA_DIR
      else process.env.POLYGON_USER_DATA_DIR = previousUserData
      if (cleanupFailure) throw cleanupFailure
    }
  })
}

scenario(cases.create, async (driver) => {
  await open(driver)
  await create(driver)
  await text(driver, '#polygon-count', '1')
  await text(driver, s.mapLabel, 'Polígono 1')
  assert.match(await (await element(driver, s.items)).getAttribute('class') ?? '', /\bselected\b/)
  assert.equal(await (await element(driver, s.draw)).getAttribute('data-mode'), 'edit')
})

scenario(cases.invalid, async (driver) => {
  await open(driver)
  const map = await (await element(driver, s.map)).getRect()
  for (const drawing of [[], triangle.slice(0, 1), triangle.slice(0, 2), [[-120, -50], [-60, -50], [0, -50]]]) {
    await (await element(driver, s.draw)).click()
    await driver.sleep(300)
    if (isAndroid) await driver.wait(() => driver.executeScript(() => (window as PocWindow).polygonTestApi!.getDrawingState!().ready), 15_000)
    let vertices = 0
    for (const [x, y] of drawing) {
      await clickPoint(driver, { x: map.width / 2 + x, y: map.height / 2 + y })
      if (isAndroid) {
        vertices++
        await driver.wait(async () => await driver.executeScript(() => (window as PocWindow).polygonTestApi!.getDrawingState!().vertices) === vertices, 5_000, `O SDK não recebeu o vértice ${vertices}.`)
      }
      await driver.sleep(150)
    }
    await (await element(driver, s.finish)).click()
    await attribute(driver, s.instructions, 'role', 'alert')
    assert.match(await (await element(driver, s.instructions)).getText(), /formando uma área/)
    await count(driver, s.items, 0)
    await visible(driver, s.finish)
    await (await element(driver, s.cancel)).click()
  }
  await persist(driver)
  await driver.navigate().refresh()
  await visible(driver, s.ready)
  await count(driver, s.items, 0)
})

scenario(cases.select, async (driver) => {
  await open(driver)
  await create(driver)
  assert.match(await (await element(driver, s.items)).getAttribute('class') ?? '', /\bselected\b/)
  assert.match(await (await element(driver, s.mapLabel)).getAttribute('class') ?? '', /\bis-selected\b/)
  assert.equal(await (await element(driver, s.finish)).isDisplayed(), false)
  const center = (await points(driver)).center
  await deselect(driver)
  assert.equal(await (await element(driver, s.draw)).getAttribute('data-mode'), 'create')
  await clickPoint(driver, center)
  await driver.wait(async () => (await (await element(driver, s.items)).getAttribute('class'))?.includes('selected'), 10_000)
  await visible(driver, s.finish)
  await (await element(driver, s.cancel)).click()
  await visible(driver, s.label)
  if (isAndroid) await (await element(driver, s.draw)).click()
  else await (await element(driver, s.label)).sendKeys(Key.ENTER)
  await visible(driver, s.finish)
  await (await element(driver, s.cancel)).click()
  await visible(driver, s.label)
  await beginEdit(driver)
  await (await element(driver, s.cancel)).click()
})

scenario(cases.edit, async (driver) => {
  await open(driver)
  await create(driver)
  const original = await (await element(driver, s.vertexList)).getText()
  await (await element(driver, s.draw)).click()
  await visible(driver, s.finish)
  await driver.sleep(500)
  await drag(driver, (await points(driver)).center, 70, 40)
  await text(driver, s.lastEdit, 'Polígono movido.')
  await textChanged(driver, s.vertexList, original)
  const moved = await (await element(driver, s.vertexList)).getText()
  await drag(driver, (await points(driver)).vertices[0], 45, 35)
  await text(driver, s.lastEdit, 'Vértice ou aresta arrastada.')
  await textChanged(driver, s.vertexList, moved)
  await clickPoint(driver, (await points(driver)).edgeMidpoint)
  await count(driver, s.vertices, 4)
  const edited = await (await element(driver, s.vertexList)).getText()
  await (await element(driver, s.finish)).click()
  await driver.wait(until.elementIsNotVisible(await element(driver, s.finish)), 10_000)
  await count(driver, s.vertices, 4)
  await text(driver, s.vertexList, edited)
})

scenario(cases.name, async (driver) => {
  await open(driver)
  await create(driver)
  await beginEdit(driver)
  for (const value of ['   ', 'Área@1', 'Área-1', 'Área_1']) {
    await fillName(driver, value)
    await confirmName(driver)
    assert.equal(await (await element(driver, s.name)).getAttribute('aria-invalid'), 'true')
    await attribute(driver, s.instructions, 'role', 'alert')
    await visible(driver, s.finish)
  }
  await fillName(driver, '  Área   São José 12  ')
  if (isAndroid) await confirmName(driver)
  else await (await element(driver, s.name)).sendKeys(Key.ENTER)
  await text(driver, s.label, 'Área São José 12')
  await text(driver, s.mapLabel, 'Área São José 12')
  await beginEdit(driver)
  await fillName(driver, 'A'.repeat(40))
  assert.equal(await (await element(driver, s.name)).getAttribute('value'), 'A'.repeat(30))
  await confirmName(driver)
  await text(driver, s.label, 'A'.repeat(30))
  await text(driver, s.mapLabel, 'A'.repeat(30))
})

scenario(cases.cancel, async (driver) => {
  await open(driver)
  await create(driver)
  const original = await (await element(driver, s.vertexList)).getText()
  await beginEdit(driver)
  await drag(driver, (await points(driver)).vertices[0], 45, 35)
  await textChanged(driver, s.vertexList, original)
  await fillName(driver, 'Nome temporário')
  await (await element(driver, s.cancel)).click()
  await text(driver, s.label, 'Polígono 1')
  await text(driver, s.mapLabel, 'Polígono 1')
  await text(driver, s.vertexList, original)
})

scenario(cases.persist, async (driver, restart) => {
  await open(driver)
  await create(driver)
  await beginEdit(driver)
  await drag(driver, (await points(driver)).vertices[0], 45, 35)
  await fillName(driver, 'Reserva São José')
  await (await element(driver, s.finish)).click()
  await driver.wait(until.elementIsNotVisible(await element(driver, s.finish)), 10_000)
  const saved = await (await element(driver, s.vertexList)).getText()
  await persist(driver)
  driver = await restart()
  if (isWeb) await driver.get(appUrl)
  await visible(driver, s.ready)
  await count(driver, s.items, 1)
  await text(driver, s.label, 'Reserva São José')
  await text(driver, s.mapLabel, 'Reserva São José')
  await (await element(driver, s.items)).click()
  await text(driver, s.vertexList, saved)
})

scenario(cases.delete, async (driver) => {
  await open(driver)
  await create(driver)
  await create(driver, 240)
  if (!isAndroid) {
  await deleteInEdit(driver)
  await (await element(driver, s.dismissClear)).click()
  await (await element(driver, s.cancel)).click()
  await count(driver, s.items, 2)
  assert.equal(await (await element(driver, s.finish)).isDisplayed(), false)
  await deleteInEdit(driver)
  await (await element(driver, s.confirmClear)).click()
  await count(driver, s.items, 1)
  await count(driver, s.mapLabel, 1)
  }
  const remaining = (await driver.findElements(By.css(s.items))).length
  await (await element(driver, s.remove)).click()
  await (await element(driver, s.dismissClear)).click()
  await count(driver, s.items, remaining)
  await (await element(driver, s.remove)).click()
  await (await element(driver, s.confirmClear)).click()
  await count(driver, s.items, remaining - 1)
  if (isAndroid) {
    await (await element(driver, s.clear)).click()
    await (await element(driver, s.confirmClear)).click()
  }
  await create(driver)
  await create(driver, 240)
  await (await element(driver, s.clear)).click()
  await (await element(driver, s.dismissClear)).click()
  await count(driver, s.items, 2)
  await (await element(driver, s.clear)).click()
  await (await element(driver, s.confirmClear)).click()
  await count(driver, s.items, 0)
  await count(driver, s.mapLabel, 0)
  assert.equal(await (await element(driver, s.clear)).isEnabled(), false)
})

scenario(cases.navigation, async (driver) => {
  await open(driver)
  await create(driver)
  const distance = async () => {
    const vertices = (await points(driver)).vertices
    return Math.hypot(vertices[0].x - vertices[1].x, vertices[0].y - vertices[1].y)
  }
  const original = await distance()
  await (await element(driver, s.zoomIn)).click()
  await driver.wait(async () => await distance() > original * 1.5, 10_000)
  await visible(driver, s.mapLabel)
  await (await element(driver, s.zoomOut)).click()
  await driver.wait(async () => Math.abs(await distance() - original) < 0.5, 10_000)
  const compass = await (await element(driver, s.compass)).getRect()
  const map = await (await element(driver, s.map)).getRect()
  await drag(driver, { x: compass.x + compass.width / 2 - map.x, y: compass.y + compass.height / 2 - map.y }, 60, 0)
  await attribute(driver, s.needle, 'style', 'transform: rotate(60deg);')
  await (await element(driver, s.compass)).click()
  await attribute(driver, s.needle, 'style', 'transform: rotate(0deg);')
  if (!isAndroid) {
  await (await element(driver, s.compass)).sendKeys(Key.ARROW_RIGHT)
  await attribute(driver, s.needle, 'style', 'transform: rotate(15deg);')
  await (await element(driver, s.compass)).sendKeys(Key.HOME)
  await attribute(driver, s.needle, 'style', 'transform: rotate(0deg);')
  }
})

if (!isAndroid) {
scenario(dualCases.sync, async (driver) => {
  await open(driver)
  await create(driver)
  await create(driver, 240)
  const { main, popup } = await separate(driver)
  await (await element(driver, s.items)).click()
  await driver.switchTo().window(popup)
  await text(driver, `${s.mapLabel}.is-selected`, 'Polígono 1')
  const center = (await points(driver)).center
  await driver.switchTo().window(main)
  await (await driver.findElements(By.css(s.items)))[1].click()
  await driver.switchTo().window(popup)
  await text(driver, `${s.mapLabel}.is-selected`, 'Polígono 2')
  await clickPoint(driver, center)
  await driver.switchTo().window(main)
  await attribute(driver, s.name, 'value', 'Polígono 1')
  await visible(driver, s.finish)
  await (await element(driver, s.cancel)).click()
  await driver.wait(until.elementIsNotVisible(await element(driver, s.finish)), 10_000)
  await createDetached(driver, main, popup, -240)
  await beginEdit(driver)
  const original = await (await element(driver, s.vertexList)).getText()
  await driver.switchTo().window(popup)
  await fillName(driver, 'Área compartilhada')
  await drag(driver, (await points(driver)).vertices[0], 45, 35)
  await driver.switchTo().window(main)
  await attribute(driver, s.name, 'value', 'Área compartilhada')
  await textChanged(driver, s.vertexList, original)
  await (await element(driver, s.finish)).click()
  await driver.wait(until.elementIsNotVisible(await element(driver, s.finish)), 10_000)
  const saved = await (await element(driver, s.vertexList)).getText()
  await driver.switchTo().window(popup)
  await text(driver, `${s.mapLabel}:last-child`, 'Área compartilhada')
  await beginEdit(driver)
  await driver.switchTo().window(main)
  await fillName(driver, 'Rascunho')
  await driver.switchTo().window(popup)
  await attribute(driver, s.name, 'value', 'Rascunho')
  await drag(driver, (await points(driver)).center, 35, 25)
  await driver.switchTo().window(main)
  await textChanged(driver, s.vertexList, saved)
  await driver.switchTo().window(popup)
  await (await element(driver, s.cancel)).click()
  await driver.switchTo().window(main)
  await text(driver, `${s.items}:last-child ${s.label}`, 'Área compartilhada')
  await text(driver, s.vertexList, saved)
  await (await driver.findElements(By.css(s.remove)))[2].click()
  await (await element(driver, s.dismissClear)).click()
  await count(driver, s.items, 3)
  await (await driver.findElements(By.css(s.remove)))[2].click()
  await (await element(driver, s.confirmClear)).click()
  await count(driver, s.items, 2)
  await driver.switchTo().window(popup)
  await count(driver, s.mapLabel, 2)
})

for (const fromMap of [false, true]) {
  scenario(fromMap ? dualCases.reuniteMap : dualCases.reuniteMain, async (driver) => {
    await open(driver)
    const { main, popup } = await separate(driver)
    await createDetached(driver, main, popup)
    await beginEdit(driver)
    await driver.switchTo().window(popup)
    await fillName(driver, 'Área reunida')
    await driver.switchTo().window(main)
    await (await element(driver, s.finish)).click()
    await text(driver, s.label, 'Área reunida')
    const saved = await (await element(driver, s.vertexList)).getText()
    if (fromMap) { await driver.switchTo().window(popup); await (await element(driver, s.returnMap)).click() }
    else await (await element(driver, s.reunite)).click()
    await driver.wait(async () => !(await driver.getAllWindowHandles()).includes(popup), 10_000)
    await driver.switchTo().window(main)
    await visible(driver, s.map)
    await text(driver, s.mapLabel, 'Área reunida')
    await text(driver, s.vertexList, saved)
    const again = await separate(driver)
    await beginEdit(driver)
    await driver.switchTo().window(again.popup)
    await count(driver, s.mapLabel, 1)
    await fillName(driver, 'Área reconectada')
    await driver.switchTo().window(main)
    await (await element(driver, s.finish)).click()
    await text(driver, s.label, 'Área reconectada')
    await text(driver, s.vertexList, saved)
    await driver.switchTo().window(again.popup)
    await text(driver, s.mapLabel, 'Área reconectada')
  })
}

scenario(dualCases.close, async (driver) => {
  await open(driver)
  await create(driver)
  const saved = await (await element(driver, s.vertexList)).getText()
  const { main, popup } = await separate(driver)
  await beginEdit(driver)
  await driver.switchTo().window(popup)
  await fillName(driver, 'Rascunho pendente')
  await drag(driver, (await points(driver)).vertices[0], 45, 35)
  await driver.switchTo().window(main)
  await textChanged(driver, s.vertexList, saved)
  await driver.switchTo().window(popup)
  await driver.close()
  await driver.switchTo().window(main)
  await visible(driver, s.map)
  await text(driver, s.label, 'Polígono 1')
  await text(driver, s.vertexList, saved)
  assert.equal(await (await element(driver, s.finish)).isDisplayed(), false)
  const again = await separate(driver)
  await beginEdit(driver)
  await driver.switchTo().window(again.popup)
  await fillName(driver, 'Sessão recuperada')
  await driver.switchTo().window(main)
  await (await element(driver, s.finish)).click()
  await text(driver, s.label, 'Sessão recuperada')
  await driver.switchTo().window(again.popup)
  await text(driver, s.mapLabel, 'Sessão recuperada')
})
}

for (const pointerType of (isWeb ? ['mouse', 'touch'] as const : [])) {
  scenario(cases[pointerType], async (driver) => {
    await open(driver, installUrl())
    const button = await visible(driver, s.install)
    if (pointerType === 'mouse') await button.click()
    else {
      const rect = await button.getRect()
      await driver.execute(new Command(Name.ACTIONS).setParameter('actions', [{
        type: 'pointer', id: 'installation-touch', parameters: { pointerType: 'touch' },
        actions: [
          { type: 'pointerMove', duration: 0, origin: 'viewport', x: Math.round(rect.x + rect.width / 2), y: Math.round(rect.y + rect.height / 2) },
          { type: 'pointerDown', button: 0 },
          { type: 'pause', duration: 100 },
          { type: 'pointerUp', button: 0 }
        ]
      }]))
    }
    const inputs = await driver.executeScript(() => (window as PocWindow).pocInstallInputs)
    assert.deepEqual(inputs, [{ pointerType, isTrusted: true }])
    await visible(driver, s.installDialog, 'O botão deve responder à interação e abrir as instruções.')
    assert.ok((await (await element(driver, '#install-dialog-description')).getText()).length > 0)
  })
}

after(() => {
  writeFileSync(`${directory}/results.json`, JSON.stringify({ framework: 'selenium', target, url: appUrl, tests: results }, null, 2))
})
