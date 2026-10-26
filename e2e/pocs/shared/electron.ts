import { access, chmod, mkdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { downloadArtifact } from '@electron/get'
import extract from 'extract-zip'

export async function electronDriver() {
  if (process.env.CHROMEDRIVER_PATH) return resolve(process.env.CHROMEDRIVER_PATH)
  const { version } = JSON.parse(await readFile('node_modules/electron/package.json', 'utf8'))
  const directory = resolve(`test-results/driver-cache/electron-${version}`)
  const binary = resolve(directory, process.platform === 'win32' ? 'chromedriver.exe' : 'chromedriver')
  try { await access(binary); return binary } catch { /* Primeiro uso: baixar o driver oficial da mesma versão. */ }
  const archive = await downloadArtifact({
    version, artifactName: 'chromedriver', platform: process.platform, arch: process.arch,
    cacheRoot: resolve('test-results/driver-cache')
  })
  await mkdir(directory, { recursive: true })
  await extract(archive, { dir: directory })
  if (process.platform !== 'win32') await chmod(binary, 0o755)
  return binary
}
