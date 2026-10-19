import { spawn, type ChildProcess } from 'node:child_process'
import { readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import type { Duplex } from 'node:stream'
import { systemChrome } from './chrome.ts'
import type { CdpClient } from './pwa.ts'

// O Chromium só expõe as operações PWA privilegiadas à conexão local por pipe.
// Esta infraestrutura instala o app; WebDriver/Selenium continuam executando os testes.
export class ChromePipe implements CdpClient {
  private sequence = 0
  private pending = new Map<number, { resolve(value: any): void; reject(error: Error): void; timeout: ReturnType<typeof setTimeout> }>()
  private child: ChildProcess
  private input: Duplex
  debuggerAddress = ''

  private constructor(profile: string) {
    this.child = spawn(systemChrome(), [
      `--user-data-dir=${profile}`, '--remote-debugging-pipe', '--remote-debugging-port=0',
      '--no-first-run', '--no-default-browser-check', '--enable-automation',
      '--disable-sync', '--window-size=1280,900', 'about:blank'
    ], { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] })
    this.input = this.child.stdio[3] as Duplex
    let buffer = Buffer.alloc(0)
    ;(this.child.stdio[4] as Duplex).on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk])
      let end
      while ((end = buffer.indexOf(0)) !== -1) {
        const raw = buffer.subarray(0, end).toString('utf8')
        buffer = buffer.subarray(end + 1)
        if (!raw) continue
        const message = JSON.parse(raw)
        const request = this.pending.get(message.id)
        if (!request) continue
        this.pending.delete(message.id)
        clearTimeout(request.timeout)
        if (message.error) request.reject(new Error(message.error.message))
        else request.resolve(message.result)
      }
    })
    this.child.on('exit', () => {
      for (const request of this.pending.values()) { clearTimeout(request.timeout); request.reject(new Error('Chrome encerrado')) }
      this.pending.clear()
    })
    this.child.stderr?.resume()
  }

  static async launch(profile: string) {
    await rm(join(profile, 'DevToolsActivePort'), { force: true })
    const browser = new ChromePipe(profile)
    try {
      for (let attempt = 0; attempt < 200; attempt++) {
        if (browser.child.exitCode !== null) throw new Error('O Chrome encerrou durante a inicialização do perfil PWA.')
        try {
          const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]
          if (port) { browser.debuggerAddress = `127.0.0.1:${port}`; return browser }
        } catch {}
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      throw new Error('O Chrome não disponibilizou a porta de automação do perfil PWA.')
    } catch (error) { await browser.close(); throw error }
  }

  send(method: string, parameters = {}): Promise<any> {
    const id = ++this.sequence
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => { this.pending.delete(id); reject(new Error(`Tempo excedido em ${method}`)) }, 45_000)
      this.pending.set(id, { resolve, reject, timeout })
      this.input.write(`${JSON.stringify({ id, method, params: parameters })}\0`)
    })
  }

  async close() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return
    await this.send('Browser.close').catch(() => {})
    if (this.child.exitCode !== null || this.child.signalCode !== null) return
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => { this.child.kill('SIGTERM'); resolve() }, 5_000)
      this.child.once('exit', () => { clearTimeout(timer); resolve() })
    })
  }
}
