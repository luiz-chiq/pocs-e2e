import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

async function renderDirectFiles(report, directory) {
  const link = name => relative(resolve('e2e/pocs'), resolve(directory, name))
  const names = { playwright: 'Playwright', selenium: 'Selenium' }
  const time = ms => Number.isFinite(ms) ? `${(ms / 1000).toFixed(2)} s` : '—'
  const executed = test => ['passed', 'failed'].includes(test.status)
  let text = `# Electron — importação e exportação sem ChromeDriver\n\nExecutado de ${report.startedAt} a ${report.finishedAt}. Evidência: [resultados JSON](${link('results.json')}).\n\n## Sumário\n\n- [Resumo](#resumo)\n- [Testes por ferramenta](#testes-por-ferramenta)\n- [Implementação e limites](#implementação-e-limites)\n\n## Resumo\n\n**Modalidade atual: sem ChromeDriver.** Playwright controla o Electron diretamente; Selenium tenta uma sessão nativa Appium/Mac2. Não há fallback para ChromeDriver. Sessão indisponível não é aprovação nem falha funcional dos cenários.\n\nN01–N05 têm contagem própria, separada dos 100 casos C/D anteriores. Esta rodada não reexecuta web, PWA, Android ou o catálogo C/D.\n\n| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |\n| --- | --- | --- | --- | --- | --- |\n`
  for (const [tool, name] of Object.entries(names)) {
    const tests = report.tests.filter(test => test.tool === tool)
    const passed = tests.filter(test => test.status === 'passed').length
    const failed = tests.filter(test => test.status === 'failed').length
    const sum = tests.filter(executed).reduce((sum, test) => sum + test.durationMs, 0)
    text += `| ${name} | ${passed} | ${failed} | ${5 - passed - failed} | ${tests.some(executed) ? time(sum) : '—'} | — |\n`
  }
  text += '\nCada duração executada inclui lançamento com perfil novo, cenário e encerramento; exclui build e preparação externa. Cenários não executados não recebem duração zero. O tempo da tentativa de criar a sessão Mac2 aparece separadamente abaixo, sem ser confundido com execução dos cinco testes. Não há percentual comparativo com uma ferramenta sem execução.\n\n## Testes por ferramenta\n'
  for (const [tool, name] of Object.entries(names)) {
    text += `\n### ${name}\n\n| Cenário | Resultado | Duração |\n| --- | --- | --- |\n`
    for (const test of report.tests.filter(test => test.tool === tool)) text += `| ${test.title} | ${test.status === 'passed' ? 'Passou' : test.status === 'failed' ? 'Falhou' : 'Não executado'} | ${time(test.durationMs)} |\n`
    const preflight = report.preflights.find(item => item.tool === tool)
    if (preflight) text += `\nPreparação nativa: **${preflight.status === 'session-ready' ? 'sessão criada; cenários nativos ainda não validados' : 'sessão indisponível'}**, em ${time(preflight.durationMs)}. Os cinco cenários ficaram sem execução. [Log Appium](${link('appium-mac2.log')}) · [diagnóstico dos clientes](${link('mac2-bootstrap.json')}).\n\n\`\`\`text\n${preflight.error ?? 'Os cenários ainda precisam ser adaptados e validados na árvore de acessibilidade Mac2.'}\n\`\`\`\n`
    for (const test of report.tests.filter(test => test.tool === tool && test.status === 'failed')) text += `\nErro em ${test.title}:\n\n\`\`\`text\n${test.error}\n\`\`\`\n`
  }
  text += '\n## Implementação e limites\n\n'
  text += '- **Playwright:** `_electron.launch` abre o app empacotado. `electronApplication.evaluate` configura somente a resposta dos diálogos no processo principal e lê a auditoria. Não usa ChromeDriver nem POLYGON_E2E_DIALOG_PLAN. Os cliques da interface, preload, IPC, validação e operações de disco são reais. O seletor visual do sistema continua simulado.\n'
  text += '- **Selenium:** a tentativa nativa Appium Mac2/WebDriverAgentMac não iniciou por falta de Xcode completo. Nenhum N01–N05 nativo foi validado nessa integração. O bootstrap é diagnóstico de sessão; os cenários ainda precisam ser adaptados e validados com seletores de acessibilidade. O Mac2 está separado do Android em `test-results/appium-mac2`. [Requisitos Mac2](https://appium.github.io/appium-mac2-driver/latest/getting-started/).\n'
  text += '- Appium é o servidor e Mac2 é seu driver nativo macOS. Usar Appium não elimina automaticamente ChromeDriver: no Android/WebView ele pode continuar necessário.\n'
  text += '- O [Playwright](https://playwright.dev/docs/api/class-electron) não oferece Appium como backend. Pode-se combinar bibliotecas no mesmo runner, usando Playwright para renderer/main e outro cliente para ações nativas via Appium. Os cinco testes atuais não usam Appium.\n'
  text += '- Os mesmos cenários TypeScript verificam JSON com nomes/coordenadas, persistência após reload, cancelamento, rejeição atômica de arquivos inválidos, erros de disco/limpeza e duas janelas. O main continua lendo/gravando os arquivos reais. A rodada atual usa o novo fundo World Imagery. Não foram testados Windows/Linux, instalador nem o seletor nativo visual.\n'
  text += `\n### Pré-requisitos pendentes\n\nInstalar Xcode completo compatível com este macOS, selecionar seu diretório de desenvolvimento, concluir a configuração e conceder acessibilidade ao Xcode Helper. Command Line Tools sozinho não atende ao requisito. Não foi desativada a autenticação do modo de automação.\n\nDiretório selecionado: \`${report.environment.xcodeSelected}\`.\n\n\`\`\`text\n${report.environment.xcodeOutput}\n\`\`\`\n\nPara configurar o driver isolado, se necessário:\n\n\`\`\`bash\nAPPIUM_HOME="$PWD/test-results/appium-mac2" npx appium driver install mac2@4.5.0\nAPPIUM_HOME="$PWD/test-results/appium-mac2" npx appium driver doctor mac2\n\`\`\`\n\nPara repetir a rodada: npm run electron:build:poc e npm run test:poc:electron:files. O comando termina com código 2 se houver cenários sem execução, em vez de apresentar uma rodada incompleta como aprovada.\n\n[Rodada histórica das três ferramentas](${report.previousReport}): preservada como evidência anterior, em outra modalidade. Esses resultados não são aprovações da tentativa nativa atual. A implementação completa está na branch codex/poc-tres-ferramentas. A implementação antiga de arquivos com ChromeDriver está preservada nessa branch.\n`
  const target = resolve('e2e/pocs/ELECTRON-ARQUIVOS.md')
  await writeFile(target, text)
  console.log(`Relatório gerado: ${target}`)
}

const directory = resolve(process.env.POC_NATIVE_RESULTS_DIR ?? 'test-results/pocs/electron-files')
const report = JSON.parse(await readFile(resolve(directory, 'results.json'), 'utf8'))
if (report.mode !== 'no-chromedriver') throw new Error('Use resultados da modalidade atual sem ChromeDriver. Relatórios legados permanecem em e2e/pocs/old/.')
await renderDirectFiles(report, directory)
