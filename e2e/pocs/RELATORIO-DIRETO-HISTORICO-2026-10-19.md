# Relatório direto das POCs E2E

> **Arquivo histórico.** Contém resultados substituídos. Consulte o [relatório atual](RELATORIO.md) para a situação vigente.

[Relatório completo](RELATORIO-HISTORICO-2026-10-19.md). Resultados: `../../test-results/pocs/final-2026-10-19`. Rodada encerrada.

## Sumário

- [Revalidação após correções](#revalidação-após-correções)
- [Resumo da rodada original](#resumo-da-rodada-original)
- [Tempos por plataforma](#tempos-por-plataforma)
- [Falhas e impedimentos](#falhas-e-impedimentos)
- [Portabilidade](#portabilidade)
- [Limites](#limites)
- [Detalhamento omitido](#detalhamento-omitido)

## Revalidação após correções

Revalidação web nas três ferramentas e WDIO/PWA em 19/10/2026; preservada a revalidação anterior WDIO/Electron. **Resultado mais recente consolidado: 147 aprovações, 3 falhas e 0 sem validação concluída**, de 150 casos. Combina as suítes reexecutadas abaixo com os resultados originais das demais combinações; não é uma nova rodada das 12 combinações.

| Ferramenta | Web | PWA instalado | Electron | Android |
| --- | --- | --- | --- | --- |
| Playwright | 14/15; 1 falha(s) (revalidado) | 13/13 | 13/13 | 9/9 |
| Selenium | 14/15; 1 falha(s) (revalidado) | 13/13 | 13/13 | 9/9 |
| WebdriverIO | 14/15; 1 falha(s) (revalidado) | 13/13 (revalidado) | 13/13 (revalidado) | 9/9 |

As células marcadas como revalidadas usam a nova execução; as demais preservam a rodada original.

**Reexecutado após as alterações:** 68 aprovações, 3 falhas e 0 sem validação concluída. Cada linha é uma suíte completa, com os testes de duas janelas integrados quando aplicáveis.

Duas janelas: 20 aprovações e 0 falhas nas suítes reexecutadas; consolidado mais recente de 36 aprovações, 0 falhas e 0 sem validação, de 36 previstos.

| Ferramenta | Plataforma | Resultado atual | Soma dos testes | Tempo da nova suíte | Aumento na revalidação | Evidências |
| --- | --- | --- | --- | --- | --- | --- |
| Playwright | Web | 14 passaram; 1 falharam; 0 sem validação | 76,30 s | 1 min 18,49 s | 0,00% | [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log) |
| Selenium | Web | 14 passaram; 1 falharam; 0 sem validação | 106,18 s | 1 min 48,04 s | 37,65% | [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log) |
| WebdriverIO | Web | 14 passaram; 1 falharam; 0 sem validação | 132,71 s | 2 min 16,55 s | 73,97% | [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log) |
| WebdriverIO | PWA instalado | 13 passaram; 0 falharam; 0 sem validação | 87,37 s | 1 min 35,74 s | — | [JSON](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio.log) |
| WebdriverIO | Electron | 13 passaram; 0 falharam; 0 sem validação | 61,96 s | 1 min 5,99 s | — | [JSON](../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio/results.json) · [Log](../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio.log) |

**Comparação de tempos:** o aumento na tabela acima usa somente as ferramentas reexecutadas na mesma plataforma; “—” indica que só uma ferramenta foi reexecutada ou não há medição elegível. Os percentuais da matriz original abaixo usam somente a rodada contínua das três ferramentas. Os novos tempos acima pertencem à revalidação; não foram misturados ao total original de 36 min 46,72 s nem usados para recalcular seus percentuais. Os dois grupos aplicam (tempo ÷ menor tempo elegível − 1) × 100.

**Ajustes:** WDIO reconsulta o rótulo selecionado no D01, agora validado em web/PWA. Playwright direciona o Delete ao mapa com clique real no polígono e confirmação de foco. O bug intencional de instalação por mouse permanece.

**Limite:** C08 já passou antes do novo preparo: a causa da intermitência anterior continua inconclusiva. Três verificações isoladas e a suíte completa passaram após o ajuste; isso não mede estabilidade estatística. Nesta etapa foram reexecutados web nas três ferramentas e WDIO/PWA; os demais resultados são anteriores, incluindo a correção WDIO/Electron.

**Resultados desta etapa:** 42/45 na web, com apenas os três C10 mouse intencionais; WDIO/PWA 13/13. Total do orquestrador web: **5 min 23,41 s**; WDIO/PWA: **1 min 35,94 s**, em execução separada. Nenhum teste ficou sem execução. O consolidado passa a ter somente três falhas intencionais; os 36 testes de duas janelas estão aprovados. O WDIO/PWA registrou um aviso de sessão antiga no reinício, sem impedir os 13 testes; a versão completa preserva o log e a limitação.

**Falhas na revalidação:**

- Playwright/Web — C10 mouse deve abrir as instruções de instalação: defeito intencional de instalação continua detectado.
- Selenium/Web — C10 mouse deve abrir as instruções de instalação: defeito intencional de instalação continua detectado.
- WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação: defeito intencional de instalação continua detectado.

A versão completa lista também a duração de cada teste desta revalidação. As seções seguintes preservam a rodada comparativa original, anterior às correções.


## Resumo da rodada original

**131 aprovados, 6 falhas e 13 sem validação concluída**, de 150 casos previstos.

3 falhas detectam o defeito intencional de C10 mouse; 3 são outras falhas de execução/asserção, detalhadas abaixo. Não significam automaticamente defeitos no aplicativo.

Alvo web/PWA: https://poc-e2e.chiquetano.com.br/. Builds locais: Electron e APK.

12 combinações; 150 casos previstos: 15 web, 13 PWA, 13 Electron e 9 Android por ferramenta. Esta rodada não importa resultados anteriores.

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

Duas janelas: **30 aprovados, 2 falhas e 4 sem validação concluída**, de 36 casos previstos em web/PWA/Electron. Android não participa dessa contagem.

APK: sem duas janelas/C10; C03 edita pelo botão e C08 usa controles de exclusão. C10 mouse detecta o defeito intencional e permanece falhando; C10 touch deve responder a toque confiável.

## Tempos por plataforma

| Plataforma | Build | Preparação externa | Suítes/comandos | Limpeza externa | Total da plataforma |
| --- | --- | --- | --- | --- | --- |
| Web | — | — | 5 min 44,57 s | — | 5 min 44,90 s |
| PWA instalado | — | — | 4 min 39,86 s | — | 4 min 40,21 s |
| Electron | 6,80 s | — | 4 min 28,33 s | — | 4 min 35,55 s |
| APK Android | 4,39 s | 27,92 s | 21 min 11,28 s | 1,65 s | 21 min 46,06 s |

**Tempo total da rodada:** 36 min 46,72 s. Intervalo (UTC): 2026-10-19T10:42:07.622Z → 2026-10-19T11:18:54.551Z. “Suíte/comando” inclui processo e sessões internos; o total da plataforma acrescenta build/preparação/limpeza externos e geração intermediária dos relatórios. Preparação Android inclui boot, instalação inicial do APK e Appium. “—” não significa zero. [Medições brutas](../../test-results/pocs/final-2026-10-19/timing.json).

Uma tentativa por suíte, sequencial, um worker. Playwright/Selenium isolam/criam sessões por teste; WDIO compartilha sessão e limpa pela interface. Gestos/esperas diferem e falhas podem encurtar casos ou atingir timeout. São métricas destas implementações, sem ranking de velocidade ou medição de confiabilidade estatística. Builds podem aproveitar cache.

## Falhas e impedimentos

- **Playwright/Web — C08:** O aviso de exclusão após Delete não apareceu; etapas seguintes não concluídas; causa inconclusiva.
- **Playwright/Web — C10 mouse:** Defeito intencional detectado: clique não abriu as instruções de instalação.
- **Selenium/Web — C10 mouse:** Defeito intencional detectado: clique não abriu as instruções de instalação.
- **WebdriverIO/Web — D01:** Seleção divergente entre janelas: esperado Polígono 1, recebido Polígono 2; caso não concluído.
- **WebdriverIO/Web — C10 mouse:** Defeito intencional detectado: clique não abriu as instruções de instalação.
- **WebdriverIO/PWA instalado — D01:** Seleção divergente entre janelas: esperado Polígono 1, recebido Polígono 2; caso não concluído.
- **WebdriverIO/Electron — Preparação:** Sessão não criada: DevToolsActivePort ausente; 13 casos não executados.

Falha antes da última etapa não valida o restante do cenário. As causas não diagnosticadas permanecem inconclusivas.

## Portabilidade

Na construção da POC, o plano foi compartilhado e a execução adaptada por ferramenta. Esta rodada executou os cenários existentes com medição externa; testes e expectativas foram mantidos durante a execução.

- **Reaproveitado:** catálogo/critérios dos cenários, seletores, parte dos dados, contratos auxiliares e infraestrutura PWA/ChromeDriver/capabilities.
- **Reescrito por ferramenta:** corpo dos testes, gestos, esperas, asserções, sessões, janelas e evidências. Não houve conversão automática nem executor universal.
- **Entre plataformas:** boa parte do cenário é mantida dentro da própria ferramenta, com adaptadores/branches para PWA, Electron e Android.
- **Migração futura:** preservar critérios/dados; adaptar execução; validar paridade de isolamento/gestos antes das métricas. Não foram medidos tempo de desenvolvimento ou percentual de reutilização de código.

## Limites

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | Integração experimental; configuração própria para Electron; diálogos nativos fora dos locators da página. | API experimental; depende de ADB/WebView; esta POC não mede cobertura nativa completa. |
| Selenium | ChromeDriver/executável compatíveis; página não equivale a menus nativos; redimensionamento do bootstrap retirado após erro de protocolo. | Usa Appium/UiAutomator2, WebView depurável e ChromeDriver compatível; sessão por caso nesta POC. |
| WebdriverIO | Serviço Electron/ChromeDriver compatíveis; impedimento de inicialização não significa ausência de suporte. | Usa Appium; sessão compartilhada e coordenação de toque/teclado/rolagem exigem atenção. |

Fontes: [Playwright Electron](https://playwright.dev/docs/api/class-electron), [Playwright Android](https://playwright.dev/docs/api/class-android), [Selenium/Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium), [WDIO/Electron](https://webdriver.io/docs/desktop-testing/electron/), [Appium/WebView](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode).

Escopo: Electron macOS arm64; APK debug em emulador. Não cobre aparelho físico, instaladores, diálogos/permissões do sistema, plugins nativos, carregamento de todos os tiles do mapa de fundo ou posicionamento em dois monitores físicos.

## Detalhamento omitido

Esta versão não lista as 150 linhas originais nem as linhas individuais das revalidações com suas durações, erros completos, screenshots/traces, exemplos de código de migração, inventário de arquivos compartilhados ou histórico dos ajustes. A [versão completa](RELATORIO-HISTORICO-2026-10-19.md) mantém esses detalhes e links para evidências.

Histórico preservado: [completo anterior](RELATORIO-2026-10-19-ANTES-RODADA-FINAL.md) · [direto anterior](RELATORIO-DIRETO-2026-10-19-ANTES-RODADA-FINAL.md). Esta rodada usa somente os resultados novos.
