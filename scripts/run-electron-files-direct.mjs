import { spawnSync } from 'node:child_process'
import { mkdir, readFile, writeFile, access } from 'node:fs/promises'
import { openSync, closeSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { electronFileCases } from '../e2e/pocs/shared/electron-file-cases.ts'

const directory = resolve(process.env.POC_NATIVE_RESULTS_DIR ?? `test-results/pocs/electron-no-chromedriver-${new Date().toISOString().replace(/[:.]/g, '-')}`)
await mkdir(directory, { recursive: true })
const startedAt = new Date().toISOString()
const binary = process.env.ELECTRON_APP_PATH ?? (process.platform === 'darwin'
  ? resolve(`release/electron/mac${process.arch === 'arm64' ? '-arm64' : ''}/Poligonos POC.app/Contents/MacOS/Poligonos POC`)
  : process.platform === 'win32' ? resolve('release/electron/win-unpacked/Poligonos POC.exe') : resolve('release/electron/linux-unpacked/poligonos-poc'))
const run = (args, log, extra = {}) => {
  const descriptor = openSync(join(directory, log), 'w')
  try {
    const result = spawnSync(process.execPath, args, { env: { ...process.env, ELECTRON_APP_PATH: binary, ...extra }, stdio: ['ignore', descriptor, descriptor] })
    return result.status ?? 1
  } finally { closeSync(descriptor) }
}
console.log('Playwright: Electron direto + processo principal, sem ChromeDriver.')
const playwrightExit = run(['--test', '--test-concurrency=1', 'e2e/pocs/electron-files.test.ts'], 'playwright.log', {
  POC_FRAMEWORKS: 'playwright', POC_ELECTRON_DIRECT_MAIN: 'true', POC_NATIVE_RESULTS_DIR: join(directory, 'playwright')
})
const playwright = JSON.parse(await readFile(join(directory, 'playwright/results.json'), 'utf8'))
let preflights
try {
  await access(resolve('test-results/appium-mac2/node_modules/appium-mac2-driver/package.json'))
  console.log('Selenium: tentativa de sessão Appium Mac2 nativa, sem fallback para ChromeDriver.')
  run(['e2e/pocs/electron-mac2-bootstrap.ts'], 'mac2-clients.log', { POC_NATIVE_RESULTS_DIR: directory })
  preflights = JSON.parse(await readFile(join(directory, 'mac2-bootstrap.json'), 'utf8')).results
} catch (error) {
  preflights = ['selenium'].map(tool => ({ tool, status: 'unavailable', durationMs: null,
    transport: 'appium-mac2-native', chromeDriverUsed: false, error: String(error) }))
}
const xcode = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' })
const selected = spawnSync('xcode-select', ['-p'], { encoding: 'utf8' })
const reason = preflight => preflight.status === 'session-ready'
  ? 'Sessão nativa iniciada; os cenários da interface ainda precisam ser adaptados e validados na árvore de acessibilidade Mac2.'
  : `Sessão nativa indisponível: ${preflight.error}`
const tests = [...playwright.tests, ...preflights.flatMap(preflight => electronFileCases.map(title => ({
  tool: preflight.tool, title, status: 'unavailable', durationMs: null, reason: reason(preflight),
  transport: preflight.transport, mainControl: false
})))]
const report = { startedAt, finishedAt: new Date().toISOString(), platform: 'electron', mode: 'no-chromedriver',
  dialogSelection: 'simulated', chromeDriverUsed: false, tests, preflights, playwrightExit,
  environment: { platform: process.platform, xcodeSelected: selected.stdout?.trim(), xcodeAvailable: xcode.status === 0, xcodeOutput: `${xcode.stdout ?? ''}${xcode.stderr ?? ''}`.trim() },
  previousReport: 'old/ELECTRON-ARQUIVOS-COM-CHROMEDRIVER.md'
}
await writeFile(join(directory, 'results.json'), JSON.stringify(report, null, 2))
const rendering = spawnSync(process.execPath, ['scripts/report-electron-files.mjs'], {
  env: { ...process.env, POC_NATIVE_RESULTS_DIR: directory }, stdio: 'inherit'
})
console.log(`Evidências: ${directory}`)
process.exitCode = playwrightExit || rendering.status || (tests.some(test => test.status === 'unavailable') ? 2 : 0)
