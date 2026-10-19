# Relatório completo das POCs E2E — situação atual

Atualizado em 19/10/2026, 10:33:45 (São Paulo). [Versão direta](RELATORIO-DIRETO.md).

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
- [Histórico separado](#histórico-separado)

## Resumo atual

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
| Electron | 1 min 2,55 s | 1 min 20,58 s | 1 min 5,99 s |
| APK Android | 5 min 26,90 s | 8 min 14,45 s | 7 min 29,93 s |

Cada célula mostra o tempo de execução da suíte/comando daquela ferramenta e plataforma. Inclui inicialização, sessões, testes e encerramento internos ao comando; exclui build, preparação externa e limpeza externa. PWA e Electron usam as últimas execuções de rodadas distintas, identificadas na tabela detalhada.

## Tempos por ferramenta e plataforma

| Ferramenta | Plataforma | Resultado atual | Soma dos testes | Suíte/comando | Aumento sobre o menor tempo | Origem da suíte |
| --- | --- | --- | --- | --- | --- | --- |
| Playwright | Web | 14/15 aprovados; 1 falha | 76,30 s | 1 min 18,49 s | 0,00% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log) |
| Playwright | PWA instalado | 13/13 aprovados | 78,50 s | 1 min 19,55 s | — | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/pwa/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/playwright.log) |
| Playwright | Electron | 13/13 aprovados | 61,74 s | 1 min 2,55 s | — | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/electron/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/electron/playwright.log) |
| Playwright | APK Android | 9/9 aprovados | 325,92 s | 5 min 26,90 s | 0,00% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/playwright.log) |
| Selenium | Web | 14/15 aprovados; 1 falha | 106,18 s | 1 min 48,04 s | 37,65% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log) |
| Selenium | PWA instalado | 13/13 aprovados | 99,22 s | 1 min 41,03 s | — | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/pwa/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/selenium.log) |
| Selenium | Electron | 13/13 aprovados | 80,14 s | 1 min 20,58 s | — | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/electron/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/electron/selenium.log) |
| Selenium | APK Android | 9/9 aprovados | 493,86 s | 8 min 14,45 s | 51,25% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/selenium.log) |
| WebdriverIO | Web | 14/15 aprovados; 1 falha | 132,71 s | 2 min 16,55 s | 73,97% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log) |
| WebdriverIO | PWA instalado | 13/13 aprovados | 87,37 s | 1 min 35,74 s | — | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio.log) |
| WebdriverIO | Electron | 13/13 aprovados | 61,96 s | 1 min 5,99 s | — | Revalidação · [JSON](../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio/results.json) · [Log](../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio.log) |
| WebdriverIO | APK Android | 9/9 aprovados | 438,36 s | 7 min 29,93 s | 37,63% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/webdriverio/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/webdriverio.log) |

**Percentuais:** (tempo da suíte ÷ menor tempo elegível − 1) × 100. Só comparamos quando as três ferramentas da plataforma vêm da mesma rodada e todos os casos foram registrados. Web e Android atendem a esse critério; PWA e Electron combinam rodadas distintas e ficam com “—”. Falhas e políticas diferentes de isolamento limitam a comparação; não é um benchmark universal. Os percentuais históricos continuam no arquivo de histórico.

## Etapas externas e totais contínuos

| Plataforma | Build | Preparação | Soma dos comandos atuais | Limpeza | Total contínuo da plataforma |
| --- | --- | --- | --- | --- | --- |
| Web | — | — | 5 min 23,08 s | — | 5 min 23,41 s |
| PWA instalado | — | — | 4 min 36,32 s | — | — (rodadas distintas) |
| Electron | — | — | 3 min 29,12 s | — | — (rodadas distintas) |
| APK Android | 4,39 s | 27,92 s | 21 min 11,28 s | 1,65 s | 21 min 46,06 s |

**Soma dos testes** reúne as durações individuais. **Suíte/comando** inclui processo, sessões e encerramento internos à ferramenta. O total contínuo da plataforma só existe quando suas três ferramentas pertencem à mesma rodada; não somamos execuções diferentes para apresentar um tempo global. “—” significa não aplicável ou indisponível, não zero. Build/preparação/limpeza externos ficam fora do comando da suíte.

Playwright e Selenium isolam sessões por teste; WDIO compartilha a sessão e limpa os dados pela interface. Gestos, esperas, reinício e custos de conexão variam. Uma execução não mede frequência de intermitência. O bug de instalação por mouse foi mantido, sem skip, expectedFailure ou inversão de expectativa.

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log).

## Correções aplicadas

WDIO reconsulta o rótulo selecionado no D01, agora validado em web/PWA. Playwright direciona o Delete ao mapa com clique real no polígono e confirmação de foco. O bug intencional de instalação por mouse permanece.

C08 já passou antes do novo preparo: a causa da intermitência anterior continua inconclusiva. Três verificações isoladas e a suíte completa passaram após o ajuste; isso não mede estabilidade estatística. Nesta etapa foram reexecutados web nas três ferramentas e WDIO/PWA; os demais resultados são anteriores, incluindo a correção WDIO/Electron.

