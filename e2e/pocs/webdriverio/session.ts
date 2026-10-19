import { browser } from '@wdio/globals'
import { BrowserCdp, installPwa, launchPwa } from '../shared/pwa'
import { appUrl, viewport } from '../shared/fixtures'

let cdp: BrowserCdp | undefined
let bootstrap: string
const manifestId = new URL('./', appUrl).href

export async function preparePwa(install: boolean) {
  cdp?.close()
  bootstrap = await browser.getWindowHandle()
  const options = (browser.capabilities as { 'goog:chromeOptions'?: { debuggerAddress?: string } })['goog:chromeOptions']
  if (!options?.debuggerAddress) throw new Error('ChromeDriver não informou o endereço CDP necessário para instalar o PWA.')
  cdp = await BrowserCdp.connect(options.debuggerAddress)
  if (install) {
    await browser.url(appUrl)
    await installPwa(cdp)
    await browser.url('about:blank')
  }
  await launchPwa(cdp, manifestId)
  await browser.waitUntil(async () => {
    for (const handle of await browser.getWindowHandles()) {
      await browser.switchToWindow(handle)
      if (await browser.execute(() => matchMedia('(display-mode: standalone)').matches)) return true
    }
    return false
  }, { timeout: 20_000, timeoutMsg: 'Não foi encontrada uma janela real do PWA instalado.' })
  await browser.setWindowSize(viewport.width, viewport.height)
  const padding = await browser.execute(() => ({ width: outerWidth - innerWidth, height: outerHeight - innerHeight }))
  await browser.setWindowSize(viewport.width + padding.width, viewport.height + padding.height)
}

export async function releasePwa() {
  try {
    await cdp?.send('PWA.uninstall', { manifestId })
    if ((await browser.getWindowHandles()).includes(bootstrap)) await browser.switchToWindow(bootstrap)
  } finally { cdp?.close() }
}
