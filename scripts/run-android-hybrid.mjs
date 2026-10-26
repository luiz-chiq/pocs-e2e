import { spawn } from 'node:child_process'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import { androidEnvironment, prepareAndroid } from './android-poc.mjs'
import { createWriteStream } from 'node:fs'

const directory = resolve(process.env.POC_RESULTS_DIR ?? `test-results/pocs/android-hybrid-${new Date().toISOString().replace(/[:.]/g, '-')}`)
await mkdir(directory, { recursive: true })
const env = { ...await androidEnvironment(), POC_RESULTS_DIR: directory }
const stages = []
const run = async (name, command, args, workdir) => {
  const start = performance.now()
  const log = createWriteStream(join(directory, `${name}.log`))
  const child = spawn(command, args, { env, cwd: workdir, stdio: ['ignore', 'pipe', 'pipe'] })
  for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => { log.write(chunk); process.stdout.write(chunk) })
  const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('close', resolve) })
  await new Promise(resolve => log.end(resolve))
  stages.push({ name, durationMs: Math.round(performance.now() - start), exitCode: code })
  if (code !== 0) throw new Error(`${name} terminou com código ${code}. Consulte ${name}.log.`)
}
let session
let failure
try {
  if (env.POC_SKIP_BUILD !== 'true') {
    await run('web-build', process.execPath, ['scripts/build-e2e.mjs'])
    await run('capacitor-sync', process.execPath, ['node_modules/@capacitor/cli/bin/capacitor', 'sync', 'android'])
    await run('apk-build', process.platform === 'win32' ? 'cmd.exe' : './gradlew', process.platform === 'win32' ? ['/d', '/s', '/c', 'gradlew.bat', 'assembleDebug'] : ['assembleDebug'], resolve('android'))
  }
  session = await prepareAndroid(env, directory, { nativeOnly: true })
  Object.assign(env, session.env)
  await run('hybrid', process.execPath, ['e2e/pocs/android-hybrid.test.ts'])
} catch (error) { failure = String(error); console.error(failure); process.exitCode = 1 }
finally {
  await session?.cleanup()
  await writeFile(join(directory, 'execution.json'), JSON.stringify({ stages, failure, results: join(directory, 'results.json') }, null, 2))
  console.log(`Evidências: ${directory}`)
}
