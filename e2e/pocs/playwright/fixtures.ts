import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { test as base, expect, chromium, _electron, _android, type Page, type BrowserContext, type ElectronApplication } from '@playwright/test'
import { appUrl, isAndroid, isElectron, isPwa, isWeb, target, viewport } from '../shared/fixtures'
import { installPwa, launchPwa, type CdpClient } from '../shared/pwa'

interface AppSession {
  main(): Promise<Page>
  context(): BrowserContext
  restart(): Promise<Page>
  metadata(): Promise<object>
  close(): Promise<void>
}

async function desktopSession(): Promise<AppSession> {
  const profile = await mkdtemp(join(tmpdir(), `polygon-${target}-playwright-`))
  let context: BrowserContext
  let application: ElectronApplication | undefined
  let cdp: CdpClient
  let manifestId: string | undefined
  let page: Page
  const start = async (install: boolean) => {
    if (isElectron) {
      const env: Record<string, string> = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined))
      env.POLYGON_USER_DATA_DIR = profile
      delete env.ELECTRON_RUN_AS_NODE
      application = await _electron.launch({
        executablePath: process.env.ELECTRON_APP_PATH,
        args: process.env.ELECTRON_APP_PATH ? [] : [resolve('electron/main.cjs')], env, timeout: 45_000
      })
      page = await application.firstWindow()
      context = page.context()
    } else {
      context = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: false, viewport })
      cdp = await context.browser()!.newBrowserCDPSession() as unknown as CdpClient
      if (install) {
        await context.pages()[0].goto(appUrl)
        manifestId = await installPwa(cdp)
      }
      await launchPwa(cdp, manifestId!)
      let standalone: Page | undefined
      for (let attempt = 0; attempt < 100 && !standalone; attempt++) {
        for (const candidate of context.pages()) {
          if (await candidate.evaluate(() => matchMedia('(display-mode: standalone)').matches).catch(() => false)) standalone = candidate
        }
        if (!standalone) await new Promise(resolve => setTimeout(resolve, 100))
      }
      if (!standalone) throw new Error('O Chrome não abriu uma janela real do PWA instalado.')
      page = standalone
      for (const other of context.pages()) if (other !== page) await other.close()
    }
    context.setDefaultTimeout(10_000)
    context.setDefaultNavigationTimeout(45_000)
    await page.getByTestId('map-ready').waitFor({ timeout: 45_000 })
    if (isPwa) expect(await page.evaluate(() => matchMedia('(display-mode: standalone)').matches)).toBe(true)
    return page
  }
  try { await start(true) } catch (error) {
    await application?.close().catch(() => {})
    await context!.close().catch(() => {})
    await rm(profile, { recursive: true, force: true })
    throw error
  }
  return {
    main: async () => page,
    context: () => context,
    restart: async () => {
      if (application) await application.close()
      else await context.close()
      return start(false)
    },
    metadata: async () => ({
      target,
      ...(await page.evaluate(() => ({ url: location.href, standalone: matchMedia('(display-mode: standalone)').matches, userAgent: navigator.userAgent }))),
      ...(application ? await application.evaluate(({ app }) => ({ packaged: app.isPackaged })) : {})
    }),
    close: async () => {
      try {
        if (manifestId) await cdp.send('PWA.uninstall', { manifestId })
      } finally {
        if (application) await application.close()
        else await context.close()
        await rm(profile, { recursive: true, force: true })
      }
    }
  }
}

async function androidSession(): Promise<AppSession> {
  let device
  for (let attempt = 0; attempt < 100 && !device; attempt++) {
    const devices = await _android.devices()
    device = process.env.ANDROID_SERIAL ? devices.find(item => item.serial() === process.env.ANDROID_SERIAL) : devices[0]
    if (!device) await new Promise(resolve => setTimeout(resolve, 200))
  }
  if (!device) throw new Error('Nenhum Android disponível no adb. Inicie um emulador e instale o APK E2E.')
  const android = device
  android.setDefaultTimeout(45_000)
  const pkg = 'com.example.tasks.poc'
  let page: Page
  const stop = async () => {
    await android.shell(`am force-stop ${pkg}`)
    // A descoberta de WebViews é assíncrona. Não reutilizar o alvo do processo encerrado.
    await expect.poll(() => android.webViews().filter(view => view.pkg() === pkg).length, { timeout: 15_000 }).toBe(0)
  }
  const start = async () => {
    await android.shell(`am start -W -n ${pkg}/.MainActivity`)
    await expect.poll(async () => (await android.shell(`pidof ${pkg}`)).toString().trim(), { timeout: 15_000 }).not.toBe('')
    const pid = Number((await android.shell(`pidof ${pkg}`)).toString().trim())
    await expect.poll(() => android.webViews().map(view => `${view.pkg()}:${view.pid()}`), { timeout: 30_000 }).toContain(`${pkg}:${pid}`)
    page = await android.webViews().find(view => view.pkg() === pkg && view.pid() === pid)!.page()
    page.context().setDefaultTimeout(15_000)
    await page.getByTestId('map-ready').waitFor({ timeout: 45_000 })
    return page
  }
  await stop()
  await android.shell(`pm clear ${pkg}`)
  await start()
  return {
    main: async () => page, context: () => page.context(),
    restart: async () => { await stop(); return start() },
    metadata: async () => ({ target, serial: android.serial(), url: page.url() }),
    close: async () => { try { await android.shell(`am force-stop ${pkg}`) } finally { await android.close() } }
  }
}

export const test = base.extend<{ appSession: AppSession | undefined }>({
  appSession: async ({}, use, testInfo) => {
    if (isWeb) return use(undefined)
    const session = isAndroid ? await androidSession() : await desktopSession()
    try {
      await testInfo.attach('environment', { body: JSON.stringify(await session.metadata()), contentType: 'application/json' })
      await use(session)
    } finally { await session.close() }
  },
  ...(!isWeb ? {
    page: async ({ appSession }: { appSession: AppSession | undefined }, use: (page: Page) => Promise<void>) => { await use(await appSession!.main()) },
    context: async ({ appSession }: { appSession: AppSession | undefined }, use: (context: BrowserContext) => Promise<void>) => { await use(appSession!.context()) }
  } : {})
})
export { expect }
