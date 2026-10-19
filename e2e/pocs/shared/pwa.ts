import { appUrl } from './fixtures.ts'

export interface CdpClient {
  send(method: string, parameters?: Record<string, unknown>): Promise<any>
}

// Infraestrutura de instalação. Os gestos e asserções continuam em cada ferramenta.
export async function installPwa(cdp: CdpClient) {
  const manifestId = new URL('./', appUrl).href
  await cdp.send('PWA.install', { manifestId, installUrlOrBundleUrl: appUrl })
  await cdp.send('PWA.changeAppUserSettings', { manifestId, displayMode: 'standalone' })
  await cdp.send('PWA.getOsAppState', { manifestId })
  return manifestId
}

export async function launchPwa(cdp: CdpClient, manifestId: string) {
  return cdp.send('PWA.launch', { manifestId })
}
