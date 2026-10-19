import { readFile, writeFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'
const directory = resolve(process.env.POC_NATIVE_RESULTS_DIR ?? 'test-results/pocs/electron-files')
const report = JSON.parse(await readFile(resolve(directory, 'results.json'), 'utf8'))
const target = resolve('e2e/pocs/ELECTRON-ARQUIVOS.md')
const evidence = relative(resolve('e2e/pocs'), resolve(directory, 'results.json'))
const names = { playwright: 'Playwright', selenium: 'Selenium', webdriverio: 'WebdriverIO' }
const time = ms => `${(ms / 1000).toFixed(2)} s`
let text = `# Electron — importação e exportação pelo processo principal\n\nExecutado de ${report.startedAt} a ${report.finishedAt}. Evidência: [resultados JSON](${evidence}).\n\n## Sumário\n\n- [Resumo](#resumo)\n- [Testes por ferramenta](#testes-por-ferramenta)\n- [Implementação e limites](#implementação-e-limites)\n\n## Resumo\n\nEsta é uma rodada adicional da nova funcionalidade Electron. Seus casos N01–N05 são separados do consolidado histórico de 150 testes; web, PWA e Android não foram reexecutados nesta rodada.\n\n| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |\n| --- | --- | --- | --- | --- | --- |\n`
const tools = Object.keys(names)
const sum = tool => report.tests.filter(test => test.tool === tool).reduce((total, test) => total + test.durationMs, 0)
const complete = tools.every(tool => report.tests.filter(test => test.tool === tool).length === 5)
const fastest = Math.min(...tools.map(sum))
for (const tool of tools) {
  const tests = report.tests.filter(test => test.tool === tool)
  text += `| ${names[tool]} | ${tests.filter(test => test.status === 'passed').length} | ${tests.filter(test => test.status === 'failed').length} | ${5 - tests.length} | ${time(sum(tool))} | ${complete ? `${((sum(tool) / fastest - 1) * 100).toFixed(2)}%` : '—'} |\n`
}
text += '\nCada duração inclui lançamento de um app empacotado com perfil novo, cenário e encerramento. A soma exclui build e trabalho externo do runner; não equivale ao tempo do comando das suítes antigas. Percentual: (soma ÷ menor soma − 1) × 100, somente com os cinco casos registrados nas três ferramentas. Uma execução não estabelece um benchmark de desempenho.\n\n## Testes por ferramenta\n'
for (const tool of tools) {
  text += `\n### ${names[tool]}\n\n| Cenário | Resultado | Duração |\n| --- | --- | --- |\n`
  for (const test of report.tests.filter(test => test.tool === tool)) text += `| ${test.title} | ${test.status === 'passed' ? 'Passou' : 'Falhou'} | ${time(test.durationMs)} |\n`
  for (const test of report.tests.filter(test => test.tool === tool && test.error)) text += `\nFalha em ${test.title}:\n\n\`\`\`text\n${test.error}\n\`\`\`\n`
}
text += `\n## Implementação e limites\n\n- Botões disponíveis somente no Electron, no rodapé do menu. Importar acrescenta áreas, gera IDs novos e sincroniza com a janela do mapa. Exportar salva todas as áreas confirmadas. Ambos ficam desabilitados durante desenho/edição.\n- O renderer chama duas funções restritas do preload/contextBridge. O processo principal valida a origem IPC e os dados, abre os diálogos e lê/grava por Node fs. A página não recebe caminhos arbitrários nem acesso ao Node.\n- JSON próprio, formato poligonos, versão 1, nome e geometria ArcGIS (rings/spatialReference). Não é GeoJSON. Nomes de 1 a 30 caracteres, letras/números/espaços e acentos; mínimo de três pontos distintos formando área e anéis fechados. Referências 4326/3857/102100/102113; até 10 MB, 1.000 polígonos e 100.000 pontos por arquivo. Não verifica todas as regras topológicas, como auto-interseções.\n- Gravação real por arquivo temporário e rename; falhas não substituem o destino e limpam temporários. Importação só altera a coleção após validar todo o arquivo.\n- Os três clientes usam as mesmas funções de cenário e asserções em TypeScript, com adaptadores de clique, leitura e troca de janela próprios. Playwright lança por _electron; Selenium e WDIO remoto usam ChromeDriver compatível. Não se utiliza o serviço Electron do WDIO nem se executa código arbitrário no main via WebDriver. O efeito do main é verificado por arquivos reais e auditoria de chamadas no processo browser.\n- Apenas a resposta de seleção/cancelamento do diálogo é simulada, por plano local habilitado exclusivamente no pacote POC (polygonE2E=true) e variável POLYGON_E2E_DIALOG_PLAN. A build normal não habilita esse plano. Abertura visual, navegação e interação com o seletor nativo do sistema **não foram automatizadas**.\n- Testado em macOS arm64. Windows/Linux, instalador e diálogos reais continuam sem validação nesta rodada. As duas janelas foram testadas no mesmo computador, sem exigir dois monitores físicos.\n- Validação complementar: seis testes Node do serviço cobrem formato/geometria, disco real, cancelamento, tamanho, preservação do destino quando rename falha, rejeição de origens/subframes IPC e bloqueio de operações simultâneas.\n\nPara repetir: npm run electron:build:poc e npm run test:poc:electron:files. Testes do serviço: npm run test:electron:files.\n`
await writeFile(target, text)
console.log(`Relatório gerado: ${target}`)
