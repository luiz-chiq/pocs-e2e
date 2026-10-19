import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

export function systemChrome() {
  const candidates = [process.env.CHROME_BINARY]
  if (process.platform === 'darwin') candidates.push('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
  if (process.platform === 'win32') {
    for (const base of [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA]) {
      if (base) candidates.push(join(base, 'Google/Chrome/Application/chrome.exe'))
    }
  }
  for (const candidate of candidates) if (candidate && existsSync(candidate)) return candidate
  if (process.platform === 'linux') {
    for (const binary of ['google-chrome-stable', 'google-chrome']) {
      try { return execFileSync('which', [binary], { encoding: 'utf8' }).trim() } catch {}
    }
  }
  throw new Error('Google Chrome instalado não encontrado. Configure CHROME_BINARY para testar o PWA real.')
}
