import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative, join } from 'node:path'
import { cases, dualCases } from '../e2e/pocs/shared/fixtures.ts'
import { renderCurrentReport } from './report-poc-current.mjs'
import { verifyPocReports } from './verify-poc-reports.mjs'

const directory = resolve(process.argv[2] ?? 'test-results/pocs/final-2026-10-19')
const tools = ['playwright', 'selenium']
const platforms = ['web', 'pwa', 'electron', 'android']
const names = { playwright: 'Playwright', selenium: 'Selenium', web: 'Web', pwa: 'PWA instalado', electron: 'Electron', android: 'APK Android' }
const read = async path => {
  try { return JSON.parse(await readFile(path, 'utf8')) }
  catch (error) { if (error.code === 'ENOENT') return undefined; throw error }
}
const link = path => relative(resolve('e2e/pocs'), path).split('\\').join('/')
const clean = value => String(value ?? '').replace(/\u001b\[[0-9;]*m/g, '').replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, ' ').trim()
const duration = ms => Number.isFinite(ms) ? `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s` : '—'
const elapsed = ms => !Number.isFinite(ms) ? '—' : ms < 60_000 ? duration(ms) : `${Math.floor(ms / 60_000)} min ${duration(ms % 60_000)}`
const planned = platform => [...Object.values(cases).filter(title => platform === 'web' || !title.startsWith('C10')), ...(platform === 'android' ? [] : Object.values(dualCases))]
const [execution, timing, summary, followup, migration] = await Promise.all([
  read(join(directory, 'execution.json')), read(join(directory, 'timing.json')), read(join(directory, 'summary.json')),
  read(join(directory, 'followup.json')), readFile(resolve('e2e/pocs/PORTABILIDADE.md'), 'utf8')
])
const orderedEntries = []
for (const tool of tools) for (const platform of platforms) {
  const path = join(directory, platform, tool, 'results.json')
  const report = await read(path)
  orderedEntries.push({ tool, platform, report, path, run: summary?.find(item => item.target === platform && item.framework === tool) })
}
const config = {
  ...followup,
  suites: followup?.suites?.filter(suite => tools.includes(suite.tool)) ?? [],
  briefAdjustments: 'A main mantém somente Playwright e Selenium. A POC completa das três ferramentas está preservada na branch codex/poc-tres-ferramentas, commit 98f49f5. Os números abaixo filtram as evidências existentes; não representam uma nova execução.',
  briefLimit: 'A integração Android Playwright + Appium continua experimental e sem validação funcional completa. O cliente nativo foi migrado para Selenium JS; os resultados anteriores não validam esse novo adaptador.',
  briefNotes: 'O catálogo C/D tem 100 casos nas duas ferramentas. Arquivos Electron e o protótipo Android de arquivos/permissões possuem contagens e evidências separadas. A verificação da remoção reexecutou somente criação de polígono e recuperação da janela do mapa: 2/2 em [Playwright](../../test-results/pocs/remove-wdio-smoke/playwright/results.json) e 2/2 em [Selenium](../../test-results/pocs/remove-wdio-smoke/selenium/results.json). Não substitui as suítes completas históricas da matriz.',
  corrections: ['Comandos, dependências e suítes da ferramenta arquivada foram retirados da main.', 'Resultados e tempos de Playwright/Selenium preservam a origem das execuções anteriores; as falhas C10 mouse são intencionais.']
}
const { full, brief, status } = await renderCurrentReport(config, {
  orderedEntries, planned, names, duration, elapsed, link, clean,
  preparationFailure: test => /Browser.getWindowForTarget|Target browser must be a string/.test(test.error ?? ''),
  directory, timing, execution: execution ?? {}, migration
})
for (const [file, text] of [['RELATORIO.md', full], ['RELATORIO-DIRETO.md', brief], ['STATUS.md', status]]) {
  await writeFile(resolve('e2e/pocs', file), text)
  console.log(`Relatório atualizado: ${file}`)
}
if (followup) {
  await verifyPocReports(directory)
  console.log('Relatórios conferidos contra as evidências originais de Playwright/Selenium.')
}
