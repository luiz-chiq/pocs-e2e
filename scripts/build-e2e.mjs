import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

// Funciona também em clones novos, sem depender de um .env.e2e local.
const env = { ...process.env, VITE_E2E: 'true' }
for (const [entry, args] of [
  ['typescript/bin/tsc', ['--noEmit']],
  ['vite/bin/vite.js', ['build', '--mode', 'e2e']]
]) {
  const result = spawnSync(process.execPath, [resolve('node_modules', entry), ...args], { env, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status ?? 1)
}
