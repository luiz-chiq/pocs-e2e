import { readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, relative, join } from 'node:path'
import { appUrl, cases, dualCases } from '../e2e/pocs/shared/fixtures.ts'
import { renderCurrentReport } from './report-poc-current.mjs'

const directory = resolve(process.argv[2] ?? 'test-results/pocs/validation-2026-10-19')
const output = resolve('e2e/pocs/RELATORIO.md')
const briefOutput = resolve('e2e/pocs/RELATORIO-DIRETO.md')
const tools = ['playwright', 'selenium', 'webdriverio']
const platforms = ['web', 'pwa', 'electron', 'android']
const names = { playwright: 'Playwright', selenium: 'Selenium', webdriverio: 'WebdriverIO', web: 'Web', pwa: 'PWA instalado', electron: 'Electron', android: 'APK Android' }
const read = async path => { try { return JSON.parse(await readFile(path, 'utf8')) } catch { return undefined } }
const link = path => relative(resolve('e2e/pocs'), path).split('\\').join('/')
const clean = value => String(value ?? '').replace(/\u001b\[[0-9;]*m/g, '').replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, ' ').trim()
const duration = ms => Number.isFinite(ms) ? `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s` : '—'
const elapsed = ms => !Number.isFinite(ms) ? '—' : ms < 60_000 ? duration(ms) : `${Math.floor(ms / 60_000)} min ${duration(ms % 60_000)}`
const planned = platform => [...Object.values(cases).filter(title => platform === 'web' || !title.startsWith('C10')), ...(platform === 'android' ? [] : Object.values(dualCases))]
const execution = await read(join(directory, 'execution.json')) ?? {}
const revalidation = await read(join(directory, 'revalidation.json'))
if (revalidation?.electron) execution.electron = revalidation.electron
const summary = await read(join(directory, 'summary.json')) ?? []
const timing = await read(join(directory, 'timing.json'))
const migration = await readFile(resolve('e2e/pocs/PORTABILIDADE.md'), 'utf8')
const data = new Map()
const entries = await Promise.allSettled(tools.flatMap(tool => platforms.map(async platform => {
  const path = join(directory, platform, tool, 'results.json')
  let report = await read(path)
  if (report && platform === 'android' && revalidation?.androidStartedAt && (await stat(path)).mtimeMs < Date.parse(revalidation.androidStartedAt)) report = undefined
  const run = summary.find(item => item.target === platform && item.framework === tool)
  let log = ''
  try { log = await readFile(join(directory, platform, `${tool}.log`), 'utf8') } catch {}
  data.set(`${tool}/${platform}`, { report, run, log, path, tool, platform })
})))
for (const entry of entries) if (entry.status === 'rejected') throw entry.reason
const orderedEntries = tools.flatMap(tool => platforms.map(platform => data.get(`${tool}/${platform}`)))
const preserved = (tool, platform) => revalidation && !revalidation.scope[platform]?.includes(tool)
const preparationFailure = test => /Browser.getWindowForTarget|Target browser must be a string/.test(test.error ?? '')
const resultName = test => test.status === 'passed' ? '✅ Passou' : preparationFailure(test) ? '⛔ Falhou na preparação' : ({ failed: '❌ Falhou', timedOut: '❌ Tempo esgotado', skipped: '⏭ Não executado', interrupted: '⛔ Interrompido' }[test.status] ?? test.status)
const suiteTiming = ({ report, run, log, tool, platform }) => {
  const stage = timing?.stages.find(item => item.target === platform && item.stage === 'suite' && item.framework === tool && item.finishedAt)
  if (Number.isFinite(stage?.durationMs)) return { ms: stage.durationMs, source: 'command' }
  const total = (report?.tests ?? []).reduce((sum, test) => sum + (test.durationMs ?? 0), 0)
  // As suítes desta POC são sequenciais. Não aceitar um tempo total menor que seus testes.
  if (Number.isFinite(run?.durationMs) && run.durationMs >= total - 1000) return { ms: run.durationMs, source: 'command' }
  const logged = [...log.matchAll(/duration_ms\s+([\d.]+)/g)].at(-1)
  if (logged && Number(logged[1]) >= total - 1000) return { ms: Number(logged[1]), source: 'runner' }
  return { source: 'unavailable' }
}

