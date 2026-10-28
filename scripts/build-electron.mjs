import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

const run = (entry, args = []) => {
  const result = spawnSync(process.execPath, [resolve(entry), ...args], { env: { ...process.env, CSC_IDENTITY_AUTO_DISCOVERY: 'false' }, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
run('node_modules/typescript/bin/tsc', ['--noEmit'])
run('node_modules/vite/bin/vite.js', ['build'])
const staging = resolve('.cache/electron-staging')
await rm(staging, { recursive: true, force: true })
await mkdir(staging, { recursive: true })
for (const path of ['dist', 'electron', 'public/icons']) await cp(path, resolve(staging, path), { recursive: true })
await writeFile(resolve(staging, 'package.json'), JSON.stringify({ name: 'poligonos-poc', version: '0.1.0', main: 'electron/main.cjs', description: 'Editor de polígonos em React e TypeScript', author: 'Polígonos' }, null, 2))
const { version } = JSON.parse(await readFile('node_modules/electron/package.json', 'utf8'))
const config = resolve('.cache/electron-builder.json')
await writeFile(config, JSON.stringify({
  appId: 'com.example.poligonos.poc', productName: 'Poligonos POC', asar: true,
  electronVersion: version, electronDist: resolve('node_modules/electron/dist'),
  directories: { output: resolve('release/electron') }, files: ['**/*'],
  mac: { identity: null, icon: resolve('public/icons/pwa-512.png') }, npmRebuild: false
}, null, 2))
const platform = process.platform === 'darwin' ? '--mac' : process.platform === 'win32' ? '--win' : '--linux'
run('node_modules/electron-builder/out/cli/cli.js', ['--projectDir', staging, '--config', config, platform, `--${process.arch}`, '--dir', '--publish', 'never'])
