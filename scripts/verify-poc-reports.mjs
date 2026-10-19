import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
import { resolve, join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cases, dualCases } from '../e2e/pocs/shared/fixtures.ts'

const tools = { playwright: 'Playwright', selenium: 'Selenium', webdriverio: 'WebdriverIO' }
const platforms = { web: 'Web', pwa: 'PWA instalado', electron: 'Electron', android: 'APK Android' }
const planned = platform => [...Object.values(cases).filter(title => platform === 'web' || !title.startsWith('C10')), ...(platform === 'android' ? [] : Object.values(dualCases))]
const json = async path => JSON.parse(await readFile(path, 'utf8'))
const duration = ms => `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`
const elapsed = ms => ms < 60_000 ? duration(ms) : `${Math.floor(ms / 60_000)} min ${duration(ms % 60_000)}`
const section = (text, title, level = 2) => text.split(`\n${'#'.repeat(level)} ${title}\n`)[1]?.split(`\n${'#'.repeat(level)} `)[0]
const rows = text => text.split('\n').filter(line => line.startsWith('| ')).slice(2).map(line => line.split('|').slice(1, -1).map(cell => cell.trim()))
const link = path => relative(resolve('e2e/pocs'), path).split('\\').join('/')
const headers = text => new Set([...text.matchAll(/^#{1,6} (.+)$/gm)].map(match => match[1].toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replaceAll(' ', '-')))

export async function verifyPocReports(resultsDirectory = 'test-results/pocs/final-2026-10-19') {
  const root = resolve(resultsDirectory)
  const [summary, followup, originalTiming] = await Promise.all([json(join(root, 'summary.json')), json(join(root, 'followup.json')), json(join(root, 'timing.json'))])
  const selected = new Map(summary.map(run => [`${run.framework}/${run.target}`, { root, run, report: run.report, timing: originalTiming }]))
  const seen = new Set()
  for (const suite of followup.suites) {
    const key = `${suite.tool}/${suite.platform}`
    assert(!seen.has(key), `Suíte repetida no manifesto: ${key}`); seen.add(key)
    const currentRoot = resolve(suite.root)
    const [report, timing, currentSummary] = await Promise.all([json(join(currentRoot, suite.platform, suite.tool, 'results.json')), json(join(currentRoot, 'timing.json')), json(join(currentRoot, 'summary.json'))])
    const run = currentSummary.find(run => run.framework === suite.tool && run.target === suite.platform)
    selected.set(key, { root: currentRoot, report, timing, run })
  }
  assert.equal(selected.size, 12, 'A matriz deve ter 12 combinações')
  let passed = 0, failed = 0, dualPassed = 0, dualFailed = 0
  for (const [key, entry] of selected) {
    const [tool, platform] = key.split('/')
    const { report, timing, run } = entry
    assert(report && run, `Suíte sem evidência: ${key}`)
    assert.equal(report.framework, tool); assert.equal(report.target, platform)
    assert.deepEqual(run.report, report, `summary e results divergem: ${key}`)
    assert.deepEqual([...report.tests.map(test => test.title)].sort(), planned(platform).sort(), `Catálogo incompleto/duplicado: ${key}`)
    entry.stage = timing.stages.find(stage => stage.target === platform && stage.framework === tool && stage.stage === 'suite' && stage.finishedAt)
    assert(entry.stage && Number.isFinite(entry.stage.durationMs), `Sem medição de comando: ${key}`)
    assert(report.tests.every(test => Number.isFinite(test.durationMs) && test.durationMs >= 0), `Duração inválida: ${key}`)
    assert(entry.stage.durationMs + 1000 >= report.tests.reduce((sum, test) => sum + test.durationMs, 0), `Soma maior que comando: ${key}`)
    entry.passed = report.tests.filter(test => test.status === 'passed').length
    entry.failed = report.tests.filter(test => ['failed', 'timedOut'].includes(test.status)).length
    assert.equal(entry.passed + entry.failed, planned(platform).length, `Há casos sem execução concluída: ${key}`)
    assert.equal(run.exitCode, entry.failed ? 1 : 0, `Código de saída inconsistente: ${key}`)
    passed += entry.passed; failed += entry.failed
    for (const test of report.tests.filter(test => test.title.startsWith('D'))) {
      if (test.status === 'passed') dualPassed++; else dualFailed++
    }
    entry.result = `${entry.passed}/${planned(platform).length} aprovados${entry.failed ? `; ${entry.failed} ${entry.failed === 1 ? 'falha' : 'falhas'}` : ''}`
  }
  const reportsRoot = resolve('e2e/pocs')
  const versions = ['RELATORIO.md', 'RELATORIO-DIRETO.md', 'STATUS.md']
  let platformTimes
  for (const name of versions) {
    const text = await readFile(join(reportsRoot, name), 'utf8')
    assert(text.includes(`${passed} aprovações, ${failed} falhas e 0 sem validação concluída`), `Contagem incorreta: ${name}`)
    assert(text.includes(`Duas janelas: ${dualPassed}/36 aprovados`) && text.includes(`${dualFailed} falhas e 0 sem validação`), `Duas janelas divergentes: ${name}`)
    const overview = rows(section(text, 'Resumo atual'))
    assert.equal(overview.length, 3)
    for (const [index, tool] of Object.keys(tools).entries()) {
      assert.deepEqual(overview[index], [tools[tool], ...Object.keys(platforms).map(platform => selected.get(`${tool}/${platform}`).result)], `Matriz divergente: ${name}`)
    }
    const timeRows = rows(section(text, 'Tempo de execução por plataforma'))
    assert.equal(timeRows.length, 4)
    for (const [index, platform] of Object.keys(platforms).entries()) {
      assert.deepEqual(timeRows[index], [platforms[platform], ...Object.keys(tools).map(tool => elapsed(selected.get(`${tool}/${platform}`).stage.durationMs))], `Tempo incorreto: ${name}/${platform}`)
    }
    if (platformTimes) assert.deepEqual(timeRows, platformTimes, `Versões com tempos diferentes: ${name}`)
    platformTimes = timeRows
    assert(!text.includes('Resumo da rodada original') && !text.includes('Sessão não disponível; cenário não executado.'), `Dados substituídos no documento atual: ${name}`)
    for (const anchor of [...text.matchAll(/\]\(#([^)]*)\)/g)].map(match => match[1])) assert(headers(text).has(anchor), `Sumário quebrado: ${name}#${anchor}`)
    if (name !== 'STATUS.md') {
      const detailed = rows(section(text, 'Tempos por ferramenta e plataforma'))
      assert.equal(detailed.length, 12)
      for (const [tool, toolName] of Object.entries(tools)) for (const [platform, platformName] of Object.entries(platforms)) {
        const entry = selected.get(`${tool}/${platform}`)
        const row = detailed.find(row => row[0] === toolName && row[1] === platformName)
        assert(row, `Medição ausente: ${name}/${tool}/${platform}`)
        assert.equal(row[2], entry.result)
        assert.equal(row[3], duration(entry.report.tests.reduce((sum, test) => sum + test.durationMs, 0)))
        assert.equal(row[4], elapsed(entry.stage.durationMs))
        const peers = Object.keys(tools).map(tool => selected.get(`${tool}/${platform}`))
        const percentage = peers.every(peer => peer.root === entry.root) ? `${((entry.stage.durationMs / Math.min(...peers.map(peer => peer.stage.durationMs)) - 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—'
        assert.equal(row[5], percentage)
        assert(row[6].includes(link(join(entry.root, platform, tool, 'results.json'))), `Origem desatualizada: ${name}/${tool}/${platform}`)
      }
    }
    if (name === 'RELATORIO.md') {
      assert.equal([...text.matchAll(/^\| [CD]\d/gm)].length, 150)
      for (const [tool, toolName] of Object.entries(tools)) for (const [platform, platformName] of Object.entries(platforms)) {
        const entry = selected.get(`${tool}/${platform}`)
        const block = section(section(text, toolName), platformName, 3)
        assert(block?.includes(link(join(entry.root, platform, tool, 'results.json'))), `JSON individual incorreto: ${tool}/${platform}`)
        const individual = rows(block)
        assert.equal(individual.length, entry.report.tests.length)
        for (const test of entry.report.tests) {
          const row = individual.find(row => row[0] === test.title)
          assert(row, `Caso ausente: ${tool}/${platform}/${test.title}`)
          assert.equal(row[1], test.status === 'passed' ? '✅ Passou' : '❌ Falhou')
          assert.equal(row[2], duration(test.durationMs))
        }
      }
    }
  }
  // A rodada nova de arquivos tem contagem própria, sem alterar os 150 casos C/D.
  let nativeCases = 0, nativePassed = 0
  const nativeText = await readFile(join(reportsRoot, 'ELECTRON-ARQUIVOS.md'), 'utf8').catch(error => {
    if (error.code === 'ENOENT') return ''
    throw error
  })
  if (nativeText) {
    const nativePath = nativeText.match(/\[resultados JSON\]\(([^)]+)\)/)?.[1]
    assert(nativePath, 'Rodada de arquivos sem fonte JSON')
    const native = await json(resolve(reportsRoot, nativePath))
    assert.equal(native.platform, 'electron')
    assert.equal(native.dialogSelection, 'simulated')
    const nativeTime = ms => `${(ms / 1000).toFixed(2)} s`
    const nativeSummary = rows(section(nativeText, 'Resumo'))
    const sums = Object.keys(tools).map(tool => native.tests.filter(test => test.tool === tool).reduce((sum, test) => sum + test.durationMs, 0))
    const complete = Object.keys(tools).every(tool => native.tests.filter(test => test.tool === tool).length === 5)
    for (const [index, [tool, toolName]] of Object.entries(tools).entries()) {
      const tests = native.tests.filter(test => test.tool === tool)
      assert.equal(new Set(tests.map(test => test.title)).size, tests.length, 'Caso nativo duplicado')
      assert(tests.every(test => /^N0[1-5] /.test(test.title) && Number.isFinite(test.durationMs) && test.durationMs >= 0))
      const passed = tests.filter(test => test.status === 'passed').length
      const failed = tests.filter(test => test.status === 'failed').length
      assert.equal(passed + failed, tests.length)
      const percentage = complete ? `${((sums[index] / Math.min(...sums) - 1) * 100).toFixed(2)}%` : '—'
      assert.deepEqual(nativeSummary[index], [toolName, String(passed), String(failed), String(5 - tests.length), nativeTime(sums[index]), percentage])
      const details = rows(section(nativeText, toolName, 3))
      assert.deepEqual(details, tests.map(test => [test.title, test.status === 'passed' ? 'Passou' : 'Falhou', nativeTime(test.durationMs)]))
      for (const test of tests.filter(test => test.status === 'passed')) {
        assert(test.audit?.length > 0 && test.audit.every(entry => entry.processType === 'browser' && entry.pid > 0), 'Falta auditoria do main no teste de arquivo')
      }
      nativeCases += tests.length; nativePassed += passed
    }
    const summaryText = nativeText.split('## Resumo\n')[1].split('## Testes por ferramenta\n')[0].trim()
    for (const name of versions) {
      const text = await readFile(join(reportsRoot, name), 'utf8')
      assert(text.includes(summaryText), `Resumo de arquivos divergente: ${name}`)
    }
    const full = await readFile(join(reportsRoot, 'RELATORIO.md'), 'utf8')
    const nativeDetails = nativeText.slice(nativeText.indexOf('## Testes por ferramenta\n')).replace(/^### /gm, '#### ').replace(/^## /gm, '### ')
    assert(full.includes(nativeDetails), 'Detalhes de arquivos divergentes do relatório completo')
  }
  // Os links dos arquivos antigos também precisam continuar funcionando após mover.
  const files = await readdir(reportsRoot, { recursive: true })
  const archives = files.filter(name => name.startsWith('old/') && name.endsWith('.md') && name !== 'old/README.md')
  assert(archives.length > 0, 'Histórico não foi arquivado')
  assert(!files.some(name => !name.includes('/') && ((name.startsWith('RELATORIO') && !versions.includes(name)) || name === 'RESULTADOS-WEB.md')), 'Há relatório antigo fora de old/')
  // Conferir os valores preservados nas tabelas antigas sem convertê-los em
  // resultados atuais. Uma linha antiga deve ter respaldo em resultado bruto.
  const rawRoot = resolve('test-results/pocs')
  const rawFiles = (await readdir(rawRoot, { recursive: true })).filter(name => name.endsWith('/results.json'))
  const rawResults = await Promise.allSettled(rawFiles.map(name => json(join(rawRoot, name))))
  const historicalValues = new Set()
  for (const result of rawResults) {
    if (result.status === 'rejected') throw result.reason
    for (const test of result.value.tests ?? []) if (Number.isFinite(test.durationMs)) {
      const state = ['failed', 'timedOut'].includes(test.status) ? 'failed' : test.status
      historicalValues.add(JSON.stringify([test.title, state, duration(test.durationMs)]))
    }
  }
  let historicalRows = 0
  for (const name of files.filter(name => name.endsWith('.md'))) {
    const path = join(reportsRoot, name), text = await readFile(path, 'utf8')
    if (archives.includes(name)) {
      assert(text.includes('RELATÓRIO HISTÓRICO — RESULTADOS SUBSTITUÍDOS'), `Arquivo antigo sem aviso: ${name}`)
      for (const match of text.matchAll(/^\| ([CD]\d[^|]+) \| ([^|]+) \| ([^|]+) \|/gm)) {
        const [, title, outcome, measured] = match
        const state = outcome.includes('✅') ? 'passed' : outcome.includes('❌') ? 'failed' : undefined
        if (!state || !/^\d+(?:[.,]\d+)? s$/.test(measured.trim())) continue
        assert(historicalValues.has(JSON.stringify([title.trim(), state, measured.trim()])), `Linha histórica sem respaldo nos JSONs: ${name}/${title.trim()}/${measured.trim()}`)
        historicalRows++
      }
    }
    for (const match of text.matchAll(/\]\(([^)]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, '')
      if (/^(?:https?:|mailto:|codex:|#)/.test(target)) continue
      await readFile(resolve(dirname(path), target.split('#')[0])).catch(error => { if (error.code !== 'EISDIR') throw new Error(`Link quebrado em ${name}: ${target}`, { cause: error }) })
    }
  }
  return { combinations: selected.size, cases: passed + failed, passed, failed, dualPassed, dualFailed, nativeCases, nativePassed, versions: versions.length, archives: archives.length, historicalRows }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await verifyPocReports(process.argv[2])
  console.log(`Relatórios conferidos contra os JSONs: ${result.combinations} combinações, ${result.cases} casos, ${result.passed} aprovados e ${result.failed} falhas; duas janelas ${result.dualPassed}/36. Arquivos do main Electron: ${result.nativePassed}/${result.nativeCases} aprovados, contabilizados separadamente. ${result.versions} versões atuais e ${result.archives} arquivos históricos (${result.historicalRows} linhas numéricas conferidas); tempos, percentuais, origens e links válidos.`)
}