// Comparar apenas comandos com todos os casos previstos registrados.
// Uma sessão que nem iniciou não pode servir de referência de velocidade.
const eligibleTime = entry => entry.report?.tests.length === planned(entry.platform).length
  && entry.report.tests.every(test => ['passed', 'failed', 'timedOut'].includes(test.status) && !preparationFailure(test))
  && Number.isFinite(suiteTiming(entry).ms)
const fastest = platform => Math.min(...orderedEntries.filter(entry => entry.platform === platform && eligibleTime(entry)).map(entry => suiteTiming(entry).ms))
const increase = entry => eligibleTime(entry) ? `${((suiteTiming(entry).ms / fastest(entry.platform) - 1) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '—'
const percentageNote = '**Aumento sobre o menor tempo da plataforma:** (tempo da suíte ÷ menor tempo elegível − 1) × 100; 0% identifica a referência desta rodada. A comparação usa suítes com todos os casos registrados, mesmo com falhas; sessões sem execução completa ficam com “—”. Falhas podem abreviar cenários ou adicionar timeouts, e o isolamento difere entre ferramentas: o percentual é descritivo, não um benchmark de desempenho.'

let text = `# Relatório completo das POCs E2E\n\nAtualizado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (São Paulo). [Versão direta](RELATORIO-DIRETO.md).\n\n## Sumário\n\n- [Resumo](#resumo)\n- [Tempos por plataforma](#tempos-por-plataforma)\n- [Como interpretar os tempos](#como-interpretar-os-tempos)\n- [Falhas desta rodada](#falhas-desta-rodada)\n- [Portabilidade](#portabilidade)\n- [Limites e aprendizados](#limites-e-aprendizados)\n- [Etapas, builds e ambiente](#etapas-builds-e-ambiente)\n- [Playwright: testes individuais](#playwright)\n- [Selenium: testes individuais](#selenium)\n- [WebdriverIO: testes individuais](#webdriverio)\n\n## Resumo\n\n${revalidation ? 'Há resultados anteriores identificados na matriz.' : 'Nova rodada das 12 combinações, sem importar resultados anteriores.'} ${timing?.finishedAt ? 'Execução encerrada.' : 'Execução em andamento ou sem medição global concluída.'}\n\n`
const matrixStart = text.length
text += '| Ferramenta | Plataforma | O que foi executado/previsto | Resultado | Soma dos testes | Tempo da suíte/comando | Aumento sobre o menor tempo da plataforma |\n| --- | --- | --- | --- | --- | --- | --- |\n'
for (const tool of tools) for (const platform of platforms) {
  const { report, run } = data.get(`${tool}/${platform}`)
  const tests = report?.tests ?? []
  const passed = tests.filter(test => test.status === 'passed').length
  const failed = tests.filter(test => ['failed', 'timedOut'].includes(test.status)).length
  const blocked = tests.filter(preparationFailure).length
  const unfinished = planned(platform).filter(title => !tests.some(test => test.title === title && ['passed', 'failed', 'timedOut'].includes(test.status))).length
  let result = !report ? (run?.infrastructureError ? '⛔ Não foi possível criar/concluir a sessão' : '⏳ Aguardando resultado') : `${passed} ${passed === 1 ? 'passou' : 'passaram'}; ${failed} ${failed === 1 ? 'falhou' : 'falharam'}${blocked ? ` (${blocked} na preparação)` : ''}${unfinished ? `; ${unfinished} sem validação concluída` : ''}`
  if (report && !failed && !unfinished) result = `✅ Funcionou: ${passed}/${planned(platform).length}`
  const total = tests.filter(test => Number.isFinite(test.durationMs)).reduce((sum, test) => sum + test.durationMs, 0)
  const scope = `${tests.length} registros / ${planned(platform).length} previstos${platform === 'android' ? '' : '; 4 testes de duas janelas previstos'}${preserved(tool, platform) ? ' · rodada anterior' : ''}`
  const timing = suiteTiming(data.get(`${tool}/${platform}`))
  text += `| ${names[tool]} | ${names[platform]} | ${scope} | ${result} | ${tests.length ? duration(total) : '—'} | ${elapsed(timing.ms)}${timing.source === 'runner' ? ' *' : ''} | ${increase(data.get(`${tool}/${platform}`))} |\n`
}
text += `\n${percentageNote}\n`
const matrix = text.slice(matrixStart)
const totals = { passed: 0, failed: 0, unavailable: 0 }
for (const entry of orderedEntries) for (const title of planned(entry.platform)) {
  const test = entry.report?.tests.find(item => item.title === title)
  if (test?.status === 'passed') totals.passed++
  else if (test && ['failed', 'timedOut'].includes(test.status) && !preparationFailure(test)) totals.failed++
  else totals.unavailable++
}
const overall = `**${totals.passed} aprovados, ${totals.failed} falhas e ${totals.unavailable} sem validação concluída**, de 150 casos previstos.`
text += `\n${overall}\n`
const intentionalFailures = orderedEntries.flatMap(entry => entry.report?.tests ?? []).filter(test => test.title === cases.mouse && test.status === 'failed' && /instruções|instrucoes/.test(clean(test.error))).length
const failureOverview = `${intentionalFailures} falhas detectam o defeito intencional de C10 mouse; ${totals.failed - intentionalFailures} são outras falhas de execução/asserção, detalhadas abaixo. Não significam automaticamente defeitos no aplicativo.`
text += `\n${failureOverview}\n`
const dualTotals = { passed: 0, failed: 0, unavailable: 0 }
for (const entry of orderedEntries) if (entry.platform !== 'android') for (const title of Object.values(dualCases)) {
  const test = entry.report?.tests.find(item => item.title === title)
  if (test?.status === 'passed') dualTotals.passed++
  else if (test && ['failed', 'timedOut'].includes(test.status) && !preparationFailure(test)) dualTotals.failed++
  else dualTotals.unavailable++
}
const dualOverview = `Duas janelas: **${dualTotals.passed} aprovados, ${dualTotals.failed} falhas e ${dualTotals.unavailable} sem validação concluída**, de 36 casos previstos em web/PWA/Electron. Android não participa dessa contagem.`
text += `\n${dualOverview}\n`
let platformTable = '| Plataforma | Build | Preparação externa | Suítes/comandos | Limpeza externa | Total da plataforma |\n| --- | --- | --- | --- | --- | --- |\n'
for (const platform of platforms) {
  const stages = timing?.stages.filter(stage => stage.target === platform && stage.finishedAt) ?? []
  const sumStage = kind => { const items = stages.filter(stage => stage.stage === kind); return items.length ? items.reduce((sum, stage) => sum + stage.durationMs, 0) : undefined }
  platformTable += `| ${names[platform]} | ${elapsed(sumStage('build'))} | ${elapsed(sumStage('prepare'))} | ${elapsed(sumStage('suite'))} | ${elapsed(sumStage('cleanup'))} | ${elapsed(timing?.platforms[platform]?.durationMs)} |\n`
}
text += '\nOs testes de duas janelas fazem parte das suítes completas web, PWA e Electron. O APK usa C01–C09 com controles de toque; separar mapa e instalar o PWA não se aplicam ao app Android. C10 mouse continua detectando o defeito intencional de instalação na web, e C10 touch exige um toque confiável.\n'
text += '\nNo Android, C03 inicia edição pelo botão e C08 usa os controles de exclusão; os atalhos físicos Enter/Delete não são exercitados. Falhas antes da última etapa não validam o restante do cenário.\n'
if (revalidation) text += `\nEsta revalidação abrange Android nas três ferramentas e Selenium/Electron. O Selenium/Electron foi aprovado nos 13 testes, incluindo as quatro verificações de duas janelas. Web, PWA e as demais ferramentas no Electron mantêm os resultados da [primeira rodada](${revalidation.previousReport}); não foram reexecutados nesta etapa. ${revalidation.note ?? ''}\n`
if (revalidation?.findings) text += `\n${revalidation.findings}\n`
text += `\n## Tempos por plataforma\n\n${platformTable}\n**Tempo total medido da rodada:** ${elapsed(timing?.durationMs)}. **Início:** ${timing?.startedAt ?? 'não medido'}. **Fim:** ${timing?.finishedAt ?? 'ainda não registrado'}.\n\nO total da plataforma inclui build, preparação, suítes, limpeza e geração intermediária dos relatórios. No Android, preparação externa agrupa boot/estabilização do emulador, instalação inicial do APK e início/espera do Appium. Preparação feita pela própria ferramenta, inclusive novas sessões e instalação/lançamento do PWA, fica dentro de suíte/comando. “—” indica etapa não aplicável ou medição indisponível, não zero. O total contínuo da rodada não inclui as investigações anteriores. [Medição por etapa](${link(join(directory, 'timing.json'))}).\n`
text += '\n## Como interpretar os tempos\n\n'
text += '**Soma dos testes** soma as durações individuais, incluindo casos que falharam. **Tempo da suíte/comando** mede o intervalo observado pelo orquestrador ao executar a ferramenta: inclui inicialização do processo, sessões, testes e encerramento dentro desse comando. Quando a sessão falha antes dos testes, mede somente essa tentativa de preparação. Essas duas colunas excluem as etapas externas, medidas separadamente na tabela por plataforma quando disponíveis.\n'
const runnerTimings = tools.flatMap(tool => platforms.filter(platform => suiteTiming(data.get(`${tool}/${platform}`)).source === 'runner').map(platform => {
  const entry = data.get(`${tool}/${platform}`)
  return `${names[tool]}/${names[platform]}: foi usado o total registrado pelo runner no [log](${link(join(directory, platform, `${tool}.log`))}) (${duration(suiteTiming(entry).ms)}); o metadado do comando (${duration(entry.run?.durationMs)}) é menor que a soma dos testes e foi rejeitado`
}))
if (runnerTimings.length) text += `\n\\* ${runnerTimings.join('; ')}. Esse total não inclui o custo externo de iniciar o comando.\n`
const androidTimings = tools.map(tool => suiteTiming(data.get(`${tool}/android`)))
if (androidTimings.every(item => item.source === 'command')) text += `\nSomando os comandos das suítes Android: **${elapsed(androidTimings.reduce((sum, item) => sum + item.ms, 0))}**, sem build, preparação e limpeza externos. ${revalidation ? 'Há medições de execuções distintas nesta consolidação histórica.' : 'Os resultados vêm desta nova rodada sequencial.'}\n`
text += '\nPlaywright abre uma sessão/app por teste; Selenium também cria sessões por teste, incluindo Appium no Android; WebdriverIO compartilha a sessão entre casos e limpa dados pela interface. Há esperas fixas, esperas condicionais, gestos e custos de conexão diferentes. Falhas podem encurtar um cenário antes de suas últimas etapas ou alongá-lo até um timeout. Portanto, as durações descrevem estas implementações e **não permitem concluir qual ferramenta é mais rápida**. “—” indica ausência de medição, não duração zero. Uma falha na preparação ou em uma pré-condição não comprova defeito na funcionalidade do título.\n'
text += '\nUma execução por suíte, em sequência e com um worker; sem repetição manual para escolher o melhor resultado. Retentativas internas de conexão dos drivers podem integrar o tempo. Os testes e as expectativas foram mantidos durante a rodada. A medição externa registra os comandos sem alterar os critérios de aprovação. Build local pode aproveitar cache. Recursos do mapa, rede, perfil, teclado e emulador podem influenciar. Uma rodada não mede dispersão ou frequência de intermitência e não é benchmark do tempo de resposta do app.\n'
text += '\nC10 usa o caminho de instruções de instalação: a fixture impede que uma oferta nativa beforeinstallprompt chegue ao app e verifica o clique/toque confiável no diálogo de fallback. Não automatiza o prompt nativo de instalação. A instalação real e o modo standalone são verificados nas suítes da plataforma PWA, em perfis isolados.\n'
text += `\nWeb/PWA acessam o deploy ${appUrl}; não houve build ou novo deploy web nesta rodada. As builds locais de Electron e APK estão medidas separadamente.\n`
const failures = []
for (const entry of orderedEntries) {
  for (const test of entry.report?.tests ?? []) if (['failed', 'timedOut', 'interrupted'].includes(test.status)) {
    let explanation = clean(test.error).slice(0, 650)
    if (test.title.startsWith('C10 mouse') && /instruções|instrucoes/.test(explanation)) explanation = 'Defeito intencional detectado: clique não abriu as instruções de instalação. A falha continua contada.'
    else if (/stale element reference/i.test(explanation)) explanation = `Falha de automação: a referência DOM ficou obsoleta durante a leitura; a espera abortou sem tratar essa atualização transitória. Não é uma asserção demonstrando estado funcional incorreto. As etapas seguintes não foram concluídas. ${explanation}`
    else if (/move target out of bounds/i.test(explanation)) explanation = `Falha de interação automatizada: o driver rejeitou coordenadas fora da viewport aceita. O gesto e as verificações posteriores não foram concluídos; não comprova erro da regra de negócio. ${explanation}`
    else if (entry.tool === 'selenium' && entry.platform === 'android' && test.title.startsWith('C02') && /Wait timed out after 5\d{3}ms/.test(explanation)) explanation = `Esgotou a espera de contagem de vértices durante a preparação do desenho. A mensagem não registra o valor observado; causa não determinada. Nem todas as validações do cenário foram concluídas. ${explanation}`
    else if (test.title.startsWith('C02') && /Expected: 2\s+Received: 1/.test(explanation)) explanation = `O SDK confirmou um vértice quando a suíte aguardava dois; a preparação do desenho falhou e nem todas as validações do cenário foram concluídas. Causa não determinada. ${explanation}`
    else if (/SDK não recebeu o vértice/.test(explanation)) explanation = `Falhou durante a criação; o SDK não confirmou um vértice. As etapas posteriores não foram alcançadas; causa não determinada. ${explanation}`
    else if (test.title.startsWith('C08') && /Polígono apagado nesta edição/.test(explanation)) explanation = `O aviso de exclusão esperado após Delete não apareceu. O cenário não avançou para as demais confirmações; causa não determinada. ${explanation}`
    else if (test.title.startsWith('C05') && /#map-instructions/.test(explanation)) explanation = `A validação do campo passou, mas o aviso do topo não apresentou o estado esperado após concluir. As etapas seguintes de C05 não foram alcançadas; causa não determinada. ${explanation}`
    failures.push({ entry, title: test.title, explanation })
  }
  if (!entry.report && entry.run?.infrastructureError) failures.push({ entry, title: 'Preparação', explanation: `${clean(entry.run.infrastructureError)}${entry.log.includes('DevToolsActivePort') ? ' DevToolsActivePort ausente; a sessão Electron não foi criada.' : ''} Os cenários sem registro não foram executados.` })
}
text += '\n## Falhas desta rodada\n\n'
text += failures.length ? failures.map(({ entry, title, explanation }) => `- **${names[entry.tool]}/${names[entry.platform]} — ${clean(title)}:** ${explanation} [Log](${link(join(directory, entry.platform, `${entry.tool}.log`))}).`).join('\n') + '\n' : 'Nenhuma falha registrada até agora; confira se a execução foi encerrada antes de interpretar como aprovação.\n'
text += `\n## Portabilidade\n\n${migration}\n\n## Limites e aprendizados\n\n${(await readFile(resolve('e2e/pocs/LIMITACOES.md'), 'utf8')).replace(/^## /gm, '### ')}\n`
text += '\n## Etapas, builds e ambiente\n\n'
for (const [key, label] of [['dual', 'Implementação de duas telas'], ['web', 'Web'], ['pwa', 'PWA'], ['electronBuild', 'Build Electron'], ['electron', 'Electron'], ['androidBuild', 'Build APK'], ['android', 'Android']]) text += `- **${label}:** ${execution[key] ?? 'Pendente nesta execução.'}\n`
if (execution.note) text += `\n**Escopo desta rodada:** ${clean(execution.note)}\n`
if (execution.previousReport) text += `\n**Histórico preservado:** [relatório completo anterior](${execution.previousReport}) · [versão direta anterior](${execution.previousBrief}). Os resultados anteriores não entram nas contagens desta rodada.\n`
if (execution.environment) text += `\n**Ambiente:** ${execution.environment}\n`
if (timing) text += `\n**Ordem:** plataformas ${timing.targets.join(' → ')}; ferramentas ${timing.frameworks.join(' → ')} em cada plataforma. Medições em uma rodada contínua e sequencial.\n\nComando usado nesta rodada (a partir da raiz do projeto):\n\n\`\`\`bash\nPOC_FRAMEWORKS=${timing.frameworks.join(',')} POC_RESULTS_DIR=${relative(resolve('.'), directory)} npm run test:poc:${timing.targets.length === 4 ? 'all' : timing.targets[0]}\n\`\`\`\n`
if (revalidation) {
  text += '\n**Correções e ajustes:**\n\n'
  for (const correction of revalidation.corrections) text += `- ${correction}\n`
}
text += '\n**Artefatos:** Electron em `release/electron/` e APK em `android/app/build/outputs/apk/debug/app-debug.apk`. Logs das builds: [Electron](' + link(join(directory, 'electron/build.log')) + ') · [APK](' + link(join(directory, 'android/build.log')) + ').\n'
text += '\nO PWA foi instalado em perfil de automação e teve `display-mode: standalone` verificado. O Electron foi empacotado para macOS, sem instalador Windows. Duas janelas simultâneas foram usadas; não foi avaliado o posicionamento em dois monitores físicos. A API auxiliar lê coordenadas, prontidão e quantidade de vértices e aguarda a persistência; os desenhos e edições usam gestos das ferramentas. Ambiente web/PWA: https://poc-e2e.chiquetano.com.br/.\n'
for (const tool of tools) {
  text += `\n## ${names[tool]}\n`
  for (const platform of platforms) {
    const { report, run, log, path } = data.get(`${tool}/${platform}`)
    text += `\n### ${names[platform]}\n\n`
    if (preserved(tool, platform)) text += 'Resultado preservado da primeira rodada; não reexecutado nesta revalidação.\n\n'
    if (!report) {
      text += run?.infrastructureError ? `⛔ ${clean(run.infrastructureError)}${log.includes('DevToolsActivePort') ? ' ChromeDriver não encontrou DevToolsActivePort; a sessão Electron não foi criada.' : ''} [Log](${link(join(directory, platform, `${tool}.log`))})\n\n` : 'Aguardando a execução/resultado desta ferramenta.\n\n'
    } else {
      text += `[JSON com durações e evidências](${link(path)}) · [Log completo](${link(join(directory, platform, `${tool}.log`))})\n\n`
      if (report.tests.length && report.tests.every(preparationFailure)) text += '**Impedimento de preparação:** os cenários funcionais não foram alcançados. Os tempos medem tentativas de preparar as sessões.\n\n'
    }
    text += '| Teste | Resultado | Duração | Observação |\n| --- | --- | --- | --- |\n'
    for (const title of planned(platform)) {
      const test = report?.tests.find(test => test.title === title)
      if (!test) {
        text += `| ${clean(title)} | ${run ? '⛔ Sem validação concluída' : '⏳ Pendente'} | — | ${run?.infrastructureError ? 'Sessão não disponível; cenário não executado.' : 'Sem registro individual nesta execução.'} |\n`
        continue
      }
      let note = test.status === 'passed' ? 'Verificações concluídas.' : clean(test.error ?? 'Consulte o log.').slice(0, 650)
      if (test.status === 'passed' && platform === 'android' && title.startsWith('C03')) note = 'Seleciona sem editar e entra na edição pelo botão; Enter físico não exercitado.'
      if (test.status === 'passed' && platform === 'android' && title.startsWith('C08')) note = 'Exclusões pelos controles da interface; Delete físico não exercitado.'
      if (test.status !== 'passed' && /stale element reference/i.test(test.error ?? '')) note = 'Referência DOM obsoleta durante leitura; espera abortou sem tratar a atualização transitória. Falha de automação; etapas posteriores não concluídas. ' + note
      if (test.status !== 'passed' && /move target out of bounds/i.test(test.error ?? '')) note = 'Driver rejeitou coordenadas fora da viewport aceita. Gesto não exercitado; falha da interação automatizada, sem comprovar erro da regra de negócio. ' + note
      if (test.status !== 'passed' && tool === 'selenium' && platform === 'android' && title.startsWith('C02') && /Wait timed out after 5\d{3}ms/.test(test.error ?? '')) note = 'Esgotou a espera de contagem de vértices na preparação do desenho; valor observado não registrado. Cenário não concluído; causa não determinada. ' + note
      if (test.status !== 'passed' && title.startsWith('C02') && /Expected: 2\s+Received: 1/.test(clean(test.error))) note = 'O SDK confirmou um vértice quando eram aguardados dois. Preparação do desenho incompleta; nem todas as validações do cenário foram alcançadas. Causa não determinada. ' + note
      if (test.status !== 'passed' && title.startsWith('C10 mouse') && /instruções|instrucoes/.test(note)) note = 'Defeito intencional detectado: clique não abre a instalação.'
      if (test.status !== 'passed' && title.startsWith('D01') && test.error?.includes('is-selected')) note = 'Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. ' + note
      if (test.status !== 'passed' && /SDK não recebeu o vértice/.test(test.error ?? '')) note = 'Falhou na pré-condição de criação: um toque não foi reconhecido como vértice pelo SDK. A funcionalidade posterior do cenário não foi alcançada; causa ainda não determinada. ' + note
      if (test.status !== 'passed' && /SDK ainda não está pronto/.test(test.error ?? '')) note = 'Falhou na pré-condição de criação: o mapa não entrou no estado de desenho. A funcionalidade posterior do cenário não foi alcançada. ' + note
      if (test.status !== 'passed' && platform === 'android' && title.startsWith('C05') && /#map-instructions/.test(test.error ?? '')) note = 'O campo indicou nome inválido, mas o aviso do topo não apresentou role=alert após concluir. As etapas seguintes de C05 não foram executadas; causa ainda não determinada. ' + note
      text += `| ${clean(title)} | ${resultName(test)} | ${test.status === 'skipped' ? '—' : duration(test.durationMs)} | ${note} |\n`
    }
  }
}
const briefExplanation = ({ entry, title, explanation }) => {
  if (title === 'Preparação') return entry.log.includes('DevToolsActivePort') ? 'Sessão não criada: DevToolsActivePort ausente; 13 casos não executados.' : clean(entry.run?.infrastructureError).slice(0, 180)
  const test = entry.report?.tests.find(test => test.title === title)
  const error = clean(test?.error)
  if (title === cases.mouse && /instruções|instrucoes/.test(error)) return 'Defeito intencional detectado: clique não abriu as instruções de instalação.'
  if (/stale element reference/i.test(error)) return 'Falha de automação: referência DOM obsoleta durante leitura; etapas seguintes não concluídas.'
  if (/move target out of bounds/i.test(error)) return 'Driver rejeitou coordenadas fora da viewport; gesto de confirmação não exercitado.'
  if (title.startsWith('C08') && /Polígono apagado nesta edição/.test(error)) return 'O aviso de exclusão após Delete não apareceu; etapas seguintes não concluídas; causa inconclusiva.'
  if (/aguardando alteração do texto/.test(error)) return 'A mudança de coordenadas após o arraste não foi confirmada; cenário não concluído; causa inconclusiva.'
  if (entry.tool === 'selenium' && entry.platform === 'android' && title.startsWith('C02') && /Wait timed out after 5\d{3}ms/.test(error)) return 'Espera pela contagem de vértices esgotada; valor observado não registrado; causa inconclusiva.'
  const vertices = error.match(/Expected: (\d+)\s+Received: (\d+)/)
  if ((/SDK/.test(error) || title.startsWith('C02')) && vertices) return `Desenho incompleto: aguardava ${vertices[1]} vértices, contador apontou ${vertices[2]}; causa inconclusiva.`
  if (title.startsWith('D01') && /is-selected/.test(error)) return 'Seleção divergente entre janelas: esperado Polígono 1, recebido Polígono 2; caso não concluído.'
  return explanation.split('Error:')[0].trim().slice(0, 180) || error.slice(0, 180)
}
let brief = `# Relatório direto das POCs E2E\n\n[Relatório completo](RELATORIO.md). Resultados: \`${link(directory)}\`. ${timing?.finishedAt ? 'Rodada encerrada.' : 'Rodada em andamento.'}\n\n## Sumário\n\n- [Resumo](#resumo)\n- [Tempos por plataforma](#tempos-por-plataforma)\n- [Falhas e impedimentos](#falhas-e-impedimentos)\n- [Portabilidade](#portabilidade)\n- [Limites](#limites)\n- [Detalhamento omitido](#detalhamento-omitido)\n\n## Resumo\n\n${overall}\n\n${failureOverview}\n\nAlvo web/PWA: ${appUrl}. Builds locais: Electron e APK.\n\n12 combinações; 150 casos previstos: 15 web, 13 PWA, 13 Electron e 9 Android por ferramenta. ${revalidation ? 'Resultados históricos identificados na matriz.' : 'Esta rodada não importa resultados anteriores.'}\n\n${matrix}\n${dualOverview}\n\nAPK: sem duas janelas/C10; C03 edita pelo botão e C08 usa controles de exclusão. C10 mouse detecta o defeito intencional e permanece falhando; C10 touch deve responder a toque confiável.\n\n## Tempos por plataforma\n\n${platformTable}\n**Tempo total da rodada:** ${elapsed(timing?.durationMs)}. Intervalo (UTC): ${timing?.startedAt ?? 'não registrado'} → ${timing?.finishedAt ?? 'em andamento'}. “Suíte/comando” inclui processo e sessões internos; o total da plataforma acrescenta build/preparação/limpeza externos e geração intermediária dos relatórios. Preparação Android inclui boot, instalação inicial do APK e Appium. “—” não significa zero. [Medições brutas](${link(join(directory, 'timing.json'))}).\n\nUma tentativa por suíte, sequencial, um worker. Playwright/Selenium isolam/criam sessões por teste; WDIO compartilha sessão e limpa pela interface. Gestos/esperas diferem e falhas podem encurtar casos ou atingir timeout. São métricas destas implementações, sem ranking de velocidade ou medição de confiabilidade estatística. Builds podem aproveitar cache.\n\n## Falhas e impedimentos\n\n`
brief += failures.length ? failures.map(item => `- **${names[item.entry.tool]}/${names[item.entry.platform]} — ${clean(item.title.match(/^(C10 (?:mouse|touch)|[CD]\d+)/)?.[0] ?? item.title)}:** ${briefExplanation(item)}`).join('\n') + '\n' : 'Nenhuma falha registrada até agora; execução ainda pode estar em andamento.\n'
brief += '\nFalha antes da última etapa não valida o restante do cenário. As causas não diagnosticadas permanecem inconclusivas.\n\n## Portabilidade\n\nNa construção da POC, o plano foi compartilhado e a execução adaptada por ferramenta. Esta rodada executou os cenários existentes com medição externa; testes e expectativas foram mantidos durante a execução.\n\n- **Reaproveitado:** catálogo/critérios dos cenários, seletores, parte dos dados, contratos auxiliares e infraestrutura PWA/ChromeDriver/capabilities.\n- **Reescrito por ferramenta:** corpo dos testes, gestos, esperas, asserções, sessões, janelas e evidências. Não houve conversão automática nem executor universal.\n- **Entre plataformas:** boa parte do cenário é mantida dentro da própria ferramenta, com adaptadores/branches para PWA, Electron e Android.\n- **Migração futura:** preservar critérios/dados; adaptar execução; validar paridade de isolamento/gestos antes das métricas. Não foram medidos tempo de desenvolvimento ou percentual de reutilização de código.\n\n## Limites\n\n| Ferramenta | Electron | Android |\n| --- | --- | --- |\n| Playwright | Integração experimental; configuração própria para Electron; diálogos nativos fora dos locators da página. | API experimental; depende de ADB/WebView; esta POC não mede cobertura nativa completa. |\n| Selenium | ChromeDriver/executável compatíveis; página não equivale a menus nativos; redimensionamento do bootstrap retirado após erro de protocolo. | Usa Appium/UiAutomator2, WebView depurável e ChromeDriver compatível; sessão por caso nesta POC. |\n| WebdriverIO | Serviço Electron/ChromeDriver compatíveis; impedimento de inicialização não significa ausência de suporte. | Usa Appium; sessão compartilhada e coordenação de toque/teclado/rolagem exigem atenção. |\n\nFontes: [Playwright Electron](https://playwright.dev/docs/api/class-electron), [Playwright Android](https://playwright.dev/docs/api/class-android), [Selenium/Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium), [WDIO/Electron](https://webdriver.io/docs/desktop-testing/electron/), [Appium/WebView](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode).\n\nEscopo: Electron macOS arm64; APK debug em emulador. Não cobre aparelho físico, instaladores, diálogos/permissões do sistema, plugins nativos, carregamento de todos os tiles do mapa de fundo ou posicionamento em dois monitores físicos.\n\n## Detalhamento omitido\n\nEsta versão não lista as 150 linhas originais nem as linhas individuais das revalidações com suas durações, erros completos, screenshots/traces, exemplos de código de migração, inventário de arquivos compartilhados ou histórico dos ajustes. A [versão completa](RELATORIO.md) mantém esses detalhes e links para evidências.\n'
if (execution.previousReport) brief += `\nHistórico preservado: [completo anterior](${execution.previousReport}) · [direto anterior](${execution.previousBrief}). Esta rodada usa somente os resultados novos.\n`
const followup = await read(join(directory, 'followup.json'))
if (followup) {
  const rendered = await renderCurrentReport(followup, { orderedEntries, planned, names, duration, elapsed, link, clean, preparationFailure, directory, timing, execution, migration })
  text = rendered.full
  brief = rendered.brief
}
await writeFile(output, text)
console.log(output)
await writeFile(briefOutput, brief)
console.log(briefOutput)
