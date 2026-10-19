type WindowMode = 'main' | 'detached' | 'map'

export function createId() {
  // randomUUID exige contexto seguro; getRandomValues também funciona em HTTP local/LAN.
  return crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint8Array(16)),
    (byte) => byte.toString(16).padStart(2, '0')).join('')
}

interface WindowCallbacks<State, Command> {
  getState(): State
  applyState(state: State): void | Promise<void>
  executeCommand(command: Command): void
  onModeChange(mode: WindowMode, connected: boolean): void
  onReturn(): void
  onError(message: string): void
}

// Cada par de janelas tem uma sessão própria. A origem e a janela remetente
// são conferidas para não aceitar comandos de outras abas ou sites.
export class DetachedMap<State, Command> {
  readonly isMapWindow: boolean
  private readonly origin = location.origin
  private session = new URL(location.href).searchParams.get('mapWindow')
  private popup: Window | null = null
  private connected = false
  private started = false
  private connectionTimeout?: number

  constructor(private readonly callbacks: WindowCallbacks<State, Command>) {
    this.isMapWindow = Boolean(this.session && window.opener)
    callbacks.onModeChange(this.isMapWindow ? 'map' : 'main', false)
    window.addEventListener('message', (event) => void this.receive(event))
    window.addEventListener('pagehide', () => {
      if (this.isMapWindow) this.send(window.opener, 'loading')
      else this.popup?.close()
    })
    window.setInterval(() => {
      if (this.popup?.closed) this.restore()
    }, 400)
  }

  start() {
    this.started = true
    if (this.isMapWindow) this.send(window.opener, 'ready')
  }

  open() {
    if (this.isMapWindow || !this.started) return
    if (this.popup && !this.popup.closed) {
      this.popup.focus()
      return
    }
    this.session = createId()
    const url = new URL(location.href)
    url.searchParams.set('mapWindow', this.session)
    this.popup = window.open(url, `polygon-map-${this.session}`, 'popup,width=1100,height=800,resizable=yes,scrollbars=yes')
    if (!this.popup) {
      this.session = null
      this.callbacks.onError('O navegador bloqueou a nova janela. Permita pop-ups para este site e tente separar o mapa novamente.')
      return
    }
    this.connected = false
    this.callbacks.onModeChange('detached', false)
    this.connectionTimeout = window.setTimeout(() => {
      if (this.popup && !this.connected) {
        this.reunite()
        this.callbacks.onError('Não foi possível conectar a janela do mapa. Tente separar o mapa novamente.')
      }
    }, 30_000)
  }

  focus() { this.popup?.focus() }

  reunite() {
    if (this.isMapWindow) this.send(window.opener, 'return')
    else {
      this.popup?.close()
      this.restore()
    }
  }

  // Retorna true quando a ação foi encaminhada para o mapa separado.
  command(command: Command) {
    if (!this.isMapWindow && this.popup && !this.popup.closed) {
      if (this.connected) this.send(this.popup, 'command', command)
      return true
    }
    return false
  }

  publish() {
    if (this.isMapWindow && this.connected) this.send(window.opener, 'state', this.callbacks.getState())
  }

  private send(target: Window | null, type: string, payload?: unknown) {
    target?.postMessage({ app: 'polygon-detached-map', session: this.session, type, payload }, this.origin)
  }

  private restore() {
    if (!this.popup) return
    window.clearTimeout(this.connectionTimeout)
    this.popup = null
    this.session = null
    this.connected = false
    this.callbacks.onModeChange('main', true)
    this.callbacks.onReturn()
  }

  private async receive(event: MessageEvent) {
    const peer = this.isMapWindow ? window.opener : this.popup
    const data = event.data
    if (!peer || event.source !== peer || event.origin !== this.origin || !data ||
        data.app !== 'polygon-detached-map' || data.session !== this.session) return

    if (this.isMapWindow) {
      if (data.type === 'initialize' && this.started) {
        this.connected = false
        await this.callbacks.applyState(data.payload as State)
        this.connected = true
        this.callbacks.onModeChange('map', true)
        this.publish()
        this.send(peer, 'connected')
      }
      if (data.type === 'command' && this.connected) this.callbacks.executeCommand(data.payload as Command)
    } else {
      if (data.type === 'ready' && this.started) this.send(peer, 'initialize', this.callbacks.getState())
      if (data.type === 'connected') {
        window.clearTimeout(this.connectionTimeout)
        this.connected = true
        this.callbacks.onModeChange('detached', true)
      }
      if (data.type === 'loading') {
        this.connected = false
        this.callbacks.onModeChange('detached', false)
      }
      if (data.type === 'state') await this.callbacks.applyState(data.payload as State)
      if (data.type === 'return') this.reunite()
    }
  }
}
