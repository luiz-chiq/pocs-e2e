import { readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, relative, join } from 'node:path'
import { cases, dualCases } from '../e2e/pocs/shared/fixtures.ts'

const directory = resolve(process.argv[2] ?? 'test-results/pocs/validation-2026-10-19')
const output = resolve('e2e/pocs/RELATORIO.md')
const tools = ['playwright', 'selenium', 'webdriverio']
const platforms = ['web', 'pwa', 'electron', 'android']
const names = { playwright: 'Playwright', selenium: 'Selenium', webdriverio: 'WebdriverIO', web: 'Web', pwa: 'PWA instalado', electron: 'Electron', android: 'APK Android' }
const read = async path => { try { return JSON.parse(await readFile(path, 'utf8')) } catch { return undefined } }
const link = path => relative(resolve('e2e/pocs'), path).split('\\').join('/')
const clean = value => String(value ?? '').replace(/\u001b\[[0-9;]*m/g, '').replace(/\|/g, '\\|').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\r?\n/g, ' ').trim()
const duration = ms => Number.isFinite(ms) ? `${(ms / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s` : '—'
const planned = platform => [...Object.values(cases).filter(title => platform === 'web' || !title.startsWith('C10')), ...(platform === 'android' ? [] : Object.values(dualCases))]
const execution = await read(join(directory, 'execution.json')) ?? {}
const revalidation = await read(join(directory, 'revalidation.json'))
if (revalidation?.electron) execution.electron = revalidation.electron
const summary = await read(join(directory, 'summary.json')) ?? []
const data = new Map()
const entries = await Promise.allSettled(tools.flatMap(tool => platforms.map(async platform => {
  const path = join(directory, platform, tool, 'results.json')
  let report = await read(path)
  if (report && platform === 'android' && revalidation?.androidStartedAt && (await stat(path)).mtimeMs < Date.parse(revalidation.androidStartedAt)) report = undefined
  const run = summary.find(item => item.target === platform && item.framework === tool)
  let log = ''
  try { log = await readFile(join(directory, platform, `${tool}.log`), 'utf8') } catch {}
  data.set(`${tool}/${platform}`, { report, run, log, path })
})))
for (const entry of entries) if (entry.status === 'rejected') throw entry.reason
const preserved = (tool, platform) => revalidation && !revalidation.scope[platform]?.includes(tool)
const preparationFailure = test => /Browser.getWindowForTarget|Target browser must be a string/.test(test.error ?? '')
const resultName = test => test.status === 'passed' ? '✅ Passou' : preparationFailure(test) ? '⛔ Falhou na preparação' : ({ failed: '❌ Falhou', timedOut: '❌ Tempo esgotado', skipped: '⏭ Não executado', interrupted: '⛔ Interrompido' }[test.status] ?? test.status)

let text = `# Relatório das POCs E2E\n\nAtualizado em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (São Paulo).\n\n## Resumo\n\n| Ferramenta | Plataforma | O que foi executado/previsto | Resultado | Tempo somado dos testes |\n| --- | --- | --- | --- | --- |\n`
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
  const scope = `${tests.length} registros / ${planned(platform).length} previstos${platform === 'android' ? '' : '; 4 de duas janelas'}${preserved(tool, platform) ? ' · rodada anterior' : ''}`
  text += `| ${names[tool]} | ${names[platform]} | ${scope} | ${result} | ${tests.length ? duration(total) : '—'} |\n`
}
text += '\nOs testes de duas janelas fazem parte das suítes completas web, PWA e Electron. O APK usa C01–C09 com controles de toque; separar mapa e instalar o PWA não se aplicam ao app Android. C10 mouse continua detectando o defeito intencional de instalação na web, e C10 touch exige um toque confiável.\n'
text += '\nNo Android, C03 inicia edição pelo botão e C08 usa os controles de exclusão; os atalhos físicos Enter/Delete não são exercitados. As falhas anteriores de web/PWA e o impedimento do WebdriverIO/Electron permanecem identificados como resultados da rodada anterior.\n'
if (revalidation) text += `\nEsta revalidação abrange Android nas três ferramentas e Selenium/Electron. O Selenium/Electron foi aprovado nos 13 testes, incluindo as quatro verificações de duas janelas. Web, PWA e as demais ferramentas no Electron mantêm os resultados da [primeira rodada](${revalidation.previousReport}); não foram reexecutados nesta etapa. ${revalidation.note ?? ''}\n`
if (revalidation?.findings) text += `\n${revalidation.findings}\n`
text += '\nAs durações individuais abaixo são as registradas por cada ferramenta. O total da tabela soma essas durações, incluindo tentativas que falharam ou foram interrompidas; não inclui etapas externas de build e boot do emulador. Playwright e Selenium incluem preparação por teste; WebdriverIO compartilha parte da preparação da sessão. Esses tempos não são um benchmark de desempenho. “—” significa que não houve medição individual; não significa duração zero. Uma falha na preparação ou em uma pré-condição não comprova defeito na funcionalidade citada no título.\n\n## Etapas, builds e ambiente\n\n'
for (const [key, label] of [['dual', 'Implementação de duas telas'], ['web', 'Web'], ['pwa', 'PWA'], ['electronBuild', 'Build Electron'], ['electron', 'Electron'], ['androidBuild', 'Build APK'], ['android', 'Android']]) text += `- **${label}:** ${execution[key] ?? 'Pendente nesta execução.'}\n`
if (execution.environment) text += `\n**Ambiente:** ${execution.environment}\n`
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
      if (test.status !== 'passed' && title.startsWith('C10 mouse') && /instruções|instrucoes/.test(note)) note = 'Defeito intencional detectado: clique não abre a instalação.'
      if (test.status !== 'passed' && title.startsWith('D01') && test.error?.includes('is-selected')) note = 'Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. ' + note
      if (test.status !== 'passed' && /SDK não recebeu o vértice/.test(test.error ?? '')) note = 'Falhou na pré-condição de criação: um toque não foi reconhecido como vértice pelo SDK. A funcionalidade posterior do cenário não foi alcançada; causa ainda não determinada. ' + note
      if (test.status !== 'passed' && /SDK ainda não está pronto/.test(test.error ?? '')) note = 'Falhou na pré-condição de criação: o mapa não entrou no estado de desenho. A funcionalidade posterior do cenário não foi alcançada. ' + note
      if (test.status !== 'passed' && platform === 'android' && title.startsWith('C05') && /#map-instructions/.test(test.error ?? '')) note = 'O campo indicou nome inválido, mas o aviso do topo não apresentou role=alert após concluir. As etapas seguintes de C05 não foram executadas; causa ainda não determinada. ' + note
      text += `| ${clean(title)} | ${resultName(test)} | ${test.status === 'skipped' ? '—' : duration(test.durationMs)} | ${note} |\n`
    }
  }
}
await writeFile(output, text)
console.log(output)
