import { browser } from '@wdio/globals'
import { installPwa, launchPwa } from '../shared/pwa'
import { appUrl, viewport } from '../shared/fixtures'
import { ChromePipe } from '../shared/chrome-pipe'

let cdp: ChromePipe | undefined
let bootstrap: string
const manifestId = new URL('./', appUrl).href

export async function startPwaBrowser(profile: string) {
  await cdp?.close()
  cdp = await ChromePipe.launch(profile)
  return cdp.debuggerAddress
}

export async function closePwaBrowser() { await cdp?.close() }

export async function preparePwa(install: boolean) {
  bootstrap = await browser.getWindowHandle()
  if (!cdp) throw new Error('A conexão local do Chrome PWA não foi iniciada.')
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
  } finally { /* O processo é encerrado após a sessão WebDriver. */ }
}
