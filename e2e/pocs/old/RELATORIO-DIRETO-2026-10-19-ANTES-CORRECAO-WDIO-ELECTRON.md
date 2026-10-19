# Histórico — Relatório direto das POCs E2E

> **RELATÓRIO HISTÓRICO — RESULTADOS SUBSTITUÍDOS.** Os números abaixo descrevem a rodada indicada neste arquivo. Para a situação vigente, consulte o [relatório completo atual](../RELATORIO.md), a [versão direta atual](../RELATORIO-DIRETO.md) ou o [status atual](../STATUS.md).

[Relatório completo](RELATORIO-2026-10-19-ANTES-CORRECAO-WDIO-ELECTRON.md). Resultados: `../../../test-results/pocs/final-2026-10-19`. Rodada encerrada.

## Sumário

- [Resumo](#resumo)
- [Tempos por plataforma](#tempos-por-plataforma)
- [Falhas e impedimentos](#falhas-e-impedimentos)
- [Portabilidade](#portabilidade)
- [Limites](#limites)
- [Detalhamento omitido](#detalhamento-omitido)

## Resumo

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

**Tempo total da rodada:** 36 min 46,72 s. Intervalo (UTC): 2026-10-19T10:42:07.622Z → 2026-10-19T11:18:54.551Z. “Suíte/comando” inclui processo e sessões internos; o total da plataforma acrescenta build/preparação/limpeza externos e geração intermediária dos relatórios. Preparação Android inclui boot, instalação inicial do APK e Appium. “—” não significa zero. [Medições brutas](../../../test-results/pocs/final-2026-10-19/timing.json).

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

Esta versão não lista as 150 linhas originais nem as linhas individuais das revalidações com suas durações, erros completos, screenshots/traces, exemplos de código de migração, inventário de arquivos compartilhados ou histórico dos ajustes. A [versão completa](RELATORIO-2026-10-19-ANTES-CORRECAO-WDIO-ELECTRON.md) mantém esses detalhes e links para evidências.

Histórico preservado: [completo anterior](RELATORIO-2026-10-19-ANTES-RODADA-FINAL.md) · [direto anterior](RELATORIO-DIRETO-2026-10-19-ANTES-RODADA-FINAL.md). Esta rodada usa somente os resultados novos.
