import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as browserConfig } from './wdio.conf'
import { appUrl, isAndroid, isElectron, isPwa, isWeb, installFixture, target, viewport } from './e2e/pocs/shared/fixtures'
import { androidCapabilities } from './e2e/pocs/shared/android'
import { startPwaBrowser, closePwaBrowser, releasePwa } from './e2e/pocs/webdriverio/session'
import { systemChrome } from './e2e/pocs/shared/chrome'
import { electronDriver } from './e2e/pocs/shared/electron'

const results: object[] = []
const directory = `${process.env.POC_RESULTS_DIR ?? `test-results/pocs/${target}`}/webdriverio`
const profile = resolve(directory, 'browser-profile')
mkdirSync(profile, { recursive: true })
if (isElectron) process.env.POLYGON_USER_DATA_DIR = profile

export const config = {
  ...browserConfig,
  specs: ['./e2e/pocs/webdriverio/web.e2e.ts'],
  capabilities: isAndroid ? [androidCapabilities] : isElectron ? [{
    browserName: 'electron',
    'wdio:chromedriverOptions': { binary: await electronDriver() },
    'wdio:electronServiceOptions': process.env.ELECTRON_APP_PATH
      ? { appBinaryPath: process.env.ELECTRON_APP_PATH, appArgs: [] }
      : { appEntryPoint: './electron/main.cjs', appArgs: [] }
  }] : [{
    browserName: 'chrome',
    'goog:chromeOptions': {
      ...(isPwa ? { binary: systemChrome() } : {}),
      args: [...browserConfig.capabilities[0]['goog:chromeOptions'].args.filter(arg => !isPwa || !arg.startsWith('--headless')), `--user-data-dir=${profile}`]
    }
  }],
  services: isElectron ? ['electron'] : [],
  ...(isAndroid ? { hostname: process.env.APPIUM_HOST ?? '127.0.0.1', port: Number(process.env.APPIUM_PORT ?? 4723), path: '/' } : {}),
  baseUrl: appUrl,
  mochaOpts: { ui: 'bdd', timeout: isAndroid ? 180_000 : 90_000 },
  beforeSession: async (_config: unknown, capabilities: Record<string, any>) => {
    if (isPwa) capabilities['goog:chromeOptions'] = { debuggerAddress: await startPwaBrowser(profile), binary: systemChrome() }
  },
  before: async () => {
    process.env.E2E_TARGET = isAndroid ? 'android' : isElectron ? 'electron' : 'browser'
    mkdirSync(directory, { recursive: true })
    if (!isAndroid) {
    await browser.setWindowSize(viewport.width, viewport.height)
    const padding = await browser.execute(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }))
    await browser.setWindowSize(viewport.width + padding.width, viewport.height + padding.height)
    }
    if (isWeb) await browser.addInitScript((source: string) => { new Function(source)() }, installFixture)
  },
  afterTest: async (test: { title: string }, _context: unknown, result: { passed: boolean; duration: number; error?: Error }) => {
    const artifacts: string[] = []
    let inputs: unknown
    try { inputs = await browser.execute(() => (window as Window & { pocInstallInputs?: unknown }).pocInstallInputs) } catch { /* Sessão indisponível. */ }
    const windows: object[] = []
    let main: string | undefined
    const auxiliary: string[] = []
    try {
    for (const [index, handle] of (await browser.getWindowHandles()).entries()) {
      await browser.switchToWindow(handle)
      const url = await browser.getUrl()
      if (url === 'about:blank' || (isPwa && url === appUrl && !(await browser.execute(() => matchMedia('(display-mode: standalone)').matches)))) continue
      windows.push({ handle, url })
      if (url.includes('mapWindow=')) auxiliary.push(handle)
      else main = handle
      if (!result.passed) {
        const path = `${directory}/${test.title.replace(/[^a-zA-Z0-9]+/g, '-').slice(0, 90)}-window-${index}.png`
        try { await browser.saveScreenshot(path); artifacts.push(path) } catch { /* Preservar a falha original. */ }
      }
    }
    for (const handle of auxiliary) { await browser.switchToWindow(handle); await browser.closeWindow() }
    if (main) await browser.switchToWindow(main)
    } catch (error) { windows.push({ captureError: String(error) }) }
    results.push({ title: test.title, status: result.passed ? 'passed' : 'failed', durationMs: result.duration, error: result.error?.message, inputs, windows, artifacts })
    writeFileSync(`${directory}/results.json`, JSON.stringify({ framework: 'webdriverio', target, url: appUrl, tests: results }, null, 2))
  },
  after: async () => { if (isPwa) await releasePwa() },
  afterSession: async () => { if (isPwa) await closePwaBrowser() },
  onComplete: () => { rmSync(profile, { recursive: true, force: true }) }
}
