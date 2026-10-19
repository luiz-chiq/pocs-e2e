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

export class BrowserCdp implements CdpClient {
  private sequence = 0
  private socket: WebSocket
  private pending = new Map<number, { resolve(value: any): void; reject(error: Error): void; timeout: ReturnType<typeof setTimeout> }>()
  private constructor(socket: WebSocket) {
    this.socket = socket
    socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data))
      const request = this.pending.get(message.id)
      if (!request) return
      this.pending.delete(message.id)
      clearTimeout(request.timeout)
      if (message.error) request.reject(new Error(message.error.message))
      else request.resolve(message.result)
    })
    socket.addEventListener('close', () => {
      for (const request of this.pending.values()) {
        clearTimeout(request.timeout)
        request.reject(new Error('Conexão CDP encerrada'))
      }
      this.pending.clear()
    })
  }

  static async connect(debuggerAddress: string) {
    const response = await fetch(`http://${debuggerAddress}/json/version`)
    if (!response.ok) throw new Error(`Não foi possível localizar CDP: ${response.status}`)
    const info = await response.json() as { webSocketDebuggerUrl: string }
    const socket = new WebSocket(info.webSocketDebuggerUrl)
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener('error', () => reject(new Error('Não foi possível conectar ao CDP do navegador de teste')), { once: true })
    })
    return new BrowserCdp(socket)
  }

  send(method: string, parameters = {}): Promise<any> {
    const id = ++this.sequence
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Tempo excedido em ${method}`))
      }, 45_000)
      this.pending.set(id, { resolve, reject, timeout })
      this.socket.send(JSON.stringify({ id, method, params: parameters }))
    })
  }

  close() { this.socket.close() }
}
