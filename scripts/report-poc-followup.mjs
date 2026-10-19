import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'

// Preservar a rodada comparativa. Revalidações de um subconjunto têm outra
// janela de medição e não devem substituir seus tempos silenciosamente.
export async function renderFollowup(config, helpers) {
  const { orderedEntries, planned, names, duration, elapsed, link, clean, preparationFailure, originalDuration } = helpers
  const entries = []
  for (const suite of config.suites) {
    const root = resolve(suite.root)
    const path = join(root, suite.platform, suite.tool, 'results.json')
    const report = JSON.parse(await readFile(path, 'utf8'))
    const timing = JSON.parse(await readFile(join(root, 'timing.json'), 'utf8'))
    const stage = timing.stages.find(item => item.target === suite.platform && item.framework === suite.tool && item.stage === 'suite' && item.finishedAt)
    entries.push({ ...suite, report, path, durationMs: stage?.durationMs, finishedAt: stage?.finishedAt })
  }
  const counts = (entries, filter = () => true) => {
    const result = { passed: 0, failed: 0, unavailable: 0 }
    for (const entry of entries) for (const title of planned(entry.platform).filter(filter)) {
      const test = entry.report?.tests.find(test => test.title === title)
      if (test?.status === 'passed') result.passed++
      else if (test && ['failed', 'timedOut'].includes(test.status) && !preparationFailure(test)) result.failed++
      else result.unavailable++
    }
    return result
  }
  const latest = orderedEntries.map(original => entries.find(entry => entry.tool === original.tool && entry.platform === original.platform) ?? original)
  const current = counts(latest), verified = counts(entries)
  const dualCurrent = counts(latest, title => title.startsWith('D'))
  const dualVerified = counts(entries, title => title.startsWith('D'))
  let shared = `## Revalidação após correções\n\n${clean(config.date)}. **Resultado mais recente consolidado: ${current.passed} aprovações, ${current.failed} falhas e ${current.unavailable} sem validação concluída**, de 150 casos. Combina as suítes reexecutadas abaixo com os resultados originais das demais combinações; não é uma nova rodada das 12 combinações.\n\n`
  shared += '| Ferramenta | Web | PWA instalado | Electron | Android |\n| --- | --- | --- | --- | --- |\n'
  for (const tool of ['playwright', 'selenium', 'webdriverio']) {
    const cells = ['web', 'pwa', 'electron', 'android'].map(platform => {
      const entry = latest.find(item => item.tool === tool && item.platform === platform)
      const result = counts([entry])
      const rerun = entries.includes(entry) ? ' (revalidado)' : ''
      return `${result.passed}/${planned(platform).length}${result.failed ? `; ${result.failed} falha(s)` : ''}${result.unavailable ? `; ${result.unavailable} sem validação` : ''}${rerun}`
    })
    shared += `| ${names[tool]} | ${cells.join(' | ')} |\n`
  }
  shared += '\nAs células marcadas como revalidadas usam a nova execução; as demais preservam a rodada original.\n\n'
  shared += `**Reexecutado após as alterações:** ${verified.passed} aprovações, ${verified.failed} falhas e ${verified.unavailable} sem validação concluída. Cada linha é uma suíte completa, com os testes de duas janelas integrados quando aplicáveis.\n\n`
  shared += `Duas janelas: ${dualVerified.passed} aprovações e ${dualVerified.failed} falhas nas suítes reexecutadas; consolidado mais recente de ${dualCurrent.passed} aprovações, ${dualCurrent.failed} falhas e ${dualCurrent.unavailable} sem validação, de 36 previstos.\n\n`
  shared += '| Ferramenta | Plataforma | Resultado atual | Soma dos testes | Tempo da nova suíte | Aumento na revalidação | Evidências |\n| --- | --- | --- | --- | --- | --- | --- |\n'
  for (const entry of entries) {
    const count = counts([entry])
    const peers = entries.filter(peer => peer.platform === entry.platform && peer.report.tests.length === planned(peer.platform).length && Number.isFinite(peer.durationMs))
    const increase = peers.length > 1 && Number.isFinite(entry.durationMs) ? `${((entry.durationMs / Math.min(...peers.map(peer => peer.durationMs)) - 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—'
    shared += `| ${names[entry.tool]} | ${names[entry.platform]} | ${count.passed} passaram; ${count.failed} falharam; ${count.unavailable} sem validação | ${duration(entry.report.tests.reduce((sum, test) => sum + (test.durationMs ?? 0), 0))} | ${elapsed(entry.durationMs)} | ${increase} | [JSON](${link(entry.path)}) · [Log](${link(join(resolve(entry.root), entry.platform, `${entry.tool}.log`))}) |\n`
  }
  shared += `\n**Comparação de tempos:** o aumento na tabela acima usa somente as ferramentas reexecutadas na mesma plataforma; “—” indica que só uma ferramenta foi reexecutada ou não há medição elegível. Os percentuais da matriz original abaixo usam somente a rodada contínua das três ferramentas. Os novos tempos acima pertencem à revalidação; não foram misturados ao total original de ${elapsed(originalDuration)} nem usados para recalcular seus percentuais. Os dois grupos aplicam (tempo ÷ menor tempo elegível − 1) × 100.\n\n`
  shared += '**Ajustes e diagnóstico:**\n\n' + config.corrections.map(item => `- ${item}\n`).join('')
  if (config.notes) shared += `\n${config.notes}\n`
  const failures = entries.flatMap(entry => entry.report.tests.filter(test => ['failed', 'timedOut', 'interrupted'].includes(test.status)).map(test => ({ entry, test })))
  const explanation = test => {
    if (test.title.startsWith('C10 mouse')) return 'defeito intencional de instalação continua detectado.'
    if (/aguardando alteração do texto/.test(test.error ?? '')) return 'a lista de coordenadas não confirmou a alteração após o arraste; cenário não concluído, causa inconclusiva.'
    if (/last-edit/.test(test.error ?? '')) return 'o feedback de movimento esperado não apareceu após o gesto; cenário não concluído, causa inconclusiva.'
    if (test.title.startsWith('D01') && /selected/.test(test.error ?? '')) return 'a seleção esperada entre janelas não foi confirmada; etapas posteriores não concluídas.'
    if (test.title.startsWith('C03') && /Wait timed out/.test(test.error ?? '')) return 'a seleção pelo mapa não foi confirmada no prazo; etapas posteriores não concluídas.'
    return clean(test.error).slice(0, 250)
  }
  shared += '\n**Falhas na revalidação:**\n\n' + (failures.length ? failures.map(({ entry, test }) => `- ${names[entry.tool]}/${names[entry.platform]} — ${clean(test.title)}: ${explanation(test)}\n`).join('') : 'Nenhuma falha nas suítes reexecutadas.\n')
  let full = shared
  if (config.attempts?.length) {
    full += '\n### Tentativas anteriores preservadas\n\nEstes registros pertencem à investigação e às execuções anteriores ao último ajuste. Não entram de novo na contagem consolidada e não foram usados para escolher o melhor tempo.\n\n| Tentativa | Resultado registrado | Soma dos testes | Evidência |\n| --- | --- | --- | --- |\n'
    for (const attempt of config.attempts) {
      const report = JSON.parse(await readFile(resolve(attempt.path), 'utf8'))
      const passed = report.tests.filter(test => test.status === 'passed').length
      const failed = report.tests.filter(test => ['failed', 'timedOut'].includes(test.status)).length
      full += `| ${clean(attempt.label)} | ${passed} passaram; ${failed} falharam | ${duration(report.tests.reduce((sum, test) => sum + (test.durationMs ?? 0), 0))} | [JSON](${link(resolve(attempt.path))}) |\n`
    }
  }
  if (config.details) full += `\n### Evidências e limites do diagnóstico\n\n${config.details}\n`
  full += '\n### Testes individuais reexecutados\n'
  for (const entry of entries) {
    full += `\n**${names[entry.tool]}/${names[entry.platform]}** — encerrada em ${entry.finishedAt}.\n\n| Teste | Resultado | Duração | Observação |\n| --- | --- | --- | --- |\n`
    for (const title of planned(entry.platform)) {
      const test = entry.report.tests.find(test => test.title === title)
      full += `| ${clean(title)} | ${test?.status === 'passed' ? '✅ Passou' : test ? '❌ Falhou' : '⛔ Sem execução'} | ${duration(test?.durationMs)} | ${test?.status === 'passed' ? 'Verificações concluídas.' : clean(test?.error ?? 'Sem resultado individual.')} |\n`
    }
  }
  full += '\n### Dados originais preservados\n\nAs seções seguintes descrevem a rodada comparativa anterior às correções. Seus resultados, tempos individuais, total contínuo e evidências foram preservados para comparação. A situação atual das combinações reexecutadas está acima.\n'
  const adjustmentStart = shared.indexOf('**Ajustes e diagnóstico:**')
  const failureStart = shared.indexOf('**Falhas na revalidação:**')
  const briefAdjustments = config.briefAdjustments ?? 'Esperas para elementos recriados, coordenação de teclado/botão, confirmação da entrega do clique, toques curtos e pausa de hover do mouse. Critérios e aplicativo preservados; sem repetir gestos até passar.'
  const briefLimit = config.briefLimit ?? 'O Playwright já passou nos três casos isolados antes do ajuste; 9/9 agora não prova estabilidade estatística. WDIO e Playwright desktop mantêm os resultados anteriores. Tentativas de diagnóstico constam na versão completa.'
  const briefShared = shared.slice(0, adjustmentStart) + `**Ajustes:** ${briefAdjustments}\n\n**Limite:** ${briefLimit}\n\n` + (config.briefNotes ? `${config.briefNotes}\n\n` : '') + shared.slice(failureStart)
  const brief = briefShared + '\nA versão completa lista também a duração de cada teste desta revalidação. As seções seguintes preservam a rodada comparativa original, anterior às correções.\n'
  return { full, brief }
}
