import { spawn } from 'node:child_process'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { resolve, join } from 'node:path'
import { androidEnvironment, prepareAndroid } from './android-poc.mjs'

const selection = process.argv[2] ?? 'web'
const targets = selection === 'all' ? ['web', 'pwa', 'electron', 'android'] : [selection]
if (targets.some(target => !['web', 'pwa', 'electron', 'android'].includes(target))) throw new Error('Ambiente inválido. Use web, pwa, electron, android ou all.')
const frameworks = (process.env.POC_FRAMEWORKS ?? 'playwright,webdriverio,selenium').split(',')
if (frameworks.some(framework => !['playwright', 'webdriverio', 'selenium'].includes(framework))) throw new Error('POC_FRAMEWORKS inválido.')
const directory = resolve(process.env.POC_RESULTS_DIR ?? `test-results/pocs/${selection}-${new Date().toISOString().replace(/[:.]/g, '-')}`)
await mkdir(directory, { recursive: true })
let summary = []
try { summary = JSON.parse(await readFile(join(directory, 'summary.json'), 'utf8')).filter(result => !(targets.includes(result.target) && frameworks.includes(result.framework))) } catch {}
await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2))
let execution = {}
try { execution = JSON.parse(await readFile(join(directory, 'execution.json'), 'utf8')) } catch {}
async function updateReport(key, value) {
  if (key) execution[key] = value
  await writeFile(join(directory, 'execution.json'), JSON.stringify(execution, null, 2))
  const child = spawn(process.execPath, ['scripts/report-pocs.mjs', directory], { stdio: 'ignore' })
  await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
}

async function run(name, env, path) {
  const log = createWriteStream(path)
  const cli = process.env.npm_execpath
  const command = cli ? process.execPath : process.platform === 'win32' ? 'cmd.exe' : 'npm'
  const args = cli ? [cli, 'run', name] : process.platform === 'win32' ? ['/d', '/s', '/c', 'npm', 'run', name] : ['run', name]
  const child = spawn(command, args, { env, stdio: ['ignore', 'pipe', 'pipe'] })
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { log.write(chunk); process.stdout.write(chunk) })
  const exitCode = await new Promise(resolve => {
    child.on('error', error => { log.write(String(error)); resolve(1) })
    child.on('close', code => resolve(code ?? 1))
  })
  await new Promise(resolve => log.end(resolve))
  return exitCode
}

for (const target of targets) {
  const targetDirectory = join(directory, target)
  await mkdir(targetDirectory, { recursive: true })
  let env = { ...process.env, POC_TARGET: target, POC_RESULTS_DIR: targetDirectory }
  let android
  try {
    await updateReport(target, 'Em execução; resultados parciais abaixo.')
    if (target === 'electron' || target === 'android') {
      if (target === 'android') env = { ...await androidEnvironment(), POC_TARGET: target, POC_RESULTS_DIR: targetDirectory }
      console.log(`\nPreparando build ${target}...`)
      const build = await run(target === 'android' ? 'test:e2e:android:build' : 'electron:build:poc', { ...env, VITE_E2E: 'true' }, join(targetDirectory, 'build.log'))
      await updateReport(`${target}Build`, build === 0 ? (target === 'android' ? 'APK de debug gerado com sucesso.' : 'Aplicativo Electron empacotado para o sistema local em release/electron (sem instalador e sem assinatura).') : 'Falhou; consulte build.log. Testes desta plataforma não executados.')
      if (build !== 0) throw new Error(`Build ${target} falhou. Consulte build.log.`)
      if (target === 'electron' && !env.ELECTRON_APP_PATH) {
        env.ELECTRON_APP_PATH = process.platform === 'darwin'
          ? resolve(`release/electron/mac${process.arch === 'arm64' ? '-arm64' : ''}/Poligonos POC.app/Contents/MacOS/Poligonos POC`)
          : process.platform === 'win32' ? resolve('release/electron/win-unpacked/Poligonos POC.exe') : resolve('release/electron/linux-unpacked/poligonos-poc')
      }
    }
    if (target === 'android') { android = await prepareAndroid(env, targetDirectory); env = android.env }
    for (const framework of frameworks) {
      console.log(`\nExecutando ${framework} / ${target}...`)
      await rm(join(targetDirectory, framework, 'results.json'), { force: true })
      const started = performance.now()
      const exitCode = await run(`test:poc:${framework}`, env, join(targetDirectory, `${framework}.log`))
      let report
      try { report = JSON.parse(await readFile(join(targetDirectory, framework, 'results.json'), 'utf8')) } catch {}
      summary.push({ target, framework, exitCode, durationMs: Math.round(performance.now() - started), report, ...(report ? {} : { infrastructureError: 'A ferramenta encerrou sem produzir relatório.' }) })
      await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2))
      await updateReport()
    }
    const reports = summary.filter(result => result.target === target)
    const tests = reports.flatMap(result => result.report?.tests ?? [])
    const passed = tests.filter(test => test.status === 'passed').length
    const failed = tests.filter(test => ['failed', 'timedOut'].includes(test.status)).length
    const missing = reports.filter(result => !result.report).length
    await updateReport(target, `Execução concluída: ${passed} passaram, ${failed} falharam; ${tests.length - passed - failed} com outro status.${missing ? ` ${missing} ferramenta(s) sem relatório por falha de infraestrutura.` : ''} Consulte os detalhes abaixo.`)
  } catch (error) {
    console.error(String(error))
    for (const framework of frameworks) summary.push({ target, framework, exitCode: 1, status: 'not_run', infrastructureError: String(error) })
    await updateReport(target, `Impedimento: ${String(error)}. Etapa encerrada sem executar o restante desta plataforma.`)
  } finally { await android?.cleanup() }
}
await writeFile(join(directory, 'summary.json'), JSON.stringify(summary, null, 2))
console.log(`\nRelatórios: ${directory}`)
if (targets.includes('web')) console.log('C10 mouse deve falhar enquanto o defeito intencional de instalação existir.')
process.exitCode = summary.some(result => targets.includes(result.target) && result.exitCode !== 0) ? 1 : 0
