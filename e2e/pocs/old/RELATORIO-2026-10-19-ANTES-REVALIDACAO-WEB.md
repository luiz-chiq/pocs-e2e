# Histórico — Relatório completo das POCs E2E

> **RELATÓRIO HISTÓRICO — RESULTADOS SUBSTITUÍDOS.** Os números abaixo descrevem a rodada indicada neste arquivo. Para a situação vigente, consulte o [relatório completo atual](../RELATORIO.md), a [versão direta atual](../RELATORIO-DIRETO.md) ou o [status atual](../STATUS.md).

Atualizado em 19/10/2026, 09:04:44 (São Paulo). [Versão direta](RELATORIO-DIRETO-2026-10-19-ANTES-REVALIDACAO-WEB.md).

## Sumário

- [Revalidação após correções](#revalidação-após-correções)
- [Resumo da rodada original](#resumo-da-rodada-original)
- [Tempos por plataforma](#tempos-por-plataforma)
- [Como interpretar os tempos](#como-interpretar-os-tempos)
- [Falhas desta rodada](#falhas-desta-rodada)
- [Portabilidade](#portabilidade)
- [Limites e aprendizados](#limites-e-aprendizados)
- [Etapas, builds e ambiente](#etapas-builds-e-ambiente)
- [Playwright: testes individuais](#playwright)
- [Selenium: testes individuais](#selenium)
- [WebdriverIO: testes individuais](#webdriverio)

## Revalidação após correções

Revalidação WDIO/Electron em 19/10/2026; suíte encerrada às 12:03:02 UTC. **Resultado mais recente consolidado: 144 aprovações, 6 falhas e 0 sem validação concluída**, de 150 casos. Combina as suítes reexecutadas abaixo com os resultados originais das demais combinações; não é uma nova rodada das 12 combinações.

| Ferramenta | Web | PWA instalado | Electron | Android |
| --- | --- | --- | --- | --- |
| Playwright | 13/15; 2 falha(s) | 13/13 | 13/13 | 9/9 |
| Selenium | 14/15; 1 falha(s) | 13/13 | 13/13 | 9/9 |
| WebdriverIO | 13/15; 2 falha(s) | 12/13; 1 falha(s) | 13/13 (revalidado) | 9/9 |

As células marcadas como revalidadas usam a nova execução; as demais preservam a rodada original.

**Reexecutado após as alterações:** 13 aprovações, 0 falhas e 0 sem validação concluída. Cada linha é uma suíte completa, com os testes de duas janelas integrados quando aplicáveis.

Duas janelas: 4 aprovações e 0 falhas nas suítes reexecutadas; consolidado mais recente de 34 aprovações, 2 falhas e 0 sem validação, de 36 previstos.

| Ferramenta | Plataforma | Resultado atual | Soma dos testes | Tempo da nova suíte | Aumento na revalidação | Evidências |
| --- | --- | --- | --- | --- | --- | --- |
| WebdriverIO | Electron | 13 passaram; 0 falharam; 0 sem validação | 61,96 s | 1 min 5,99 s | — | [JSON](../../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio/results.json) · [Log](../../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio.log) |

**Comparação de tempos:** o aumento na tabela acima usa somente as ferramentas reexecutadas na mesma plataforma; “—” indica que só uma ferramenta foi reexecutada ou não há medição elegível. Os percentuais da matriz original abaixo usam somente a rodada contínua das três ferramentas. Os novos tempos acima pertencem à revalidação; não foram misturados ao total original de 36 min 46,72 s nem usados para recalcular seus percentuais. Os dois grupos aplicam (tempo ÷ menor tempo elegível − 1) × 100.

**Ajustes e diagnóstico:**

- **Perfil:** informar ao ChromeDriver o mesmo `--user-data-dir` usado pelo Electron em `POLYGON_USER_DATA_DIR`. O log anterior mostrou o driver procurando no diretório temporário e o arquivo `DevToolsActivePort` sendo gravado no perfil da POC.
- **Sessão:** conectar o WDIO diretamente ao ChromeDriver oficial do Electron 44.4.3, com `browserName: chrome`, protocolo clássico e executável Electron explícito. O serviço Electron não é usado na suíte POC; a tentativa com ele registrou timeout da bridge e bloqueio no ciclo de reinício. APIs do processo principal não fazem parte destes testes.
- **Versão:** informar a versão 152.0.7977.130 obtida do ChromeDriver oficial baixado para este Electron, evitando que o WDIO tente consultar `--version` no aplicativo empacotado. Isso não abre o Chrome comum: as janelas testadas usam a origem `poligonos://app/`.
- **Janelas:** preservar os tamanhos definidos pela aplicação na abertura, reinício e separação. Este Electron rejeita o redimensionamento WebDriver com `Browser.getWindowForTarget`. Os gestos continuam usando dimensões/coordenadas reais do mapa.
- **D01:** reconsultar o seletor `.is-selected` a cada leitura. Os rótulos preservam seus nós ao trocar a seleção; o matcher anterior continuava lendo o Polígono 2. A captura mostrou o Polígono 1 selecionado, coerente com o CSS e com a reutilização do elemento observada na implementação. Continua sendo obrigatório haver exatamente um rótulo selecionado com o nome esperado; não há repetição de cliques, estado injetado ou expectativa afrouxada.

**Medição desta revalidação:** soma dos 13 testes **61,96 s**; comando da suíte **1 min 5,99 s**; build **6,00 s**; total com build e geração dos relatórios **1 min 12,25 s**. [Medições brutas](../../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/timing.json). São tempos da última execução completa, sem incluir as tentativas de diagnóstico. Como apenas uma ferramenta foi reexecutada, o percentual desta revalidação fica “—”; a matriz comparativa original conserva os percentuais anteriores.

**Ainda há seis falhas no consolidado:** C10 mouse/web nas três ferramentas (bug intencional), C08 Playwright/web e D01 WDIO/web/PWA. Nesta etapa, nenhum dos 13 testes Electron ficou sem execução e os quatro cenários de duas janelas passaram. Esses resultados novos substituem somente a célula WDIO/Electron.

Histórico de antes desta correção: [completo](RELATORIO-2026-10-19-ANTES-CORRECAO-WDIO-ELECTRON.md) · [direto](RELATORIO-DIRETO-2026-10-19-ANTES-CORRECAO-WDIO-ELECTRON.md).

**Falhas na revalidação:**

Nenhuma falha nas suítes reexecutadas.

### Tentativas anteriores preservadas

Estes registros pertencem à investigação e às execuções anteriores ao último ajuste. Não entram de novo na contagem consolidada e não foram usados para escolher o melhor tempo.

| Tentativa | Resultado registrado | Soma dos testes | Evidência |
| --- | --- | --- | --- |
| Após corrigir apenas o perfil: 6 passaram; C07 falhou no redimensionamento; tentativa interrompida, restantes não executados | 6 passaram; 1 falharam | 94,92 s | [JSON](../../../test-results/pocs/wdio-electron-fix-2026-10-19/validation/electron/webdriverio/results.json) |
| Conexão direta, antes da espera de seleção: suíte completa 12/13; D01 falhou no matcher do rótulo | 12 passaram; 1 falharam | 66,08 s | [JSON](../../../test-results/pocs/wdio-electron-fix-2026-10-19/complete/electron/webdriverio/results.json) |

### Evidências e limites do diagnóstico

A reprodução original não criou sessão: [log WDIO](../../../test-results/pocs/wdio-electron-fix-2026-10-19/before.log) · [ChromeDriver detalhado](../../../test-results/pocs/wdio-electron-fix-2026-10-19/chromedriver-before.log) · [arquivo de porta no perfil da POC](../../../test-results/pocs/wdio-electron-fix-2026-10-19/DevToolsActivePort-before.txt). A tentativa com o serviço registrou `Browser.getWindowForTarget` e timeout da bridge: [log](../../../test-results/pocs/wdio-electron-fix-2026-10-19/validation/electron/webdriverio.log). A primeira conexão direta foi interrompida na detecção automática de versão, sem iniciar os testes: [log](../../../test-results/pocs/wdio-electron-fix-2026-10-19/verified/electron/webdriverio.log) · [tempos](../../../test-results/pocs/wdio-electron-fix-2026-10-19/verified/timing.json). Uma tentativa de build posterior parou no TypeScript da consulta assíncrona de quantidade; esse erro foi corrigido antes da última suíte: [log de build](../../../test-results/pocs/wdio-electron-fix-2026-10-19/final/electron/build.log).

A tentativa completa anterior ao ajuste de D01 está preservada com 12 aprovações e uma falha. Sua captura do mapa mostra o Polígono 1 em destaque e o fundo com **403 / Access blocked** do OpenStreetMap: [captura](../../../test-results/pocs/wdio-electron-fix-2026-10-19/complete/electron/webdriverio/D01-sincroniza-sele-o-cria-o-edi-o-cancelamento-e-exclus-o-em-duas-janelas-window-1.png). O bloqueio dos tiles é uma dependência externa observada, sem demonstrar causa da divergência do matcher. A aplicação e o provedor não foram alterados.

Fontes de integração: [WebDriver e Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#using-the-webdriver-interface) · [serviço Electron do WDIO](https://webdriver.io/docs/desktop-testing/electron/). A escolha de conectar diretamente ao ChromeDriver é a adaptação desta POC; ela não avalia a bridge do processo principal nem representa ausência de suporte do serviço Electron.

### Testes individuais reexecutados

**WebdriverIO/Electron** — encerrada em 2026-10-19T12:03:02.733Z.

| Teste | Resultado | Duração | Observação |
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

### Dados originais preservados

As seções seguintes descrevem a rodada comparativa anterior às correções. Seus resultados, tempos individuais, total contínuo e evidências foram preservados para comparação. A situação atual das combinações reexecutadas está acima.


## Resumo da rodada original

Nova rodada das 12 combinações, sem importar resultados anteriores. Execução encerrada.

| Ferramenta | Plataforma | O que foi executado/previsto | Resultado | Soma dos testes | Tempo da suíte/comando | Aumento sobre o menor tempo da plataforma |
| --- | --- | --- | --- | --- | --- | --- |
| Playwright | Web | 15 registros / 15 previstos; 4 testes de duas janelas previstos | 13 passaram; 2 falharam | 86,46 s | 1 min 30,37 s | 0,00% |
| Playwright | PWA instalado | 13 registros / 13 previstos; 4 testes de duas janelas previstos | ✅ Funcionou: 13/13 | 78,50 s | 1 min 19,55 s | 0,00% |
| Playwright | Electron | 13 registros / 13 previstos; 4 testes de duas janelas previstos | ✅ Funcionou: 13/13 | 61,74 s | 1 min 2,55 s | 0,00% |
| Playwright | APK Android | 9 registros / 9 previstos | ✅ Funcionou: 9/9 | 325,92 s | 5 min 26,90 s | 0,00% |
| Selenium | Web | 15 registros / 15 previstos; 4 testes de duas janelas previstos | 14 passaram; 1 falhou | 106,14 s | 1 min 47,99 s | 19,49% |
| Selenium | PWA instalado | 13 registros / 13 previstos; 4 testes de duas janelas previstos | ✅ Funcionou: 13/13 | 99,22 s | 1 min 41,03 s | 27,00% |
| Selenium | Electron | 13 registros / 13 previstos; 4 testes de duas janelas previstos | ✅ Funcionou: 13/13 | 80,14 s | 1 min 20,58 s | 28,82% |
| Selenium | APK Android | 9 registros / 9 previstos | ✅ Funcionou: 9/9 | 493,86 s | 8 min 14,45 s | 51,25% |
| WebdriverIO | Web | 15 registros / 15 previstos; 4 testes de duas janelas previstos | 13 passaram; 2 falharam | 141,86 s | 2 min 26,20 s | 61,78% |
| WebdriverIO | PWA instalado | 13 registros / 13 previstos; 4 testes de duas janelas previstos | 12 passaram; 1 falhou | 90,51 s | 1 min 39,28 s | 24,80% |
| WebdriverIO | Electron | 0 registros / 13 previstos; 4 testes de duas janelas previstos | ⛔ Não foi possível criar/concluir a sessão | — | 2 min 5,20 s | — |
| WebdriverIO | APK Android | 9 registros / 9 previstos | ✅ Funcionou: 9/9 | 438,36 s | 7 min 29,93 s | 37,63% |

**Aumento sobre o menor tempo da plataforma:** (tempo da suíte ÷ menor tempo elegível − 1) × 100; 0% identifica a referência desta rodada. A comparação usa suítes com todos os casos registrados, mesmo com falhas; sessões sem execução completa ficam com “—”. Falhas podem abreviar cenários ou adicionar timeouts, e o isolamento difere entre ferramentas: o percentual é descritivo, não um benchmark de desempenho.

**131 aprovados, 6 falhas e 13 sem validação concluída**, de 150 casos previstos.

3 falhas detectam o defeito intencional de C10 mouse; 3 são outras falhas de execução/asserção, detalhadas abaixo. Não significam automaticamente defeitos no aplicativo.

Duas janelas: **30 aprovados, 2 falhas e 4 sem validação concluída**, de 36 casos previstos em web/PWA/Electron. Android não participa dessa contagem.

Os testes de duas janelas fazem parte das suítes completas web, PWA e Electron. O APK usa C01–C09 com controles de toque; separar mapa e instalar o PWA não se aplicam ao app Android. C10 mouse continua detectando o defeito intencional de instalação na web, e C10 touch exige um toque confiável.

No Android, C03 inicia edição pelo botão e C08 usa os controles de exclusão; os atalhos físicos Enter/Delete não são exercitados. Falhas antes da última etapa não validam o restante do cenário.

## Tempos por plataforma

| Plataforma | Build | Preparação externa | Suítes/comandos | Limpeza externa | Total da plataforma |
| --- | --- | --- | --- | --- | --- |
| Web | — | — | 5 min 44,57 s | — | 5 min 44,90 s |
| PWA instalado | — | — | 4 min 39,86 s | — | 4 min 40,21 s |
| Electron | 6,80 s | — | 4 min 28,33 s | — | 4 min 35,55 s |
| APK Android | 4,39 s | 27,92 s | 21 min 11,28 s | 1,65 s | 21 min 46,06 s |

**Tempo total medido da rodada:** 36 min 46,72 s. **Início:** 2026-10-19T10:42:07.622Z. **Fim:** 2026-10-19T11:18:54.551Z.

O total da plataforma inclui build, preparação, suítes, limpeza e geração intermediária dos relatórios. No Android, preparação externa agrupa boot/estabilização do emulador, instalação inicial do APK e início/espera do Appium. Preparação feita pela própria ferramenta, inclusive novas sessões e instalação/lançamento do PWA, fica dentro de suíte/comando. “—” indica etapa não aplicável ou medição indisponível, não zero. O total contínuo da rodada não inclui as investigações anteriores. [Medição por etapa](../../../test-results/pocs/final-2026-10-19/timing.json).

## Como interpretar os tempos

**Soma dos testes** soma as durações individuais, incluindo casos que falharam. **Tempo da suíte/comando** mede o intervalo observado pelo orquestrador ao executar a ferramenta: inclui inicialização do processo, sessões, testes e encerramento dentro desse comando. Quando a sessão falha antes dos testes, mede somente essa tentativa de preparação. Essas duas colunas excluem as etapas externas, medidas separadamente na tabela por plataforma quando disponíveis.

Somando os comandos das suítes Android: **21 min 11,28 s**, sem build, preparação e limpeza externos. Os resultados vêm desta nova rodada sequencial.

Playwright abre uma sessão/app por teste; Selenium também cria sessões por teste, incluindo Appium no Android; WebdriverIO compartilha a sessão entre casos e limpa dados pela interface. Há esperas fixas, esperas condicionais, gestos e custos de conexão diferentes. Falhas podem encurtar um cenário antes de suas últimas etapas ou alongá-lo até um timeout. Portanto, as durações descrevem estas implementações e **não permitem concluir qual ferramenta é mais rápida**. “—” indica ausência de medição, não duração zero. Uma falha na preparação ou em uma pré-condição não comprova defeito na funcionalidade do título.

Uma execução por suíte, em sequência e com um worker; sem repetição manual para escolher o melhor resultado. Retentativas internas de conexão dos drivers podem integrar o tempo. Os testes e as expectativas foram mantidos durante a rodada. A medição externa registra os comandos sem alterar os critérios de aprovação. Build local pode aproveitar cache. Recursos do mapa, rede, perfil, teclado e emulador podem influenciar. Uma rodada não mede dispersão ou frequência de intermitência e não é benchmark do tempo de resposta do app.

C10 usa o caminho de instruções de instalação: a fixture impede que uma oferta nativa beforeinstallprompt chegue ao app e verifica o clique/toque confiável no diálogo de fallback. Não automatiza o prompt nativo de instalação. A instalação real e o modo standalone são verificados nas suítes da plataforma PWA, em perfis isolados.

Web/PWA acessam o deploy https://poc-e2e.chiquetano.com.br/; não houve build ou novo deploy web nesta rodada. As builds locais de Electron e APK estão medidas separadamente.

## Falhas desta rodada

- **Playwright/Web — C08 confirma e cancela exclusões por Delete, individuais e de todos:** O aviso de exclusão esperado após Delete não apareceu. O cenário não avançou para as demais confirmações; causa não determinada. Error: expect(locator).toContainText(expected) failed  Locator: locator('#map-instructions') Expected substring: "Polígono apagado nesta edição" Received string:    "Modo de edição ativo: altere o nome ou arraste vértices e arestas. Use “Concluir edição” para salvar." Timeout: 10000ms  Call log:   - Expect "toContainText" locator('#map-instructions') with timeout 10000ms   - waiting for locator('#map-instructions')     24 × locator resolved to &lt;p id="map-instructions"&gt;Modo de edição ativo: altere o nome ou arraste vé…&lt;/p&gt;        - unexpected value "Modo de edição ativo: altere o nome ou arraste vértices e arestas. Use “Concluir ed [Log](../../../test-results/pocs/final-2026-10-19/web/playwright.log).
- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** Defeito intencional detectado: clique não abriu as instruções de instalação. A falha continua contada. [Log](../../../test-results/pocs/final-2026-10-19/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** Defeito intencional detectado: clique não abriu as instruções de instalação. A falha continua contada. [Log](../../../test-results/pocs/final-2026-10-19/web/selenium.log).
- **WebdriverIO/Web — D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas:** Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" [Log](../../../test-results/pocs/final-2026-10-19/web/webdriverio.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** Defeito intencional detectado: clique não abriu as instruções de instalação. A falha continua contada. [Log](../../../test-results/pocs/final-2026-10-19/web/webdriverio.log).
- **WebdriverIO/PWA instalado — D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas:** Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" [Log](../../../test-results/pocs/final-2026-10-19/pwa/webdriverio.log).
- **WebdriverIO/Electron — Preparação:** A ferramenta encerrou sem produzir relatório. DevToolsActivePort ausente; a sessão Electron não foi criada. Os cenários sem registro não foram executados. [Log](../../../test-results/pocs/final-2026-10-19/electron/webdriverio.log).

## Portabilidade

### O que foi reaproveitado nesta POC

As três POCs têm **implementações de testes independentes**. Foram reaproveitados o plano e os critérios funcionais; o código que opera a interface foi escrito para cada ferramenta. Não há um teste de WebdriverIO sendo executado por Playwright ou Selenium, nem conversão automática entre eles.

| Camada | Como ficou nesta POC | Evidência no projeto |
| --- | --- | --- |
| Catálogo e critérios | Mesmos IDs C01–C10 e D01–D03, títulos e expectativas de negócio. C10 tem duas entradas e D02 duas variações. | [Catálogo e contratos](../shared/fixtures.ts), [plano](../README.md). |
| Seletores e dados comuns | Seletores `data-testid`/CSS, triângulo inicial, viewport, tipos de coordenadas e configuração de ambiente compartilhados. Alguns dados, como listas de nomes inválidos, continuam escritos em cada suíte. | [Fixtures compartilhadas](../shared/fixtures.ts). |
| Infraestrutura | Instalação/lançamento do PWA, conexão CDP, obtenção de ChromeDriver do Electron, capabilities Android e orquestração têm módulos compartilhados. Isso não substitui os gestos de cada ferramenta. | [PWA](../shared/pwa.ts), [conexão Chrome](../shared/chrome-pipe.ts), [Electron](../shared/electron.ts), [Android](../shared/android.ts), [orquestrador](../../../scripts/run-pocs.mjs). |
| Leitura do app | Mesmo contrato auxiliar de coordenadas, persistência, prontidão e contagem de vértices. Não injeta polígonos nem altera resultados para aprovar testes. | `polygonTestApi`, disponível na build E2E. |
| Execução da interface | Cliques, preenchimento, desenho, arraste, esperas, asserções e troca entre janelas implementados separadamente. Helpers como `create`, `deselect` e `confirmName` existem em cada suíte, com assinaturas/implementações próprias. | [Playwright](../playwright/web.spec.ts), [Selenium](../selenium/web.test.ts), [WebdriverIO](../webdriverio/web.e2e.ts). |
| Sessões e evidências | Hooks, reinício/persistência, captura de screenshots, trace e gravação do resultado adaptados ao runner. As durações individuais vêm de pontos de medição diferentes. | [Fixtures Playwright](../playwright/fixtures.ts), [reporter](../playwright/reporter.ts), [Selenium](../selenium/web.test.ts), [configuração WDIO](../../../wdio.poc.conf.ts). |

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
| Electron | Lança app/perfil por teste; C07 fecha e reabre o mesmo perfil. | Inicia ChromeDriver/app/perfil por teste; C07 reinicia. | Configurado para sessão compartilhada; a tentativa de inicialização pode impedir os corpos dos cenários de rodar. |
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


## Limites e aprendizados

### Aprendizados das rodadas anteriores

Esta seção registra a análise da revalidação anterior. Os resultados da rodada atual estão na matriz e na lista de falhas do relatório; os episódios abaixo não são contados novamente como falhas atuais.

O resultado funcional deveria convergir para o mesmo app, estado e interação. Os cenários têm os mesmos objetivos, mas seus adaptadores não reproduzem exatamente a mesma sequência e duração de eventos. Selenium e WebdriverIO usam Appium no Android; Playwright conecta diretamente à WebView via sua API Android e usa CDP nos gestos do mapa. Os métodos de preenchimento, rolagem, esperas e isolamento também diferem. Isso limita a comparação atual.

| Falha observada | O que a evidência comprova | O que ainda não foi comprovado |
| --- | --- | --- |
| Playwright/Android — C03 | Antes de testar seleção, chegaram três eventos de toque confiáveis ao mapa; a consulta de desenho confirmou dois vértices, mesmo após a espera de 5 s. A criação inicial não terminou. | A causa do vértice ausente: pode envolver entrega/processamento do gesto, estado do SDK ou comportamento do app. Não há evidência suficiente para atribuir a falha exclusivamente ao Playwright ou ao aplicativo. |
| WebdriverIO/Android — C05 | O campo indicou nome vazio/inválido. Após o gesto de concluir, o aviso do topo permaneceu sem `role="alert"`. A suíte parou nessa verificação, antes dos nomes válidos e do limite de caracteres. Esse caso havia passado na tentativa anterior. | Não foi confirmado se o toque acionou o handler de concluir. Mudanças de posição ao rolar/fechar o teclado e uma divergência do app são hipóteses; não houve telemetria suficiente do botão para distinguir essas causas. |

O 9/9 do Selenium confirma que os cenários passaram naquela execução. Não prova que o app esteja livre de problemas intermitentes nem que os outros resultados sejam falsos positivos. **As duas falhas restantes estão inconclusivas quanto à causa**, apesar de suas asserções terem falhado. A falha anterior de C08 no WebdriverIO era uma transição não aguardada pela automação: o mapa faz `hitTest` assíncrono; depois de esperar o botão voltar ao modo de criação, a suíte completa passou por C08.

As diferenças podem ser verificadas nos adaptadores de [Playwright](../playwright/web.spec.ts), [Selenium](../selenium/web.test.ts) e [WebdriverIO](../webdriverio/web.e2e.ts). Para uma comparação de confiabilidade, falta igualar a política de isolamento e os contratos de gestos/esperas, registrar alvo/coordenadas/viewport e acionamento do botão, e repetir os cenários com o mesmo APK e emulador. Isso permitiria medir frequência de falhas, além do resultado de uma execução. A rodada comparativa de métricas repetiu as suítes existentes, sem normalizar essas diferenças entre adaptadores. A revalidação posterior do Selenium/Playwright ajusta alguns gestos e esperas; seus novos tempos são apresentados separadamente.

### Limitações por ferramenta em Electron e Android

“Documentada” indica uma restrição da integração; “observada” descreve esta POC e não uma incapacidade geral da ferramenta.

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | **Documentada:** integração `_electron` experimental; o lançamento depende de configuração compatível com inspeção Node. Diálogos nativos do sistema não são tratados como elementos da página. **Escopo da POC:** app macOS empacotado e duas janelas; instalador e diálogos nativos não avaliados. [Documentação Electron](https://playwright.dev/docs/api/class-electron). | **Documentada:** API Android experimental, voltada a Chrome/WebView; requer ADB. Há limitações de cobertura e captura exige dispositivo acordado. **Observada:** esta POC exercita a WebView do Capacitor; reconexão após reiniciar o app exigiu esperar o PID correto. C03 ficou inconclusivo na revalidação anterior. [Documentação Android](https://playwright.dev/docs/api/class-android). |
| Selenium | **Integração:** usa ChromeDriver e o executável do Electron, com configuração própria. Controlar a página não fornece automaticamente automação de menus/diálogos do sistema ou das APIs do processo principal. **Observada:** redimensionar por WebDriver falhou em `Browser.getWindowForTarget`; o bootstrap passou a usar o tamanho original. [Guia do Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium). | **Integração:** nesta POC, Selenium é o cliente de Appium/UiAutomator2; Selenium sozinho não é o driver do APK. Precisa de WebView depurável, contexto correto e ChromeDriver compatível. **Observada:** `browserName` precisou ficar vazio para abrir o app; a rotina genérica de esconder teclado enviava Escape e interrompia a edição. O ajuste atual consulta o teclado e envia somente Back nativo quando o IME está aberto, sem trocar/recriar o contexto WebView; também aguarda geometria estável e entrega do clique confiável. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |
| WebdriverIO | **Integração atual da POC:** WDIO conecta diretamente ao ChromeDriver oficial compatível, abrindo o binário Electron por WebDriver clássico. O serviço Electron continua sendo uma opção da ferramenta, mas seus hooks de bridge/foco não são usados nesta suíte. **Diagnóstico:** `DevToolsActivePort` era gravado no perfil definido pelo app e procurado em outro pelo driver; os diretórios agora coincidem. A versão é explícita para evitar a consulta `--version` ao app empacotado. **Limites:** usa os tamanhos definidos pelo app, sem `Browser.getWindowForTarget`; não automatiza APIs do processo principal ou diálogos nativos. O catálogo e as asserções funcionais foram preservados; a espera do D01 reconsulta o rótulo selecionado a cada leitura, pois os nós são reutilizados. [Serviço Electron](https://webdriver.io/docs/desktop-testing/electron/). | **Integração:** também usa Appium/UiAutomator2 e ChromeDriver para a WebView; compartilha essas dependências com Selenium. **Observada:** reutiliza a sessão entre casos; rolagem, teclado e a espera pela desseleção precisam ser coordenados. C08 passou após o ajuste na revalidação anterior; C05 variou entre tentativas. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |

A documentação atual do WebdriverIO apresenta `@wdio/electron-service`; o projeto mantém `wdio-electron-service` 9.2.1 para a configuração legada. A suíte POC passou a conectar diretamente ao ChromeDriver, sem atualizar dependências. A diferença entre nomes/versões de pacotes não foi comprovada como causa do problema; o desencontro de perfis foi confirmado no log. Apenas WDIO/Electron foi revalidado nesta etapa; resultados anteriores de web/PWA não foram substituídos. [Configuração documentada](https://webdriver.io/docs/desktop-testing/electron/).

**Limites comuns desta execução:** Electron foi avaliado apenas no macOS arm64; Android apenas no AVD Pixel_8, com APK de debug e WebView depurável. Não foram avaliados aparelho físico, APK release sem depuração, plugins nativos do Capacitor, permissões do sistema, outras versões de Android/WebView ou o carregamento visual de todos os tiles do mapa de fundo. As verificações do mapa se concentram nas geometrias, rótulos, controles e estados descritos nos cenários. Os testes de duas janelas verificam sincronização, sem posicionamento em dois monitores físicos. A ausência de duas janelas e de Enter/Delete no APK corresponde ao escopo deste app/testes, não a uma limitação geral das ferramentas.


## Etapas, builds e ambiente

- **Implementação de duas telas:** Implementados e integrados nas suítes completas de web, PWA instalado e Electron; quatro testes por ferramenta. Android não oferece separar mapa.
- **Web:** Execução concluída: 40 passaram, 5 falharam; 0 com outro status. Consulte os detalhes abaixo.
- **PWA:** Execução concluída: 38 passaram, 1 falharam; 0 com outro status. Consulte os detalhes abaixo.
- **Build Electron:** Aplicativo Electron empacotado para o sistema local em release/electron (sem instalador e sem assinatura).
- **Electron:** Execução concluída: 26 passaram, 0 falharam; 0 com outro status. 1 ferramenta(s) sem relatório por falha de infraestrutura. Consulte os detalhes abaixo.
- **Build APK:** APK de debug gerado com sucesso.
- **Android:** Execução concluída: 27 passaram, 0 falharam; 0 com outro status. Consulte os detalhes abaixo.

**Escopo desta rodada:** Rodada final solicitada pelo usuário: executar as 12 combinações uma vez, sem importar resultados anteriores nem alterar testes/expectativas durante a execução. Os 27 testes Android passaram. WDIO/Electron não criou sessão e deixou 13 casos sem execução. Emulador de testes encerrado após a limpeza.

**Histórico preservado:** [relatório completo anterior](RELATORIO-2026-10-19-ANTES-RODADA-FINAL.md) · [versão direta anterior](RELATORIO-DIRETO-2026-10-19-ANTES-RODADA-FINAL.md). Os resultados anteriores não entram nas contagens desta rodada.

**Ambiente:** macOS 15.3 arm64; Node v24.11.0; Chrome 155.0.8059.82; @playwright/test 1.63.0; selenium-webdriver 4.51.0; webdriverio 9.31.9; electron 44.4.3; appium 3.8.0; appium-uiautomator2-driver 8.7.0; wdio-electron-service 9.2.1. APK debug no AVD Pixel_8; Web/PWA no deploy https://poc-e2e.chiquetano.com.br/; Electron empacotado para macOS arm64. Android 16 / API 36; Current WebView package (name, version): (com.google.android.webview, 133.0.6943.137).

**Ordem:** plataformas web → pwa → electron → android; ferramentas playwright → selenium → webdriverio em cada plataforma. Medições em uma rodada contínua e sequencial.

Comando usado nesta rodada (a partir da raiz do projeto):

```bash
POC_FRAMEWORKS=playwright,selenium,webdriverio POC_RESULTS_DIR=test-results/pocs/final-2026-10-19 npm run test:poc:all
```

**Artefatos:** Electron em `release/electron/` e APK em `android/app/build/outputs/apk/debug/app-debug.apk`. Logs das builds: [Electron](../../../test-results/pocs/final-2026-10-19/electron/build.log) · [APK](../../../test-results/pocs/final-2026-10-19/android/build.log).

O PWA foi instalado em perfil de automação e teve `display-mode: standalone` verificado. O Electron foi empacotado para macOS, sem instalador Windows. Duas janelas simultâneas foram usadas; não foi avaliado o posicionamento em dois monitores físicos. A API auxiliar lê coordenadas, prontidão e quantidade de vértices e aguarda a persistência; os desenhos e edições usam gestos das ferramentas. Ambiente web/PWA: https://poc-e2e.chiquetano.com.br/.

## Playwright

### Web

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/web/playwright/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/web/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 4,41 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,13 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,15 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 5,00 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,41 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,76 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,24 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ❌ Falhou | 14,38 s | Error: expect(locator).toContainText(expected) failed  Locator: locator('#map-instructions') Expected substring: "Polígono apagado nesta edição" Received string:    "Modo de edição ativo: altere o nome ou arraste vértices e arestas. Use “Concluir edição” para salvar." Timeout: 10000ms  Call log:   - Expect "toContainText" locator('#map-instructions') with timeout 10000ms   - waiting for locator('#map-instructions')     24 × locator resolved to &lt;p id="map-instructions"&gt;Modo de edição ativo: altere o nome ou arraste vé…&lt;/p&gt;        - unexpected value "Modo de edição ativo: altere o nome ou arraste vértices e arestas. Use “Concluir ed |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,42 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,62 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 1,46 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,68 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,31 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,33 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,17 s | Verificações concluídas. |

### PWA instalado

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/pwa/playwright/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/pwa/playwright.log)

| Teste | Resultado | Duração | Observação |
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

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/electron/playwright/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/electron/playwright.log)

| Teste | Resultado | Duração | Observação |
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

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/android/playwright/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/android/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 19,60 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 32,62 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 31,88 s | Seleciona sem editar e entra na edição pelo botão; Enter físico não exercitado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 38,54 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 39,85 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 28,42 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 33,92 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 63,21 s | Exclusões pelos controles da interface; Delete físico não exercitado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 37,89 s | Verificações concluídas. |

## Selenium

### Web

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/web/selenium/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/web/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,66 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 7,51 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 6,54 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,96 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,39 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,19 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,82 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 9,27 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,09 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 12,21 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 2,15 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 12,75 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 6,71 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 7,50 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 8,40 s | Verificações concluídas. |

### PWA instalado

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/pwa/selenium/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/pwa/selenium.log)

| Teste | Resultado | Duração | Observação |
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

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/electron/selenium/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/electron/selenium.log)

| Teste | Resultado | Duração | Observação |
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

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/android/selenium/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/android/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 28,09 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 44,17 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 43,30 s | Seleciona sem editar e entra na edição pelo botão; Enter físico não exercitado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 51,63 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 95,16 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 46,66 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 55,26 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 85,03 s | Exclusões pelos controles da interface; Delete físico não exercitado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 44,57 s | Verificações concluídas. |

## WebdriverIO

### Web

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/web/webdriverio/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/web/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 7,57 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 11,22 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 7,05 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 9,30 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 8,74 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,76 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 8,37 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 11,45 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 7,03 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,83 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 3,36 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 17,11 s | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 12,50 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 9,99 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 10,61 s | Verificações concluídas. |

### PWA instalado

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/pwa/webdriverio/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/pwa/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,97 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 8,66 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 5,90 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 7,83 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 7,02 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 6,29 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 7,30 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,25 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 4,41 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 14,10 s | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,55 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,55 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,69 s | Verificações concluídas. |

### Electron

⛔ A ferramenta encerrou sem produzir relatório. ChromeDriver não encontrou DevToolsActivePort; a sessão Electron não foi criada. [Log](../../../test-results/pocs/final-2026-10-19/electron/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C05 valida nomes, acentos e limite de trinta caracteres | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C06 cancela alterações de nome e geometria | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |

### APK Android

[JSON com durações e evidências](../../../test-results/pocs/final-2026-10-19/android/webdriverio/results.json) · [Log completo](../../../test-results/pocs/final-2026-10-19/android/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 20,65 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 40,10 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 33,79 s | Seleciona sem editar e entra na edição pelo botão; Enter físico não exercitado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 47,14 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 84,78 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 40,89 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 49,68 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 80,62 s | Exclusões pelos controles da interface; Delete físico não exercitado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 40,72 s | Verificações concluídas. |
