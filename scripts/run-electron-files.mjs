import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { mkdir, rm } from 'node:fs/promises'
const directory = resolve(process.env.POC_NATIVE_RESULTS_DIR ?? 'test-results/pocs/electron-files')
await mkdir(directory, { recursive: true })
await rm(resolve(directory, 'results.json'), { force: true })
const binary = process.platform === 'darwin'
  ? resolve(`release/electron/mac${process.arch === 'arm64' ? '-arm64' : ''}/Poligonos POC.app/Contents/MacOS/Poligonos POC`)
  : process.platform === 'win32' ? resolve('release/electron/win-unpacked/Poligonos POC.exe') : resolve('release/electron/linux-unpacked/poligonos-poc')
const result = spawnSync(process.execPath, ['--test', '--test-concurrency=1', 'e2e/pocs/electron-files.test.ts'], {
  env: { ...process.env, ELECTRON_APP_PATH: process.env.ELECTRON_APP_PATH ?? binary }, stdio: 'inherit'
})
const report = spawnSync(process.execPath, ['scripts/report-electron-files.mjs'], { env: process.env, stdio: 'inherit' })
process.exit(result.status || report.status || (result.error || report.error ? 1 : 0))
