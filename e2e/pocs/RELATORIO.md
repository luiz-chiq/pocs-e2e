# Relatório completo das POCs E2E — situação atual

Atualizado em 20/10/2026, 14:00:51 (São Paulo). [Versão direta](RELATORIO-DIRETO.md).

**Mudança posterior do mapa-base:** o app passou a usar Esri World Imagery. A [verificação adicional de satélite](MAPA-SATELITE.md) cobre Chrome e Electron com duas janelas, separadamente dos catálogos C/D e N abaixo. Não houve nova rodada completa das quatro plataformas nem atualização do deploy.

## Sumário

- [Resumo atual](#resumo-atual)
- [Tempos por ferramenta e plataforma](#tempos-por-ferramenta-e-plataforma)
- [Tempo de execução por plataforma](#tempo-de-execução-por-plataforma)
- [Etapas externas e totais contínuos](#etapas-externas-e-totais-contínuos)
- [Falhas atuais](#falhas-atuais)
- [Correções aplicadas](#correções-aplicadas)
- [Playwright](#playwright)
- [Selenium](#selenium)
- [WebdriverIO](#webdriverio)
- [Portabilidade](#portabilidade)
- [Limitações e escopo](#limitações-e-escopo)
- [Ambiente e evidências](#ambiente-e-evidências)
- [Arquivos no processo principal do Electron](#arquivos-no-processo-principal-do-electron)
- [Histórico separado](#histórico-separado)

## Resumo atual

**Nova cobertura:** os testes N01–N05 de arquivos no processo principal Electron estão na [rodada adicional](#arquivos-no-processo-principal-do-electron), separados dos 150 casos C/D abaixo.

**147 aprovações, 3 falhas e 0 sem validação concluída**, de 150 casos previstos. 3 falhas são o bug intencional C10 mouse; 0 são outras falhas.

**Duas janelas: 36/36 aprovados**, 0 falhas e 0 sem validação. Android não inclui duas janelas.

| Ferramenta | Web | PWA instalado | Electron | Android |
| --- | --- | --- | --- | --- |
| Playwright | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |
| Selenium | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |
| WebdriverIO | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |

Este é o consolidado mais recente das 12 combinações. Cada combinação usa a última suíte completa referenciada, com a origem indicada nas tabelas; não representa uma nova execução simultânea das 12. Resultados substituídos ficam somente nos arquivos históricos.

## Tempo de execução por plataforma

| Plataforma | Playwright | Selenium | WebdriverIO |
| --- | --- | --- | --- |
| Web | 1 min 18,49 s | 1 min 48,04 s | 2 min 16,55 s |
| PWA instalado | 1 min 19,55 s | 1 min 41,03 s | 1 min 35,74 s |
| Electron | 1 min 2,25 s | 1 min 20,26 s | 1 min 4,36 s |
| APK Android | 5 min 26,90 s | 8 min 14,45 s | 7 min 29,93 s |

Cada célula mostra o tempo de execução da suíte/comando daquela ferramenta e plataforma. Inclui inicialização, sessões, testes e encerramento internos ao comando; exclui build, preparação externa e limpeza externa. As origens das últimas execuções estão identificadas na tabela detalhada; combinações da mesma plataforma podem vir de rodadas distintas.

## Tempos por ferramenta e plataforma

| Ferramenta | Plataforma | Resultado atual | Soma dos testes | Suíte/comando | Aumento sobre o menor tempo | Origem da suíte |
| --- | --- | --- | --- | --- | --- | --- |
| Playwright | Web | 14/15 aprovados; 1 falha | 76,30 s | 1 min 18,49 s | 0,00% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log) |
| Playwright | PWA instalado | 13/13 aprovados | 78,50 s | 1 min 19,55 s | — | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/pwa/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/playwright.log) |
| Playwright | Electron | 13/13 aprovados | 61,52 s | 1 min 2,25 s | 0,00% | Revalidação · [JSON](../../test-results/pocs/electron-files-regression/electron/playwright/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/playwright.log) |
| Playwright | APK Android | 9/9 aprovados | 325,92 s | 5 min 26,90 s | 0,00% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/playwright.log) |
| Selenium | Web | 14/15 aprovados; 1 falha | 106,18 s | 1 min 48,04 s | 37,65% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log) |
| Selenium | PWA instalado | 13/13 aprovados | 99,22 s | 1 min 41,03 s | — | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/pwa/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/selenium.log) |
| Selenium | Electron | 13/13 aprovados | 79,80 s | 1 min 20,26 s | 28,94% | Revalidação · [JSON](../../test-results/pocs/electron-files-regression/electron/selenium/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/selenium.log) |
| Selenium | APK Android | 9/9 aprovados | 493,86 s | 8 min 14,45 s | 51,25% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/selenium.log) |
| WebdriverIO | Web | 14/15 aprovados; 1 falha | 132,71 s | 2 min 16,55 s | 73,97% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log) |
| WebdriverIO | PWA instalado | 13/13 aprovados | 87,37 s | 1 min 35,74 s | — | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio.log) |
| WebdriverIO | Electron | 13/13 aprovados | 61,63 s | 1 min 4,36 s | 3,39% | Revalidação · [JSON](../../test-results/pocs/electron-files-regression/electron/webdriverio/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/webdriverio.log) |
| WebdriverIO | APK Android | 9/9 aprovados | 438,36 s | 7 min 29,93 s | 37,63% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/webdriverio/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/webdriverio.log) |

**Percentuais:** (tempo da suíte ÷ menor tempo elegível − 1) × 100. Só comparamos quando as três ferramentas da plataforma vêm da mesma rodada e todos os casos foram registrados. Plataformas que combinam rodadas distintas ficam com “—”. Falhas e políticas diferentes de isolamento limitam a comparação; não é um benchmark universal. Os percentuais históricos continuam no arquivo de histórico.

## Etapas externas e totais contínuos

| Plataforma | Build | Preparação | Soma dos comandos atuais | Limpeza | Total contínuo da plataforma |
| --- | --- | --- | --- | --- | --- |
| Web | — | — | 5 min 23,08 s | — | 5 min 23,41 s |
| PWA instalado | — | — | 4 min 36,32 s | — | — (rodadas distintas) |
| Electron | 5,73 s | — | 3 min 26,87 s | — | 3 min 33,07 s |
| APK Android | 4,39 s | 27,92 s | 21 min 11,28 s | 1,65 s | 21 min 46,06 s |

**Soma dos testes** reúne as durações individuais. **Suíte/comando** inclui processo, sessões e encerramento internos à ferramenta. O total contínuo da plataforma só existe quando suas três ferramentas pertencem à mesma rodada; não somamos execuções diferentes para apresentar um tempo global. “—” significa não aplicável ou indisponível, não zero. Build/preparação/limpeza externos ficam fora do comando da suíte.

Playwright e Selenium isolam sessões por teste; WDIO compartilha a sessão e limpa os dados pela interface. Gestos, esperas, reinício e custos de conexão variam. Uma execução não mede frequência de intermitência. O bug de instalação por mouse foi mantido, sem skip, expectedFailure ou inversão de expectativa.

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log).

## Correções aplicadas

Nova funcionalidade Electron: importação/exportação JSON por preload/contextBridge, IPC e fs no processo principal. Importar acrescenta polígonos e sincroniza a janela separada; a validação do lote é integral. Exportar grava por arquivo temporário e rename. O bug intencional de instalação por mouse permanece.

O catálogo C/D preserva as últimas execuções indicadas nas tabelas. Na rodada atual de arquivos sem ChromeDriver, Playwright executou N01–N05 por Electron direto e acesso ao main; Selenium/WDIO tentaram sessões nativas Mac2, que não iniciaram porque falta Xcode completo. Os dez cenários nativos ficaram sem execução. A interação visual com o diálogo não foi automatizada.

**Arquivos sem ChromeDriver, modalidade atual:** Playwright 5/5 aprovados; Selenium/Mac2 e WDIO/Mac2 0 executados, cinco cenários indisponíveis em cada um. O Mac2 4.5.0 foi instalado isoladamente; doctor e tentativas de sessão apontam falta de Xcode válido e encerramento do WebDriverAgentMac com código 1. Não houve fallback. Esses impedimentos não são falhas funcionais do app nem aprovações. A rodada anterior de arquivos com ChromeDriver em Selenium/WDIO passou 15/15 e foi arquivada.

**Catálogo C/D anterior:** Electron 39/39; o consolidado permanece com 147 aprovações e três C10 mouse intencionais na web. Os 36 casos C/D de duas janelas passaram nas execuções referenciadas. Esses resultados não foram reexecutados ou convertidos para Mac2. A troca posterior do fundo de mapa e sua verificação têm evidências próprias.

- **Perfil:** informar ao ChromeDriver o mesmo `--user-data-dir` usado pelo Electron em `POLYGON_USER_DATA_DIR`. O log anterior mostrou o driver procurando no diretório temporário e o arquivo `DevToolsActivePort` sendo gravado no perfil da POC.
- **Sessão:** conectar o WDIO diretamente ao ChromeDriver oficial do Electron 44.4.3, com `browserName: chrome`, protocolo clássico e executável Electron explícito. O serviço Electron não é usado na suíte POC; a tentativa com ele registrou timeout da bridge e bloqueio no ciclo de reinício. APIs do processo principal não fazem parte do catálogo C/D; a rodada N01–N05 agora exercita o main via IPC restrito e arquivos reais.
- **Versão:** informar a versão 152.0.7977.130 obtida do ChromeDriver oficial baixado para este Electron, evitando que o WDIO tente consultar `--version` no aplicativo empacotado. Isso não abre o Chrome comum: as janelas testadas usam a origem `poligonos://app/`.
- **Janelas:** preservar os tamanhos definidos pela aplicação na abertura, reinício e separação. Este Electron rejeita o redimensionamento WebDriver com `Browser.getWindowForTarget`. Os gestos continuam usando dimensões/coordenadas reais do mapa.
- **D01:** reconsultar o seletor `.is-selected` a cada leitura. Os rótulos preservam seus nós ao trocar a seleção; o matcher anterior continuava lendo o Polígono 2. A captura mostrou o Polígono 1 selecionado, coerente com o CSS e com a reutilização do elemento observada na implementação. Continua sendo obrigatório haver exatamente um rótulo selecionado com o nome esperado; não há repetição de cliques, estado injetado ou expectativa afrouxada.
- **Playwright, preparo de Delete:** trazer a página para frente, clicar uma vez no centro do polígono por entrada real e exigir foco na superfície do mapa antes de enviar Delete. As verificações de aviso, confirmação, restauração, exclusão individual e exclusão de todos continuam obrigatórias. A mudança substitui o foco programático, sem repetir a tecla/clique até passar.
- **Limite do diagnóstico C08:** passou antes de qualquer ajuste nesta etapa. O preparo explícito passou em três execuções isoladas e na suíte completa; isso confirma a execução atual, sem comprovar causa da falha anterior ou estabilidade estatística. Não foi corrigido código de negócio para esconder uma falha.
- **D01 revalidado:** a consulta renovada do rótulo selecionado, implementada na etapa Electron, passou agora nas suítes completas WDIO/web e WDIO/PWA, com criação, edição, cancelamento e exclusão em duas janelas. O critério funcional foi mantido.
- **Arquivos Electron:** cinco cenários novos compartilhados entre os clientes Playwright, Selenium e WebdriverIO, com adaptadores próprios. Confirmam conteúdo em disco, persistência após reload, cancelamento, rejeição sem importação parcial, erro de leitura/escrita e sincronização em duas janelas. O serviço Electron do WDIO continua sem uso; o main é exercitado pela API IPC da aplicação.
- **Diagnóstico N03:** na primeira execução Playwright, a aplicação rejeitou corretamente o nome inválido, mas o teste esperava uma palavra ausente da mensagem. O teste passou a exigir o texto exato de cada erro, mantendo as verificações de coleção inalterada. A rodada completa posterior passou 15/15. Evidência inicial: [JSON](../../test-results/pocs/electron-files-diagnostic/results.json).
- **Regressão Electron:** os 13 cenários C/D foram executados novamente em cada ferramenta no novo pacote; 39/39 aprovados, incluindo os quatro casos de duas janelas por ferramenta.
- **Modalidade sem ChromeDriver:** Playwright configura a escolha/cancelamento do diálogo por electronApplication.evaluate e lê a auditoria no main. Os botões, IPC, validação e fs continuam reais. Selenium/WDIO tentaram Appium Mac2; Xcode incompleto impediu as sessões, portanto N01–N05 não foram executados nessas duas integrações.

## Playwright

### Web

**Resultado atual: 14/15 aprovados; 1 falha.** Suíte revalidada. Encerramento (UTC): 2026-10-19T12:20:06.624Z.

[JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log) · [Medições da execução](../../test-results/pocs/web-fix-2026-10-19/verified/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 2,12 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,22 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,15 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 5,74 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,40 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,97 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,01 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,41 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,54 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,70 s | Bug intencional detectado: clique não abre as instruções; touch passa em teste separado. [Evidência 1](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/artifacts/web-C10-mouse-deve-abrir-as-instruções-de-instalação/test-failed-1.png) [Evidência 2](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/artifacts/web-C10-mouse-deve-abrir-as-instruções-de-instalação/attachments/window-0-2f5a19220a8b7b6fdf3e93462ee03ae09b109abc.png) [Evidência 3](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/artifacts/web-C10-mouse-deve-abrir-as-instruções-de-instalação/error-context.md) [Evidência 4](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/artifacts/web-C10-mouse-deve-abrir-as-instruções-de-instalação/trace.zip) |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 1,26 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,65 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,33 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,51 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,29 s | Verificações concluídas. |

### PWA instalado

**Resultado atual: 13/13 aprovados.** Suíte original preservada; não substituída por uma revalidação. Encerramento (UTC): 2026-10-19T10:49:12.127Z.

[JSON](../../test-results/pocs/final-2026-10-19/pwa/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/playwright.log) · [Medições da execução](../../test-results/pocs/final-2026-10-19/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,53 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 5,45 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,15 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,25 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,70 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,02 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,70 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,79 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,57 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 9,86 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,72 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,48 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,29 s | Verificações concluídas. |

### Electron

**Resultado atual: 13/13 aprovados.** Suíte revalidada. Encerramento (UTC): 2026-10-19T20:13:54.917Z.

[JSON](../../test-results/pocs/electron-files-regression/electron/playwright/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/playwright.log) · [Medições da execução](../../test-results/pocs/electron-files-regression/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,84 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 3,97 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 2,99 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 4,94 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,38 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,79 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,59 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,40 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,33 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,66 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,20 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,00 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,43 s | Verificações concluídas. |

### APK Android

**Resultado atual: 9/9 aprovados.** Suíte original preservada; não substituída por uma revalidação. Encerramento (UTC): 2026-10-19T11:03:07.599Z.

[JSON](../../test-results/pocs/final-2026-10-19/android/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/playwright.log) · [Medições da execução](../../test-results/pocs/final-2026-10-19/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 19,60 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 32,62 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 31,88 s | Edição pelo botão; Enter físico não exercitado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 38,54 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 39,85 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 28,42 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 33,92 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 63,21 s | Exclusões pela interface; Delete físico não exercitado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 37,89 s | Verificações concluídas. |

## Selenium

### Web

**Resultado atual: 14/15 aprovados; 1 falha.** Suíte revalidada. Encerramento (UTC): 2026-10-19T12:21:54.727Z.

[JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log) · [Medições da execução](../../test-results/pocs/web-fix-2026-10-19/verified/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,10 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 6,08 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,79 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,37 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,93 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,67 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,75 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 9,10 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,60 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 12,30 s | Bug intencional detectado: clique não abre as instruções; touch passa em teste separado. [Evidência 1](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium/C10-mouse-deve-abrir-as-instru-es-de-instala-o-window-0.png) |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 3,32 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 15,05 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 6,91 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 7,13 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 8,10 s | Verificações concluídas. |

### PWA instalado

**Resultado atual: 13/13 aprovados.** Suíte original preservada; não substituída por uma revalidação. Encerramento (UTC): 2026-10-19T10:50:53.224Z.

[JSON](../../test-results/pocs/final-2026-10-19/pwa/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/selenium.log) · [Medições da execução](../../test-results/pocs/final-2026-10-19/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,94 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 6,71 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 5,30 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 7,27 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 5,46 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,86 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 7,67 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 9,81 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 7,17 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 14,21 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 8,13 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 8,45 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 9,24 s | Verificações concluídas. |

### Electron

**Resultado atual: 13/13 aprovados.** Suíte revalidada. Encerramento (UTC): 2026-10-19T20:16:19.730Z.

[JSON](../../test-results/pocs/electron-files-regression/electron/selenium/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/selenium.log) · [Medições da execução](../../test-results/pocs/electron-files-regression/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 2,67 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,85 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,90 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,06 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,06 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,63 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 5,51 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 8,80 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,74 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 12,88 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 6,65 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 7,01 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,05 s | Verificações concluídas. |

### APK Android

**Resultado atual: 9/9 aprovados.** Suíte original preservada; não substituída por uma revalidação. Encerramento (UTC): 2026-10-19T11:11:22.492Z.

[JSON](../../test-results/pocs/final-2026-10-19/android/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/selenium.log) · [Medições da execução](../../test-results/pocs/final-2026-10-19/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 28,09 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 44,17 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 43,30 s | Edição pelo botão; Enter físico não exercitado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 51,63 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 95,16 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 46,66 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 55,26 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 85,03 s | Exclusões pela interface; Delete físico não exercitado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 44,57 s | Verificações concluídas. |

## WebdriverIO

### Web

**Resultado atual: 14/15 aprovados; 1 falha.** Suíte revalidada. Encerramento (UTC): 2026-10-19T12:24:11.330Z.

[JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log) · [Medições da execução](../../test-results/pocs/web-fix-2026-10-19/verified/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 7,39 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 11,57 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 7,70 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 7,73 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 6,36 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,80 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 8,41 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 11,32 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 7,12 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,62 s | Bug intencional detectado: clique não abre as instruções; touch passa em teste separado. [Evidência 1](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio/C10-mouse-deve-abrir-as-instru-es-de-instala-o-window-0.png) |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 3,24 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 14,88 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 9,43 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 9,43 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 10,71 s | Verificações concluídas. |

### PWA instalado

**Resultado atual: 13/13 aprovados.** Suíte revalidada. Encerramento (UTC): 2026-10-19T12:26:32.448Z.

[JSON](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio.log) · [Medições da execução](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 4,36 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 8,40 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 6,17 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 7,84 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 6,97 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 6,11 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 7,52 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,28 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 4,42 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 10,58 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,61 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,47 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,63 s | Verificações concluídas. |

### Electron

**Resultado atual: 13/13 aprovados.** Suíte revalidada. Encerramento (UTC): 2026-10-19T20:14:59.398Z.

[JSON](../../test-results/pocs/electron-files-regression/electron/webdriverio/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/webdriverio.log) · [Medições da execução](../../test-results/pocs/electron-files-regression/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 1,87 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,01 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 2,93 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 4,83 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,32 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,56 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,23 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,18 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 4,36 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 10,10 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,68 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,85 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,71 s | Verificações concluídas. |

### APK Android

**Resultado atual: 9/9 aprovados.** Suíte original preservada; não substituída por uma revalidação. Encerramento (UTC): 2026-10-19T11:18:52.597Z.

[JSON](../../test-results/pocs/final-2026-10-19/android/webdriverio/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/webdriverio.log) · [Medições da execução](../../test-results/pocs/final-2026-10-19/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 20,65 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 40,10 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 33,79 s | Edição pelo botão; Enter físico não exercitado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 47,14 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 84,78 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 40,89 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 49,68 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 80,62 s | Exclusões pela interface; Delete físico não exercitado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 40,72 s | Verificações concluídas. |

## Portabilidade

### O que foi reaproveitado nesta POC

No catálogo original C/D, as três POCs têm **implementações de testes independentes**. Foram reaproveitados o plano e os critérios funcionais; o código que opera a interface foi escrito para cada ferramenta. Não há um teste de WebdriverIO sendo executado por Playwright ou Selenium, nem conversão automática entre eles. A rodada adicional N01–N05 de arquivos Electron adota outro desenho, explicado no final deste documento.

| Camada | Como ficou nesta POC | Evidência no projeto |
| --- | --- | --- |
| Catálogo e critérios | Mesmos IDs C01–C10 e D01–D03, títulos e expectativas de negócio. C10 tem duas entradas e D02 duas variações. | [Catálogo e contratos](shared/fixtures.ts), [plano](README.md). |
| Seletores e dados comuns | Seletores `data-testid`/CSS, triângulo inicial, viewport, tipos de coordenadas e configuração de ambiente compartilhados. Alguns dados, como listas de nomes inválidos, continuam escritos em cada suíte. | [Fixtures compartilhadas](shared/fixtures.ts). |
| Infraestrutura | Instalação/lançamento do PWA, conexão CDP, obtenção de ChromeDriver do Electron, capabilities Android e orquestração têm módulos compartilhados. Isso não substitui os gestos de cada ferramenta. | [PWA](shared/pwa.ts), [conexão Chrome](shared/chrome-pipe.ts), [Electron](shared/electron.ts), [Android](shared/android.ts), [orquestrador](../../scripts/run-pocs.mjs). |
| Leitura do app | Mesmo contrato auxiliar de coordenadas, persistência, prontidão e contagem de vértices. Não injeta polígonos nem altera resultados para aprovar testes. | `polygonTestApi`, disponível na build E2E. |
| Execução da interface | Cliques, preenchimento, desenho, arraste, esperas, asserções e troca entre janelas implementados separadamente. Helpers como `create`, `deselect` e `confirmName` existem em cada suíte, com assinaturas/implementações próprias. | [Playwright](playwright/web.spec.ts), [Selenium](selenium/web.test.ts), [WebdriverIO](webdriverio/web.e2e.ts). |
| Sessões e evidências | Hooks, reinício/persistência, captura de screenshots, trace e gravação do resultado adaptados ao runner. As durações individuais vêm de pontos de medição diferentes. | [Fixtures Playwright](playwright/fixtures.ts), [reporter](playwright/reporter.ts), [Selenium](selenium/web.test.ts), [configuração WDIO](../../wdio.poc.conf.ts). |

Compartilhado não significa utilizado pelas três ferramentas em todos os ambientes: as capabilities Appium e parte da conexão Chrome atendem Selenium/WebdriverIO; Playwright usa seus próprios adaptadores de sessão para Android/Electron. Os helpers comuns de instalação do PWA são usados pelas três integrações.

Exemplo do mesmo passo de negócio, usando o seletor compartilhado `s.draw`:

```ts
// Playwright
await page.locator(s.draw).click()

// Selenium
await (await driver.findElement(By.css(s.draw))).click()

// WebdriverIO
await $(s.draw).click()
```

O clique simples muda pouco. Esperar a criação de três vértices, arrastar geometria, coordenar duas janelas e reiniciar um APK exigem adaptação maior. Por exemplo, o Playwright Android desta POC envia gestos por CDP; Selenium e WebdriverIO usam ações W3C via Appium. A espera do `hitTest` e as confirmações com teclado aberto também precisaram de ajustes próprios. Ter os mesmos nomes de cenário não garante que os eventos e seus intervalos sejam idênticos.

### Reutilização entre plataformas e custo de isolamento

| Plataforma | Playwright | Selenium | WebdriverIO |
| --- | --- | --- | --- |
| Web | Contexto isolado por teste; navegador do worker é compartilhado. | Processo/perfil de Chrome por teste. | Sessão/perfil compartilhados; limpa dados pela interface. |
| PWA | Perfil novo e instalação real por teste; C07 reabre preservando o perfil daquele caso. | Perfil novo e instalação real por teste; C07 reabre com o PWA já instalado naquele perfil. | Instala no início da suíte; C07 relança usando o perfil existente. |
| Electron | Lança app/perfil por teste; C07 fecha e reabre o mesmo perfil. | Inicia ChromeDriver/app/perfil por teste; C07 reinicia. | Sessão/perfil compartilhados, conexão direta ao ChromeDriver do Electron; C07 reinicia o app com o mesmo perfil. Suíte atual aprovada 13/13. |
| Android | Force-stop, limpeza do pacote e lançamento por teste; conecta à WebView do PID atual. | Sessão Appium por teste, com instalação/reset conforme as capabilities; contexto WebView. | Sessão Appium compartilhada; refresh e limpeza pela interface entre casos; C07 encerra/reativa o app. |

Essas decisões pertencem à implementação desta POC, não são imposições universais das ferramentas. Explicam por que reaproveitar o roteiro não produz custos de execução equivalentes. Normalizar o isolamento seria uma alteração adicional nos adaptadores; não foi feita durante a rodada de métricas.

### Como migrar testes existentes para outra ferramenta

1. Preservar o comportamento esperado: pré-condições, ações, resultados e dados. Identificar o que realmente é regra de negócio e o que é detalhe do runner antigo.
2. Reaproveitar seletores, dados e componentes de domínio que não importem APIs da ferramenta. Page Objects que chamam diretamente `browser`, `page` ou `driver` precisam ter essa parte adaptada.
3. Reescrever a camada de execução: locators, preenchimento, gestos, asserções, esperas, hooks, perfis, janelas e evidências. Copiar uma espera fixa não garante equivalência entre drivers.
4. Adaptar o lançamento por plataforma: navegador; instalação real e janela standalone do PWA; executável/driver do Electron; APK, ADB, contexto WebView e teclado no Android.
5. Validar paridade antes de comparar métricas: mesma versão do app, dados iniciais, isolamento, critérios de toque e sinais de prontidão. Repetir os casos sensíveis e investigar divergências sem enfraquecer as asserções.

Selenium → WebdriverIO pode reaproveitar parte da configuração conceitual de WebDriver/Appium; as chamadas do cliente, asserções e lifecycle ainda mudam. Playwright → Selenium/WebdriverIO também exige adaptar fixtures/contextos e a integração de protocolo. Dentro de uma mesma ferramenta, esta POC reutiliza boa parte do corpo dos cenários entre plataformas, com branches e adaptadores para lançamento, toque, persistência e janelas.

No catálogo original C/D, seria possível definir ações de domínio como `criarPoligono` e implementar um adaptador por ferramenta. Essa abstração **não foi criada para unificar as três suítes C/D**: manter execuções independentes permite observar as diferenças, mas duplica parte da manutenção. A nova suíte N01–N05 adota adaptadores compartilhando os cenários. Não foi medido o tempo de desenvolvimento/migração nem um percentual de reaproveitamento de código; os tempos do relatório são de execução dos testes.

### Exemplo observado na correção dos adaptadores

Na revalidação de 19/10/2026, os critérios dos cenários foram preservados. No
Playwright Android, o toque no mapa passou a enviar início/fim consecutivos por
CDP. No Selenium, foram ajustadas as ações W3C de toque, a coordenação com o
teclado/viewport e a espera pela entrega do clique de confirmação. As leituras
de geometria passaram a tolerar somente a referência DOM obsoleta transitória;
o mouse ganhou um intervalo de hover antes de pressionar. São correções nos
adaptadores específicos, sem reescrever o roteiro de negócio ou aplicar uma
conversão automática às três ferramentas. Os resultados e os tempos dessa
revalidação ficam separados da rodada comparativa original.

### Rodada adicional de arquivos Electron

Em [electron-files.test.ts](electron-files.test.ts), os cinco cenários N01–N05
e suas asserções são compartilhados entre os três clientes, com runner Node Test
e adaptadores de lançamento, clique, leitura, reload e troca de janela. Playwright
usa `_electron`; Selenium usa `Builder`/ChromeDriver; WebdriverIO usa `remote` com
ChromeDriver. Os testes continuam em TypeScript. Essa abstração foi criada para
a nova funcionalidade; as suítes C/D não foram convertidas para ela.

Os dados de entrada são arquivos de teste. A escolha do caminho no diálogo é
simulada exclusivamente na build POC; importar e exportar continuam sendo ações
reais pelos botões, preload, IPC e `fs` do main. O runner lê o arquivo de saída
para conferir seu conteúdo. Há um processo/perfil novo por caso nas três
ferramentas, diferente do isolamento da suíte WDIO original. Por isso, seus tempos
ficam [separados](ELECTRON-ARQUIVOS.md) das métricas C/D anteriores.

Na modalidade mais recente, o comando de arquivos usa Playwright direto e
`electronApplication.evaluate` para configurar a resposta do diálogo no main.
Selenium/WDIO sem ChromeDriver foram tentados por Appium Mac2. A sessão não
iniciou sem Xcode completo; os cenários nativos não estão adaptados/validados.
Portar para Mac2 exige operar a árvore de acessibilidade, usando outros
seletores e ações; não basta reaproveitar CSS ou trocar a URL do servidor.
As implementações e os resultados anteriores com ChromeDriver foram preservados
como outra modalidade, sem aprová-los novamente como testes nativos.


## Limitações e escopo

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. O catálogo original de 150 casos C/D não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa. A funcionalidade de arquivos do processo principal Electron tem uma rodada adicional N01–N05, apresentada separadamente abaixo.

### Limitações por ferramenta em Electron e Android

“Documentada” indica uma restrição da integração; “observada” descreve esta POC e não uma incapacidade geral da ferramenta.

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | **Documentada:** integração `_electron` experimental; o lançamento depende de configuração compatível com inspeção Node. Diálogos nativos do sistema não são tratados como elementos da página. **Escopo da POC:** app macOS empacotado e duas janelas; instalador e diálogos nativos não avaliados. [Documentação Electron](https://playwright.dev/docs/api/class-electron). | **Documentada:** API Android experimental, voltada a Chrome/WebView; requer ADB. Há limitações de cobertura e captura exige dispositivo acordado. **Observada:** esta POC exercita a WebView do Capacitor; reconexão após reiniciar o app exigiu esperar o PID correto. O resultado atual é 9/9; oscilações anteriores estão preservadas no histórico. [Documentação Android](https://playwright.dev/docs/api/class-android). |
| Selenium | **Integração:** usa ChromeDriver e o executável do Electron, com configuração própria. Controlar a página não fornece automaticamente automação de menus/diálogos do sistema ou das APIs do processo principal. **Observada:** redimensionar por WebDriver falhou em `Browser.getWindowForTarget`; o bootstrap passou a usar o tamanho original. [Guia do Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium). | **Integração:** nesta POC, Selenium é o cliente de Appium/UiAutomator2; Selenium sozinho não é o driver do APK. Precisa de WebView depurável, contexto correto e ChromeDriver compatível. **Observada:** `browserName` precisou ficar vazio para abrir o app; a rotina genérica de esconder teclado enviava Escape e interrompia a edição. O ajuste atual consulta o teclado e envia somente Back nativo quando o IME está aberto, sem trocar/recriar o contexto WebView; também aguarda geometria estável e entrega do clique confiável. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |
| WebdriverIO | **Integração atual da POC:** WDIO conecta diretamente ao ChromeDriver oficial compatível, abrindo o binário Electron por WebDriver clássico. O serviço Electron continua sendo uma opção da ferramenta, mas seus hooks de bridge/foco não são usados nesta suíte. **Diagnóstico:** `DevToolsActivePort` era gravado no perfil definido pelo app e procurado em outro pelo driver; os diretórios agora coincidem. A versão é explícita para evitar a consulta `--version` ao app empacotado. **Limites:** usa os tamanhos definidos pelo app, sem `Browser.getWindowForTarget`; não oferece acesso genérico ao processo principal nem automatiza os diálogos nativos visuais. O fluxo restrito de IPC e arquivos do main é exercitado na rodada adicional N01–N05. O catálogo e as asserções funcionais foram preservados; a espera do D01 reconsulta o rótulo selecionado a cada leitura, pois os nós são reutilizados. [Serviço Electron](https://webdriver.io/docs/desktop-testing/electron/). | **Integração:** também usa Appium/UiAutomator2 e ChromeDriver para a WebView; compartilha essas dependências com Selenium. **Observada:** reutiliza a sessão entre casos; rolagem, teclado e a espera pela desseleção precisam ser coordenados. O resultado atual é 9/9; a troca de contextos e as transições de teclado ainda exigem coordenação no adaptador. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |

A documentação atual do WebdriverIO apresenta `@wdio/electron-service`; o projeto mantém `wdio-electron-service` 9.2.1 para a configuração legada. A suíte POC passou a conectar diretamente ao ChromeDriver, sem atualizar dependências. A diferença entre nomes/versões de pacotes não foi comprovada como causa do problema; o desencontro de perfis foi confirmado no log. A etapa seguinte revalidou web nas três ferramentas e WDIO/PWA: todos os cenários funcionais passaram; só C10 mouse permaneceu falhando por causa do defeito intencional. O C08 Playwright passou antes do novo preparo de foco, portanto a causa da intermitência anterior segue inconclusiva. O teste agora clica de verdade no polígono e confirma foco no mapa antes de Delete; passou em três verificações isoladas e na suíte completa, sem prova estatística de estabilidade. Electron/Android não foram reexecutados nessa etapa web. [Configuração documentada](https://webdriver.io/docs/desktop-testing/electron/).

**Limites comuns desta execução:** Electron foi avaliado apenas no macOS arm64; Android apenas no AVD Pixel_8, com APK de debug e WebView depurável. Não foram avaliados aparelho físico, APK release sem depuração, plugins nativos do Capacitor, permissões do sistema, outras versões de Android/WebView ou o carregamento visual de todos os tiles do mapa de fundo. As verificações do mapa se concentram nas geometrias, rótulos, controles e estados descritos nos cenários. Os testes de duas janelas verificam sincronização, sem posicionamento em dois monitores físicos. A ausência de duas janelas e de Enter/Delete no APK corresponde ao escopo deste app/testes, não a uma limitação geral das ferramentas.

### Criação de arquivos e cobertura E2E

Criar/exportar um arquivo pode fazer parte de E2E: o usuário aciona a função
pela interface e o teste verifica o arquivo realmente gerado e seu conteúdo.
Ler esse arquivo pelo processo de testes não substitui a ação do aplicativo.
Criar o arquivo artificialmente e conferir sua existência não valida a exportação.

No Electron, o runner Node pode observar arquivos acessíveis na máquina de teste.
O Playwright oferece acesso ao processo principal; o WDIO também possui essa
possibilidade por seu serviço Electron, mas a suíte desta POC usa ChromeDriver
direto e não utiliza a bridge do serviço. Um seletor nativo “Salvar como” não é
um elemento HTML: automatizá-lo exige tratamento próprio. Simular somente sua
resposta deixa o seletor do sistema fora da cobertura, mesmo que a gravação seja real.
[Playwright/Electron](https://playwright.dev/docs/api/class-electronapplication),
[serviço WDIO/Electron](https://webdriver.io/docs/desktop-testing/electron/).

No Android, Selenium e WDIO usam Appium/UiAutomator2 para alternar entre WebView
e interface nativa e recuperar arquivos. Arquivos privados exigem acesso permitido
no dispositivo; a transferência por caminho interno do pacote depende de build
depurável. O Playwright também tem ações nativas e shell via ADB, em integração
experimental. As capabilities atuais do Appium concedem permissões automaticamente;
recusa de permissões não foi avaliada.
[Arquivos no Appium](https://github.com/appium/appium-uiautomator2-driver#files-management),
[ações Android no Playwright](https://playwright.dev/docs/api/class-androiddevice).

**Cobertura atual:** o catálogo original C/D cobre a persistência em C07, sem
importação/exportação. A nova rodada [Electron — arquivos](ELECTRON-ARQUIVOS.md)
exercita o processo principal via IPC nas três ferramentas: importação/exportação
JSON, nomes/coordenadas, cancelamento, rejeição atômica de arquivos inválidos,
erros de disco e sincronização entre duas janelas. A leitura/gravação é real;
somente a escolha/cancelamento no diálogo é simulada. O seletor nativo visual
continua fora da cobertura. Isso não dá acesso genérico ao processo principal
para Selenium/WDIO: os clientes acionam os botões e observam os efeitos da API
restrita do aplicativo. O serviço Electron do WDIO continua sem uso nesta rodada.

### Rodada de arquivos sem ChromeDriver

A [modalidade atual](ELECTRON-ARQUIVOS.md) usa Playwright diretamente no Electron,
inclusive `electronApplication.evaluate` no processo principal. N01–N05 passaram.
Somente a resposta do diálogo foi simulada; arquivos e IPC são reais.

Para Selenium e WebdriverIO, foi instalado Mac2 4.5.0 em uma pasta Appium isolada.
Ambos tentaram uma sessão nativa; o WebDriverAgentMac não iniciou porque o Xcode
completo está ausente. Seus cinco cenários por ferramenta não foram executados.
Não se deve apresentar o 15/15 da modalidade anterior com ChromeDriver como
resultado nativo atual. O código nativo preparado é somente diagnóstico de
sessão; os cenários da árvore de acessibilidade ainda precisam de adaptação e
validação após configurar o Xcode. O serviço Electron do WDIO também usa
ChromeDriver; ativá-lo não elimina essa dependência.

Appium pode controlar elementos nativos e diálogos via Mac2; isso não é acesso
direto ao JavaScript do main nem conserva os seletores DOM/CSS. Playwright não
usa Appium como backend, mas pode coexistir no mesmo runner com um cliente
Appium, por exemplo WDIO, para ações nativas complementares. No Android, o
contexto WebView de Appium pode continuar usando ChromeDriver internamente.


## Ambiente e evidências

macOS 15.3 arm64; Node v24.11.0; Chrome 155.0.8059.82; @playwright/test 1.63.0; selenium-webdriver 4.51.0; webdriverio 9.31.9; electron 44.4.3; appium 3.8.0; appium-uiautomator2-driver 8.7.0; wdio-electron-service 9.2.1. APK debug no AVD Pixel_8; Web/PWA no deploy https://poc-e2e.chiquetano.com.br/; Electron empacotado para macOS arm64. Android 16 / API 36; Current WebView package (name, version): (com.google.android.webview, 133.0.6943.137).

As 12 linhas da tabela de tempos e as seções por ferramenta apontam para o JSON e o log efetivamente usados. O teste cria/edita pela interface; a API auxiliar lê estado/coordenadas e aguarda persistência.

Artefatos: Electron em `release/electron/`; APK em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Arquivos no processo principal do Electron

[Relatório da rodada adicional](ELECTRON-ARQUIVOS.md), com evidências, duração individual e limites da simulação do diálogo.

**Modalidade atual: sem ChromeDriver.** Playwright controla o Electron diretamente; Selenium e WebdriverIO tentam uma sessão nativa Appium/Mac2. Não há fallback para ChromeDriver. Sessão indisponível não é aprovação nem falha funcional dos cenários.

N01–N05 têm contagem própria, separada dos 150 casos C/D anteriores. Esta rodada não reexecuta web, PWA, Android ou o catálogo C/D.

| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |
| --- | --- | --- | --- | --- | --- |
| Playwright | 5 | 0 | 0 | 8.46 s | — |
| Selenium | 0 | 0 | 5 | — | — |
| WebdriverIO | 0 | 0 | 5 | — | — |

Cada duração executada inclui lançamento com perfil novo, cenário e encerramento; exclui build e preparação externa. Cenários não executados não recebem duração zero. O tempo da tentativa de criar a sessão Mac2 aparece separadamente abaixo, sem ser confundido com execução dos cinco testes. Não há percentual comparativo com duas ferramentas sem execução.

### Testes por ferramenta

#### Playwright

| Cenário | Resultado | Duração |
| --- | --- | --- |
| N01 importa e exporta nomes e coordenadas usando IPC e disco real | Passou | 3.11 s |
| N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos | Passou | 1.09 s |
| N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente | Passou | 1.22 s |
| N04 informa erros de leitura e escrita sem perder dados nem deixar temporários | Passou | 1.20 s |
| N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados | Passou | 1.84 s |

#### Selenium

| Cenário | Resultado | Duração |
| --- | --- | --- |
| N01 importa e exporta nomes e coordenadas usando IPC e disco real | Não executado | — |
| N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos | Não executado | — |
| N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente | Não executado | — |
| N04 informa erros de leitura e escrita sem perder dados nem deixar temporários | Não executado | — |
| N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados | Não executado | — |

Preparação nativa: **sessão indisponível**, em 1.04 s. Os cinco cenários ficaram sem execução. [Log Appium](../../test-results/pocs/electron-direct-final/appium-mac2.log) · [diagnóstico dos clientes](../../test-results/pocs/electron-direct-final/mac2-bootstrap.json).

```text
'GET /status' cannot be proxied to Mac2 Driver server because its process is not running (probably crashed). Check the Appium log for more details
```

#### WebdriverIO

| Cenário | Resultado | Duração |
| --- | --- | --- |
| N01 importa e exporta nomes e coordenadas usando IPC e disco real | Não executado | — |
| N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos | Não executado | — |
| N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente | Não executado | — |
| N04 informa erros de leitura e escrita sem perder dados nem deixar temporários | Não executado | — |
| N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados | Não executado | — |

Preparação nativa: **sessão indisponível**, em 1.04 s. Os cinco cenários ficaram sem execução. [Log Appium](../../test-results/pocs/electron-direct-final/appium-mac2.log) · [diagnóstico dos clientes](../../test-results/pocs/electron-direct-final/mac2-bootstrap.json).

```text
WebDriverError: 'GET /status' cannot be proxied to Mac2 Driver server because its process is not running (probably crashed). Check the Appium log for more details when running "http://127.0.0.1:4725/session" with method "POST"
```

### Implementação e limites

- **Playwright:** `_electron.launch` abre o app empacotado. `electronApplication.evaluate` configura somente a resposta dos diálogos no processo principal e lê a auditoria. Não usa ChromeDriver nem POLYGON_E2E_DIALOG_PLAN. Os cliques da interface, preload, IPC, validação e operações de disco são reais. O seletor visual do sistema continua simulado.
- **Selenium e WDIO:** ambos os clientes tentaram criar uma sessão Appium Mac2/WebDriverAgentMac nativa. O Mac2 foi instalado em `test-results/appium-mac2`, separado do Android. O Xcode completo está ausente: o doctor indicou caminho inválido e xcodebuild indisponível; o WebDriverAgentMac encerrou com código 1. Nenhum N01–N05 rodou nessas duas integrações. O bootstrap não é uma implementação E2E completa: após destravar a sessão, os cenários ainda precisam ser adaptados e validados com seletores de acessibilidade. [Requisitos Mac2](https://appium.github.io/appium-mac2-driver/latest/getting-started/).
- O [serviço Electron do WDIO](https://webdriver.io/docs/desktop-testing/electron/) também usa ChromeDriver. Appium é o servidor, Mac2 é seu driver nativo de macOS, e Selenium/WDIO são clientes. Usar Appium não elimina automaticamente ChromeDriver em outros contextos: no Android/WebView ele pode continuar necessário.
- O [Playwright](https://playwright.dev/docs/api/class-electron) não oferece Appium como backend. Pode-se combinar bibliotecas no mesmo runner, usando Playwright para renderer/main e outro cliente para ações nativas via Appium. Os cinco testes atuais não usam Appium.
- Os mesmos cenários TypeScript verificam JSON com nomes/coordenadas, persistência após reload, cancelamento, rejeição atômica de arquivos inválidos, erros de disco/limpeza e duas janelas. O main continua lendo/gravando os arquivos reais. A rodada atual usa o novo fundo World Imagery. Não foram testados Windows/Linux, instalador nem o seletor nativo visual.

#### Pré-requisitos pendentes

Instalar Xcode completo compatível com este macOS, selecionar seu diretório de desenvolvimento, concluir a configuração e conceder acessibilidade ao Xcode Helper. Command Line Tools sozinho não atende ao requisito. Não foi desativada a autenticação do modo de automação.

Diretório selecionado: `/Library/Developer/CommandLineTools`.

```text
xcode-select: error: tool 'xcodebuild' requires Xcode, but active developer directory '/Library/Developer/CommandLineTools' is a command line tools instance
```

Para configurar o driver isolado, se necessário:

```bash
APPIUM_HOME="$PWD/test-results/appium-mac2" npx appium driver install mac2@4.5.0
APPIUM_HOME="$PWD/test-results/appium-mac2" npx appium driver doctor mac2
```

Para repetir a rodada: npm run electron:build:poc e npm run test:poc:electron:files. O comando termina com código 2 se houver cenários sem execução, em vez de apresentar uma rodada incompleta como aprovada.

[Rodada anterior com ChromeDriver em Selenium/WDIO](old/ELECTRON-ARQUIVOS-COM-CHROMEDRIVER.md): 15/15 aprovados, em outra modalidade. Esses resultados não são aprovações da tentativa nativa atual. O comando antigo está disponível explicitamente como npm run test:poc:electron:files:chromedriver.

## Histórico separado

[Relatório histórico completo](old/RELATORIO-ANTES-SEM-CHROMEDRIVER.md) · [Histórico direto](old/RELATORIO-DIRETO-ANTES-SEM-CHROMEDRIVER.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
