import { readFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'

// Cada combinação usa uma única suíte completa. Diagnósticos e resultados
// substituídos ficam nos arquivos históricos, fora das tabelas atuais.
export async function renderCurrentReport(config, helpers) {
  const { orderedEntries, planned, names, duration, elapsed, link, clean, preparationFailure, directory, timing, execution, migration } = helpers
  const tools = ['playwright', 'selenium', 'webdriverio']
  const platforms = ['web', 'pwa', 'electron', 'android']
  const json = async path => JSON.parse(await readFile(path, 'utf8'))
  const replacements = new Map()
  const loaded = await Promise.allSettled(config.suites.map(async suite => {
    const root = resolve(suite.root)
    const path = join(root, suite.platform, suite.tool, 'results.json')
    const [report, measurement, summary] = await Promise.all([json(path), json(join(root, 'timing.json')), json(join(root, 'summary.json'))])
    return { ...suite, root, path, report, measurement, run: summary.find(item => item.target === suite.platform && item.framework === suite.tool), revalidated: true }
  }))
  for (const result of loaded) {
    if (result.status === 'rejected') throw result.reason
    const entry = result.value
    const key = `${entry.tool}/${entry.platform}`
    if (replacements.has(key)) throw new Error(`Revalidação duplicada: ${key}`)
    replacements.set(key, entry)
  }
  const entries = orderedEntries.map(entry => replacements.get(`${entry.tool}/${entry.platform}`) ?? { ...entry, root: directory, measurement: timing, revalidated: false })
  const stage = entry => entry.measurement?.stages.find(item => item.target === entry.platform && item.framework === entry.tool && item.stage === 'suite' && item.finishedAt)
  const suiteTime = entry => stage(entry)?.durationMs ?? entry.run?.durationMs
  const counts = (subset, filter = () => true) => {
    const count = { passed: 0, failed: 0, unavailable: 0 }
    for (const entry of subset) for (const title of planned(entry.platform).filter(filter)) {
      const test = entry.report?.tests.find(item => item.title === title)
      if (test?.status === 'passed') count.passed++
      else if (test && ['failed', 'timedOut'].includes(test.status) && !preparationFailure(test)) count.failed++
      else count.unavailable++
    }
    return count
  }
  const totals = counts(entries)
  const dual = counts(entries, title => title.startsWith('D'))
  const failures = entries.flatMap(entry => (entry.report?.tests ?? []).filter(test => ['failed', 'timedOut', 'interrupted'].includes(test.status)).map(test => ({ entry, test })))
  const intentional = failures.filter(({ test }) => test.title.startsWith('C10 mouse')).length
  const logLink = entry => link(join(entry.root, entry.platform, `${entry.tool}.log`))
  const source = entry => `[JSON](${link(entry.path)}) · [Log](${logLink(entry)})`
  const eligible = entry => entry.report?.tests.length === planned(entry.platform).length && entry.report.tests.every(test => ['passed', 'failed', 'timedOut'].includes(test.status) && !preparationFailure(test)) && Number.isFinite(suiteTime(entry))
  const percentage = entry => {
    const peers = entries.filter(item => item.platform === entry.platform)
    // Não comparar a versão atual de uma ferramenta com tempos substituídos.
    if (!peers.every(item => item.root === entry.root && eligible(item))) return '—'
    const fastest = Math.min(...peers.map(suiteTime))
    return `${((suiteTime(entry) / fastest - 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
  }
  const result = entry => {
    const count = counts([entry])
    return `${count.passed}/${planned(entry.platform).length} aprovados${count.failed ? `; ${count.failed} ${count.failed === 1 ? 'falha' : 'falhas'}` : ''}${count.unavailable ? `; ${count.unavailable} sem validação` : ''}`
  }
  let overview = '| Ferramenta | Web | PWA instalado | Electron | Android |\n| --- | --- | --- | --- | --- |\n'
  for (const tool of tools) overview += `| ${names[tool]} | ${platforms.map(platform => result(entries.find(entry => entry.tool === tool && entry.platform === platform))).join(' | ')} |\n`
  let times = '| Ferramenta | Plataforma | Resultado atual | Soma dos testes | Suíte/comando | Aumento sobre o menor tempo | Origem da suíte |\n| --- | --- | --- | --- | --- | --- | --- |\n'
  for (const entry of entries) {
    const sum = (entry.report?.tests ?? []).reduce((total, test) => total + (test.durationMs ?? 0), 0)
    times += `| ${names[entry.tool]} | ${names[entry.platform]} | ${result(entry)} | ${entry.report ? duration(sum) : '—'} | ${elapsed(suiteTime(entry))} | ${percentage(entry)} | ${entry.revalidated ? 'Revalidação' : 'Rodada original'} · ${source(entry)} |\n`
  }
  const percentages = '**Percentuais:** (tempo da suíte ÷ menor tempo elegível − 1) × 100. Só comparamos quando as três ferramentas da plataforma vêm da mesma rodada e todos os casos foram registrados. Web e Android atendem a esse critério; PWA e Electron combinam rodadas distintas e ficam com “—”. Falhas e políticas diferentes de isolamento limitam a comparação; não é um benchmark universal. Os percentuais históricos continuam no arquivo de histórico.\n'
  let platformTimes = '| Plataforma | Playwright | Selenium | WebdriverIO |\n| --- | --- | --- | --- |\n'
  for (const platform of platforms) {
    platformTimes += `| ${names[platform]} | ${tools.map(tool => elapsed(suiteTime(entries.find(entry => entry.tool === tool && entry.platform === platform)))).join(' | ')} |\n`
  }
  platformTimes += '\nCada célula mostra o tempo de execução da suíte/comando daquela ferramenta e plataforma. Inclui inicialização, sessões, testes e encerramento internos ao comando; exclui build, preparação externa e limpeza externa. PWA e Electron usam as últimas execuções de rodadas distintas, identificadas na tabela detalhada.\n'
  let platformsTable = '| Plataforma | Build | Preparação | Soma dos comandos atuais | Limpeza | Total contínuo da plataforma |\n| --- | --- | --- | --- | --- | --- |\n'
  for (const platform of platforms) {
    const peers = entries.filter(entry => entry.platform === platform)
    const sameRun = peers.every(entry => entry.root === peers[0].root)
    const measured = sameRun ? peers[0].measurement : undefined
    const sumStage = kind => {
      const stages = measured?.stages.filter(item => item.target === platform && item.stage === kind && item.finishedAt) ?? []
      return stages.length ? stages.reduce((sum, item) => sum + item.durationMs, 0) : undefined
    }
    const sum = peers.every(entry => Number.isFinite(suiteTime(entry))) ? peers.reduce((total, entry) => total + suiteTime(entry), 0) : undefined
    platformsTable += `| ${names[platform]} | ${elapsed(sumStage('build'))} | ${elapsed(sumStage('prepare'))} | ${elapsed(sum)} | ${elapsed(sumStage('cleanup'))} | ${sameRun ? elapsed(measured?.platforms[platform]?.durationMs) : '— (rodadas distintas)'} |\n`
  }
  const failureList = failures.length ? failures.map(({ entry, test }) => `- **${names[entry.tool]}/${names[entry.platform]} — ${clean(test.title)}:** ${test.title.startsWith('C10 mouse') ? 'bug intencional: clique não abre as instruções de instalação. Continua contado como falha.' : clean(test.error).slice(0, 650)} [Log](${logLink(entry)}).`).join('\n') : 'Nenhuma falha registrada nas suítes atuais.'
  const history = config.historyReport ? `[Relatório histórico completo](${config.historyReport}) · [Histórico direto](${config.historyBrief}). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.` : 'Tentativas anteriores permanecem nos diretórios de resultados originais e de diagnóstico.'
  const currentStatus = `**${totals.passed} aprovações, ${totals.failed} falhas e ${totals.unavailable} sem validação concluída**, de 150 casos previstos. ${intentional} falhas são o bug intencional C10 mouse; ${totals.failed - intentional} são outras falhas.\n\n**Duas janelas: ${dual.passed}/36 aprovados**, ${dual.failed} falhas e ${dual.unavailable} sem validação. Android não inclui duas janelas.\n\n`
  const provenance = 'Este é o consolidado mais recente das 12 combinações. Cada combinação usa a última suíte completa referenciada, com a origem indicada nas tabelas; não representa uma nova execução simultânea das 12. Resultados substituídos ficam somente nos arquivos históricos.\n'
  const method = '**Soma dos testes** reúne as durações individuais. **Suíte/comando** inclui processo, sessões e encerramento internos à ferramenta. O total contínuo da plataforma só existe quando suas três ferramentas pertencem à mesma rodada; não somamos execuções diferentes para apresentar um tempo global. “—” significa não aplicável ou indisponível, não zero. Build/preparação/limpeza externos ficam fora do comando da suíte.\n\nPlaywright e Selenium isolam sessões por teste; WDIO compartilha a sessão e limpa os dados pela interface. Gestos, esperas, reinício e custos de conexão variam. Uma execução não mede frequência de intermitência. O bug de instalação por mouse foi mantido, sem skip, expectedFailure ou inversão de expectativa.\n'
  const latestNotes = `${config.briefAdjustments ?? ''}\n\n${config.briefLimit ?? ''}\n\n${config.briefNotes ?? ''}\n`
  const scope = 'Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. Não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa.\n'
  const limitsText = await readFile(resolve('e2e/pocs/LIMITACOES.md'), 'utf8')
  const currentLimits = limitsText.slice(limitsText.indexOf('## Limitações por ferramenta'))
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const header = (title, other) => `# ${title}\n\nAtualizado em ${now} (São Paulo). ${other}\n\n`
  let full = header('Relatório completo das POCs E2E — situação atual', '[Versão direta](RELATORIO-DIRETO.md).')
  full += '## Sumário\n\n- [Resumo atual](#resumo-atual)\n- [Tempos por ferramenta e plataforma](#tempos-por-ferramenta-e-plataforma)\n- [Totais por plataforma](#totais-por-plataforma)\n- [Falhas atuais](#falhas-atuais)\n- [Correções aplicadas](#correções-aplicadas)\n- [Playwright](#playwright)\n- [Selenium](#selenium)\n- [WebdriverIO](#webdriverio)\n- [Portabilidade](#portabilidade)\n- [Limitações e escopo](#limitações-e-escopo)\n- [Ambiente e evidências](#ambiente-e-evidências)\n- [Histórico separado](#histórico-separado)\n\n'
  full += `## Resumo atual\n\n${currentStatus}${overview}\n${provenance}\n## Tempo de execução por plataforma\n\n${platformTimes}\n## Tempos por ferramenta e plataforma\n\n${times}\n${percentages}\n## Etapas externas e totais contínuos\n\n${platformsTable}\n${method}\n## Falhas atuais\n\n${failureList}\n\n## Correções aplicadas\n\n${latestNotes}\n`
  full += (config.corrections ?? []).map(item => `- ${item}\n`).join('')
  for (const tool of tools) {
    full += `\n## ${names[tool]}\n`
    for (const platform of platforms) {
      const entry = entries.find(item => item.tool === tool && item.platform === platform)
      full += `\n### ${names[platform]}\n\n**Resultado atual: ${result(entry)}.** ${entry.revalidated ? 'Suíte revalidada.' : 'Suíte original preservada; não substituída por uma revalidação.'} Encerramento (UTC): ${stage(entry)?.finishedAt ?? 'não registrado'}.\n\n${source(entry)} · [Medições da execução](${link(join(entry.root, 'timing.json'))})\n\n`
      full += '| Teste | Resultado atual | Duração | Observação/evidência |\n| --- | --- | --- | --- |\n'
      for (const title of planned(platform)) {
        const test = entry.report?.tests.find(item => item.title === title)
        let note = test?.status === 'passed' ? 'Verificações concluídas.' : clean(test?.error ?? 'Sem resultado individual.').slice(0, 650)
        if (test?.status === 'passed' && platform === 'android' && title.startsWith('C03')) note = 'Edição pelo botão; Enter físico não exercitado.'
        if (test?.status === 'passed' && platform === 'android' && title.startsWith('C08')) note = 'Exclusões pela interface; Delete físico não exercitado.'
        if (test?.status === 'failed' && title.startsWith('C10 mouse')) note = 'Bug intencional detectado: clique não abre as instruções; touch passa em teste separado.'
        const paths = [...(test?.artifacts ?? []), ...(test?.attachments ?? []).map(item => item.path).filter(Boolean)]
        note += paths.map((path, index) => ` [Evidência ${index + 1}](${link(resolve(path))})`).join('')
        full += `| ${clean(title)} | ${test?.status === 'passed' ? '✅ Passou' : test && ['failed', 'timedOut'].includes(test.status) ? '❌ Falhou' : '⛔ Sem validação'} | ${duration(test?.durationMs)} | ${note} |\n`
      }
    }
  }
  full += `\n## Portabilidade\n\n${migration}\n\n## Limitações e escopo\n\n${scope}\n${currentLimits.replace(/^## /gm, '### ')}\n\n## Ambiente e evidências\n\n${execution.environment ?? 'Consulte os JSONs e logs das suítes.'}\n\nAs 12 linhas da tabela de tempos e as seções por ferramenta apontam para o JSON e o log efetivamente usados. O teste cria/edita pela interface; a API auxiliar lê estado/coordenadas e aguarda persistência.\n\nArtefatos: Electron em \`release/electron/\`; APK em \`android/app/build/outputs/apk/debug/app-debug.apk\`.\n\n## Histórico separado\n\n${history}\n`
  let brief = header('Relatório direto das POCs E2E — situação atual', '[Relatório completo](RELATORIO.md).')
  brief += '## Sumário\n\n- [Resumo atual](#resumo-atual)\n- [Tempos por ferramenta e plataforma](#tempos-por-ferramenta-e-plataforma)\n- [Totais por plataforma](#totais-por-plataforma)\n- [Falhas atuais](#falhas-atuais)\n- [Limitações e portabilidade](#limitações-e-portabilidade)\n- [Histórico separado](#histórico-separado)\n\n'
  brief += `## Resumo atual\n\n${currentStatus}${overview}\n${provenance}\n## Tempo de execução por plataforma\n\n${platformTimes}\n## Tempos por ferramenta e plataforma\n\n${times}\n${percentages}\n${method}\n## Falhas atuais\n\n${failureList}\n\n${latestNotes}\n## Limitações e portabilidade\n\n${scope}\nReaproveitados: catálogo/critérios, seletores, dados e parte da infraestrutura. Reescritos por ferramenta: interação, esperas, asserções, sessões e evidências. Não houve conversão automática dos testes.\n\n- **Playwright:** Electron e Android experimentais; APIs para processo principal Electron e ações nativas Android existem, mas nossa cobertura se concentra na interface web.\n- **Selenium:** Electron via ChromeDriver; Android via Appium/UiAutomator2. Menus/diálogos nativos do desktop exigem integração adicional.\n- **WebdriverIO:** Electron via ChromeDriver direto nesta POC, com 13/13 aprovados; bridge do serviço Electron não utilizada. Android via Appium/UiAutomator2.\n\nA versão completa detalha limitações documentadas, configuração e evidências. Esta versão omite as 150 linhas individuais, erros completos, screenshots/traces e exemplos de migração.\n\n## Histórico separado\n\n${history}\n`
  full = full.replace('- [Totais por plataforma](#totais-por-plataforma)', '- [Tempo de execução por plataforma](#tempo-de-execução-por-plataforma)\n- [Etapas externas e totais contínuos](#etapas-externas-e-totais-contínuos)')
  brief = brief.replace('- [Totais por plataforma](#totais-por-plataforma)', '- [Tempo de execução por plataforma](#tempo-de-execução-por-plataforma)')
  return { full, brief }
}