**Resultados desta etapa:** 42/45 na web, com apenas os três C10 mouse intencionais; WDIO/PWA 13/13. Total do orquestrador web: **5 min 23,41 s**; WDIO/PWA: **1 min 35,94 s**, em execução separada. Nenhum teste ficou sem execução. O consolidado passa a ter somente três falhas intencionais; os 36 testes de duas janelas estão aprovados. O WDIO/PWA registrou um aviso de sessão antiga no reinício, sem impedir os 13 testes; a versão completa preserva o log e a limitação.

- **Perfil:** informar ao ChromeDriver o mesmo `--user-data-dir` usado pelo Electron em `POLYGON_USER_DATA_DIR`. O log anterior mostrou o driver procurando no diretório temporário e o arquivo `DevToolsActivePort` sendo gravado no perfil da POC.
- **Sessão:** conectar o WDIO diretamente ao ChromeDriver oficial do Electron 44.4.3, com `browserName: chrome`, protocolo clássico e executável Electron explícito. O serviço Electron não é usado na suíte POC; a tentativa com ele registrou timeout da bridge e bloqueio no ciclo de reinício. APIs do processo principal não fazem parte destes testes.
- **Versão:** informar a versão 152.0.7977.130 obtida do ChromeDriver oficial baixado para este Electron, evitando que o WDIO tente consultar `--version` no aplicativo empacotado. Isso não abre o Chrome comum: as janelas testadas usam a origem `poligonos://app/`.
- **Janelas:** preservar os tamanhos definidos pela aplicação na abertura, reinício e separação. Este Electron rejeita o redimensionamento WebDriver com `Browser.getWindowForTarget`. Os gestos continuam usando dimensões/coordenadas reais do mapa.
- **D01:** reconsultar o seletor `.is-selected` a cada leitura. Os rótulos preservam seus nós ao trocar a seleção; o matcher anterior continuava lendo o Polígono 2. A captura mostrou o Polígono 1 selecionado, coerente com o CSS e com a reutilização do elemento observada na implementação. Continua sendo obrigatório haver exatamente um rótulo selecionado com o nome esperado; não há repetição de cliques, estado injetado ou expectativa afrouxada.
- **Playwright, preparo de Delete:** trazer a página para frente, clicar uma vez no centro do polígono por entrada real e exigir foco na superfície do mapa antes de enviar Delete. As verificações de aviso, confirmação, restauração, exclusão individual e exclusão de todos continuam obrigatórias. A mudança substitui o foco programático, sem repetir a tecla/clique até passar.
- **Limite do diagnóstico C08:** passou antes de qualquer ajuste nesta etapa. O preparo explícito passou em três execuções isoladas e na suíte completa; isso confirma a execução atual, sem comprovar causa da falha anterior ou estabilidade estatística. Não foi corrigido código de negócio para esconder uma falha.
- **D01 revalidado:** a consulta renovada do rótulo selecionado, implementada na etapa Electron, passou agora nas suítes completas WDIO/web e WDIO/PWA, com criação, edição, cancelamento e exclusão em duas janelas. O critério funcional foi mantido.

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

**Resultado atual: 13/13 aprovados.** Suíte original preservada; não substituída por uma revalidação. Encerramento (UTC): 2026-10-19T10:53:42.189Z.

