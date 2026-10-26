import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type IncomingMessage } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createNativeAppiumSession } from './appium-native.ts'

async function serverFor(run: (url: string, requests: { method: string; path: string; body: any }[]) => Promise<void>, broken?: string) {
  const requests: { method: string; path: string; body: any }[] = []
  const server = createServer(async (request: IncomingMessage, response) => {
    let body = ''
    for await (const chunk of request) body += chunk
    const path = request.url!, method = request.method!
    requests.push({ method, path, body: body ? JSON.parse(body) : undefined })
    if (broken === path) {
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify({ value: { error: 'unknown error', message: 'Falha nativa de teste' } }))
      return
    }
    let value: unknown = null
    if (path === '/session') value = { sessionId: 'native-session', capabilities: { platformName: 'Android' } }
    if (path.endsWith('/context')) value = 'NATIVE_APP'
    if (path.endsWith('/current_package')) value = 'com.google.android.documentsui'
    if (path.endsWith('/element')) value = { 'element-6066-11e4-a52e-4f735466cecf': 'native-element' }
    if (path.endsWith('/elements')) value = [{ 'element-6066-11e4-a52e-4f735466cecf': 'native-element' }]
    if (path.endsWith('/displayed')) value = true
    if (path.endsWith('/source')) value = '<hierarchy><node text="Permitir" /></hierarchy>'
    if (path.endsWith('/screenshot')) value = Buffer.from('screenshot-bytes').toString('base64')
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify({ value }))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address() as { port: number }
  try { await run(`http://127.0.0.1:${address.port}`, requests) }
  finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
}

test('Selenium envia comandos Appium nativos, seletores e evidências sem criar navegador', async () => {
  await serverFor(async (url, requests) => {
    const folder = await mkdtemp(join(tmpdir(), 'polygon-native-client-'))
    const client = await createNativeAppiumSession(url, { platformName: 'Android', 'appium:automationName': 'UiAutomator2', 'appium:autoWebview': false })
    try {
      assert.equal(client.sessionId, 'native-session')
      assert.equal(await client.getContext(), 'NATIVE_APP')
      assert.equal(await client.getCurrentPackage(), 'com.google.android.documentsui')
      await client.updateSettings({ waitForIdleTimeout: 500 })
      const element = client.element('android=new UiSelector().text("Permitir")')
      await element.waitForDisplayed({ timeout: 1000 })
      await element.click()
      assert.match(await client.getPageSource(), /Permitir/)
      await client.saveScreenshot(join(folder, 'native.png'))
      assert.equal(await readFile(join(folder, 'native.png'), 'utf8'), 'screenshot-bytes')
      await client.back()
      const capabilities = requests[0].body.capabilities.alwaysMatch
      assert.equal(capabilities.browserName, '')
      assert.equal(capabilities['appium:autoWebview'], false)
      assert(!Object.keys(capabilities).some(key => /chrome/i.test(key)))
      assert(!requests.some(item => item.path.endsWith('/execute/sync')))
      assert.deepEqual(requests.find(item => item.path.endsWith('/elements'))?.body, { using: '-android uiautomator', value: 'new UiSelector().text("Permitir")' })
      assert.deepEqual(requests.find(item => item.path.endsWith('/settings'))?.body, { settings: { waitForIdleTimeout: 500 } })
    } finally { await client.quit(); await rm(folder, { recursive: true, force: true }) }
    assert.equal(requests.at(-1)?.method, 'DELETE')
  })
})

test('erros do servidor Appium chegam ao teste, sem fallback de driver', async () => {
  await serverFor(async url => {
    const client = await createNativeAppiumSession(url, { platformName: 'Android' })
    try { await assert.rejects(client.getContext(), /Falha nativa de teste/) }
    finally { await client.quit() }
  }, '/session/native-session/context')
})

test('conexão nativa sem resposta tem tempo limite', async () => {
  const server = createServer(() => {})
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const { port } = server.address() as { port: number }
    await assert.rejects(createNativeAppiumSession(`http://127.0.0.1:${port}`, { platformName: 'Android' }, { timeoutMs: 50 }), /timeout|aborted/i)
  } finally { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())) }
})
