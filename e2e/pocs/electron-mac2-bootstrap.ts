// Diagnóstico de sessão nativa. Não conta o bootstrap como teste de importação/exportação.
import { Builder } from 'selenium-webdriver'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile, rm, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { createWriteStream } from 'node:fs'

const directory = resolve(process.env.POC_NATIVE_RESULTS_DIR ?? 'test-results/pocs/electron-no-chromedriver')
await mkdir(directory, { recursive: true })
const home = resolve('test-results/appium-mac2')
const port = Number(process.env.MAC2_APPIUM_PORT ?? 4725)
const address = `http://127.0.0.1:${port}`
const application = process.env.MAC2_APP_PATH ?? resolve('release/electron/mac-arm64/Poligonos POC.app')
const log = createWriteStream(join(directory, 'appium-mac2.log'))
const server = spawn(process.execPath, [resolve('node_modules/appium/index.js'), '--address', '127.0.0.1', '--port', String(port), '--use-drivers', 'mac2', '--log-no-colors'], {
  env: { ...process.env, APPIUM_HOME: home }, stdio: ['ignore', 'pipe', 'pipe']
})
server.stdout!.pipe(log, { end: false })
server.stderr!.pipe(log, { end: false })
const results: object[] = []
try {
  const deadline = Date.now() + 20000
  while (true) {
    if (server.exitCode !== null) throw new Error('Appium encerrou antes de iniciar. Consulte appium-mac2.log.')
    if (await fetch(`${address}/status`).then(response => response.ok).catch(() => false)) break
    if (Date.now() > deadline) throw new Error('Appium Mac2 não respondeu em 20 s.')
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  for (const tool of ['selenium']) {
    const started = performance.now()
    const profile = await mkdtemp(join(tmpdir(), `polygon-mac2-${tool}-`))
    const capabilities = {
      browserName: '', platformName: 'mac', 'appium:automationName': 'Mac2',
      'appium:bundleId': 'com.example.poligonos.poc', 'appium:appPath': application,
      'appium:arguments': ['--force-renderer-accessibility'],
      'appium:environment': { POLYGON_USER_DATA_DIR: profile },
      'appium:noReset': false, 'appium:serverStartupTimeout': 15000, 'appium:showServerLogs': true
    }
    let close: (() => Promise<unknown>) | undefined
    let status = 'session-ready', error: string | undefined
    try {
      // Servidor explícito e capabilities nativas: não chama Selenium Manager nem ChromeDriver.
      const client = await new Builder().usingServer(address).withCapabilities(capabilities).build()
      close = () => client.quit()
    } catch (failure) { status = 'unavailable'; error = failure instanceof Error ? failure.message : String(failure) }
    finally {
      await close?.()
      await rm(profile, { recursive: true, force: true })
    }
    results.push({ tool, status, error, transport: 'appium-mac2-native', chromeDriverUsed: false,
      durationMs: Math.round(performance.now() - started), capabilities: { ...capabilities, 'appium:environment': { POLYGON_USER_DATA_DIR: '<perfil isolado temporário>' } } })
    console.log(JSON.stringify(results.at(-1)))
  }
} finally {
  server.kill()
  if (server.exitCode === null) await new Promise<void>(resolve => { server.once('close', () => resolve()); setTimeout(resolve, 5000) })
  log.end()
  await writeFile(join(directory, 'mac2-bootstrap.json'), JSON.stringify({ finishedAt: new Date().toISOString(), results,
    installedDriver: JSON.parse(await readFile(join(home, 'node_modules/appium-mac2-driver/package.json'), 'utf8')).version }, null, 2))
}
if (results.some((result: any) => result.status !== 'session-ready')) process.exitCode = 1