[JSON](../../test-results/pocs/final-2026-10-19/electron/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/electron/playwright.log) · [Medições da execução](../../test-results/pocs/final-2026-10-19/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 4,25 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 3,93 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 2,94 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 4,94 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,31 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,72 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,50 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,38 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,32 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,73 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,09 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,18 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,45 s | Verificações concluídas. |

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

**Resultado atual: 13/13 aprovados.** Suíte original preservada; não substituída por uma revalidação. Encerramento (UTC): 2026-10-19T10:55:02.849Z.

[JSON](../../test-results/pocs/final-2026-10-19/electron/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/electron/selenium.log) · [Medições da execução](../../test-results/pocs/final-2026-10-19/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 2,70 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,84 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,82 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,01 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,04 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,55 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 5,48 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 8,82 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,68 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 13,16 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 6,37 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 6,93 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,74 s | Verificações concluídas. |

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

**Resultado atual: 13/13 aprovados.** Suíte revalidada. Encerramento (UTC): 2026-10-19T12:03:02.733Z.

[JSON](../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio/results.json) · [Log](../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio.log) · [Medições da execução](../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/timing.json)

| Teste | Resultado atual | Duração | Observação/evidência |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 1,90 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 3,99 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 2,87 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 4,85 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,33 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,69 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,38 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,39 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 4,36 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 9,96 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,64 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,90 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,70 s | Verificações concluídas. |

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

As três POCs têm **implementações de testes independentes**. Foram reaproveitados o plano e os critérios funcionais; o código que opera a interface foi escrito para cada ferramenta. Não há um teste de WebdriverIO sendo executado por Playwright ou Selenium, nem conversão automática entre eles.

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

Para reduzir custo futuro, seria possível definir ações de domínio como `criarPoligono` e implementar um adaptador por ferramenta. Essa abstração **não foi criada para unificar as três suítes nesta POC**: manter execuções independentes permite observar as diferenças, mas duplica parte da manutenção. Não foi medido o tempo de desenvolvimento/migração nem um percentual de reaproveitamento de código; os tempos do relatório são de execução dos testes.

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


## Limitações e escopo

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. Não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa.

### Limitações por ferramenta em Electron e Android

“Documentada” indica uma restrição da integração; “observada” descreve esta POC e não uma incapacidade geral da ferramenta.

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | **Documentada:** integração `_electron` experimental; o lançamento depende de configuração compatível com inspeção Node. Diálogos nativos do sistema não são tratados como elementos da página. **Escopo da POC:** app macOS empacotado e duas janelas; instalador e diálogos nativos não avaliados. [Documentação Electron](https://playwright.dev/docs/api/class-electron). | **Documentada:** API Android experimental, voltada a Chrome/WebView; requer ADB. Há limitações de cobertura e captura exige dispositivo acordado. **Observada:** esta POC exercita a WebView do Capacitor; reconexão após reiniciar o app exigiu esperar o PID correto. O resultado atual é 9/9; oscilações anteriores estão preservadas no histórico. [Documentação Android](https://playwright.dev/docs/api/class-android). |
| Selenium | **Integração:** usa ChromeDriver e o executável do Electron, com configuração própria. Controlar a página não fornece automaticamente automação de menus/diálogos do sistema ou das APIs do processo principal. **Observada:** redimensionar por WebDriver falhou em `Browser.getWindowForTarget`; o bootstrap passou a usar o tamanho original. [Guia do Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium). | **Integração:** nesta POC, Selenium é o cliente de Appium/UiAutomator2; Selenium sozinho não é o driver do APK. Precisa de WebView depurável, contexto correto e ChromeDriver compatível. **Observada:** `browserName` precisou ficar vazio para abrir o app; a rotina genérica de esconder teclado enviava Escape e interrompia a edição. O ajuste atual consulta o teclado e envia somente Back nativo quando o IME está aberto, sem trocar/recriar o contexto WebView; também aguarda geometria estável e entrega do clique confiável. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |
| WebdriverIO | **Integração atual da POC:** WDIO conecta diretamente ao ChromeDriver oficial compatível, abrindo o binário Electron por WebDriver clássico. O serviço Electron continua sendo uma opção da ferramenta, mas seus hooks de bridge/foco não são usados nesta suíte. **Diagnóstico:** `DevToolsActivePort` era gravado no perfil definido pelo app e procurado em outro pelo driver; os diretórios agora coincidem. A versão é explícita para evitar a consulta `--version` ao app empacotado. **Limites:** usa os tamanhos definidos pelo app, sem `Browser.getWindowForTarget`; não automatiza APIs do processo principal ou diálogos nativos. O catálogo e as asserções funcionais foram preservados; a espera do D01 reconsulta o rótulo selecionado a cada leitura, pois os nós são reutilizados. [Serviço Electron](https://webdriver.io/docs/desktop-testing/electron/). | **Integração:** também usa Appium/UiAutomator2 e ChromeDriver para a WebView; compartilha essas dependências com Selenium. **Observada:** reutiliza a sessão entre casos; rolagem, teclado e a espera pela desseleção precisam ser coordenados. O resultado atual é 9/9; a troca de contextos e as transições de teclado ainda exigem coordenação no adaptador. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |

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

**Cobertura atual:** nenhuma suíte desta POC avalia criação/exportação de arquivo
ou o seletor nativo. C07 cobre a persistência dos polígonos ao reiniciar a aplicação.
Uma futura exportação de GeoJSON poderia validar arquivo, nome, coordenadas,
conteúdo e reimportação, preservando a gravação real pelo aplicativo.


## Ambiente e evidências

macOS 15.3 arm64; Node v24.11.0; Chrome 155.0.8059.82; @playwright/test 1.63.0; selenium-webdriver 4.51.0; webdriverio 9.31.9; electron 44.4.3; appium 3.8.0; appium-uiautomator2-driver 8.7.0; wdio-electron-service 9.2.1. APK debug no AVD Pixel_8; Web/PWA no deploy https://poc-e2e.chiquetano.com.br/; Electron empacotado para macOS arm64. Android 16 / API 36; Current WebView package (name, version): (com.google.android.webview, 133.0.6943.137).

As 12 linhas da tabela de tempos e as seções por ferramenta apontam para o JSON e o log efetivamente usados. O teste cria/edita pela interface; a API auxiliar lê estado/coordenadas e aguarda persistência.

Artefatos: Electron em `release/electron/`; APK em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Histórico separado

[Relatório histórico completo](old/RELATORIO-HISTORICO-2026-10-19.md) · [Histórico direto](old/RELATORIO-DIRETO-HISTORICO-2026-10-19.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
