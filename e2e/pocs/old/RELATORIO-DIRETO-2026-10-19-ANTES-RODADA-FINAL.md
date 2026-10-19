# Histórico — Relatório direto das POCs E2E

> **RELATÓRIO HISTÓRICO — RESULTADOS SUBSTITUÍDOS.** Os números abaixo descrevem a rodada indicada neste arquivo. Para a situação vigente, consulte o [relatório completo atual](../RELATORIO.md), a [versão direta atual](../RELATORIO-DIRETO.md) ou o [status atual](../STATUS.md).

[Relatório completo](RELATORIO-2026-10-19-ANTES-RODADA-FINAL.md). Resultados: `../../../test-results/pocs/metrics-2026-10-19-run2`. Rodada encerrada.

## Sumário

- [Revalidação após correções](#revalidação-após-correções)
- [Resumo da rodada original](#resumo-da-rodada-original)
- [Tempos por plataforma](#tempos-por-plataforma)
- [Falhas e impedimentos](#falhas-e-impedimentos)
- [Portabilidade](#portabilidade)
- [Limites](#limites)
- [Detalhamento omitido](#detalhamento-omitido)

## Revalidação após correções

Revalidação em 19/10/2026. **Resultado mais recente consolidado: 131 aprovações, 6 falhas e 13 sem validação concluída**, de 150 casos. Combina as suítes reexecutadas abaixo com os resultados originais das demais combinações; não é uma nova rodada das 12 combinações.

**Reexecutado após as alterações:** 57 aprovações, 2 falhas e 0 sem validação concluída. Cada linha é uma suíte completa, com os testes de duas janelas integrados quando aplicáveis.

Duas janelas: 12 aprovações e 0 falhas nas suítes reexecutadas; consolidado mais recente de 30 aprovações, 2 falhas e 4 sem validação, de 36 previstos.

| Ferramenta | Plataforma | Resultado atual | Tempo da nova suíte | Aumento na revalidação | Evidências |
| --- | --- | --- | --- | --- | --- |
| Playwright | APK Android | 9 passaram; 0 falharam; 0 sem validação | 5 min 56,29 s | 0,00% | [JSON](../../../test-results/pocs/fixes-2026-10-19/playwright-verified/android/playwright/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/playwright-verified/android/playwright.log) |
| Selenium | Web | 13 passaram; 2 falharam; 0 sem validação | 1 min 57,57 s | — | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-web-final/web/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-web-final/web/selenium.log) |
| Selenium | PWA instalado | 13 passaram; 0 falharam; 0 sem validação | 1 min 43,87 s | — | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-pwa-final/pwa/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-pwa-final/pwa/selenium.log) |
| Selenium | Electron | 13 passaram; 0 falharam; 0 sem validação | 1 min 21,97 s | — | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-electron-final/electron/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-electron-final/electron/selenium.log) |
| Selenium | APK Android | 9 passaram; 0 falharam; 0 sem validação | 7 min 53,78 s | 32,98% | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-verified/android/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-verified/android/selenium.log) |

**Comparação de tempos:** o aumento na tabela acima usa somente as ferramentas reexecutadas na mesma plataforma; “—” indica que só uma ferramenta foi reexecutada ou não há medição elegível. Os percentuais da matriz original abaixo usam somente a rodada contínua das três ferramentas. Os novos tempos acima pertencem à revalidação; não foram misturados ao total original de 33 min 43,36 s nem usados para recalcular seus percentuais. Os dois grupos aplicam (tempo ÷ menor tempo elegível − 1) × 100.

**Ajustes:** esperas para elementos recriados, coordenação de teclado/botão, confirmação da entrega do clique, toques curtos e pausa de hover do mouse. Critérios e aplicativo preservados; sem repetir gestos até passar.

**Limite:** o Playwright já passou nos três casos isolados antes do ajuste; 9/9 agora não prova estabilidade estatística. WDIO e Playwright desktop mantêm os resultados anteriores. Tentativas de diagnóstico constam na versão completa.

**Falhas na revalidação:**

- Selenium/Web — C06 cancela alterações de nome e geometria: a lista de coordenadas não confirmou a alteração após o arraste; cenário não concluído, causa inconclusiva.
- Selenium/Web — C10 mouse deve abrir as instruções de instalação: defeito intencional de instalação continua detectado.

A versão completa lista também a duração de cada teste desta revalidação. As seções seguintes preservam a rodada comparativa original, anterior às correções.


## Resumo da rodada original

**125 aprovados, 12 falhas e 13 sem validação concluída**, de 150 casos previstos.

3 falhas detectam o defeito intencional de C10 mouse; 9 são outras falhas de execução/asserção, detalhadas abaixo. Não significam automaticamente defeitos no aplicativo.

Alvo web/PWA: https://poc-e2e.chiquetano.com.br/. Builds locais: Electron e APK.

12 combinações; 150 casos previstos: 15 web, 13 PWA, 13 Electron e 9 Android por ferramenta. Esta rodada não importa resultados anteriores.

| Ferramenta | Plataforma | O que foi executado/previsto | Resultado | Soma dos testes | Tempo da suíte/comando | Aumento sobre o menor tempo da plataforma |
| --- | --- | --- | --- | --- | --- | --- |
| Playwright | Web | 15 registros / 15 previstos; 4 de duas janelas | 14 passaram; 1 falhou | 76,73 s | 1 min 19,55 s | 0,00% |
| Playwright | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas | ✅ Funcionou: 13/13 | 78,76 s | 1 min 19,73 s | 0,00% |
| Playwright | Electron | 13 registros / 13 previstos; 4 de duas janelas | ✅ Funcionou: 13/13 | 61,27 s | 1 min 1,97 s | 0,00% |
| Playwright | APK Android | 9 registros / 9 previstos | 6 passaram; 3 falharam | 293,85 s | 4 min 56,37 s | 0,00% |
| Selenium | Web | 15 registros / 15 previstos; 4 de duas janelas | 14 passaram; 1 falhou | 91,00 s | 1 min 32,81 s | 16,67% |
| Selenium | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas | 12 passaram; 1 falhou | 88,31 s | 1 min 30,05 s | 12,94% |
| Selenium | Electron | 13 registros / 13 previstos; 4 de duas janelas | 12 passaram; 1 falhou | 68,85 s | 1 min 9,28 s | 11,80% |
| Selenium | APK Android | 9 registros / 9 previstos | 7 passaram; 2 falharam | 401,37 s | 6 min 41,87 s | 35,60% |
| WebdriverIO | Web | 15 registros / 15 previstos; 4 de duas janelas | 13 passaram; 2 falharam | 135,70 s | 2 min 20,00 s | 76,00% |
| WebdriverIO | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas | 12 passaram; 1 falhou | 90,85 s | 1 min 39,42 s | 24,69% |
| WebdriverIO | Electron | 0 registros / 13 previstos; 4 de duas janelas | ⛔ Não foi possível criar/concluir a sessão | — | 2 min 5,37 s | — |
| WebdriverIO | APK Android | 9 registros / 9 previstos | ✅ Funcionou: 9/9 | 433,39 s | 7 min 24,22 s | 49,89% |

**Aumento sobre o menor tempo da plataforma:** (tempo da suíte ÷ menor tempo elegível − 1) × 100; 0% identifica a referência desta rodada. A comparação usa suítes com todos os casos registrados, mesmo com falhas; sessões sem execução completa ficam com “—”. Falhas podem abreviar cenários ou adicionar timeouts, e o isolamento difere entre ferramentas: o percentual é descritivo, não um benchmark de desempenho.

Duas janelas: **28 aprovados, 4 falhas e 4 sem validação concluída**, de 36 casos previstos em web/PWA/Electron. Android não participa dessa contagem.

APK: sem duas janelas/C10; C03 edita pelo botão e C08 usa controles de exclusão. C10 mouse detecta o defeito intencional e permanece falhando; C10 touch deve responder a toque confiável.

## Tempos por plataforma

| Plataforma | Build | Preparação externa | Suítes/comandos | Limpeza externa | Total da plataforma |
| --- | --- | --- | --- | --- | --- |
| Web | — | — | 5 min 12,36 s | — | 5 min 12,69 s |
| PWA instalado | — | — | 4 min 29,19 s | — | 4 min 29,53 s |
| Electron | 6,06 s | — | 4 min 16,62 s | — | 4 min 23,09 s |
| APK Android | 4,17 s | 29,37 s | 19 min 2,47 s | 1,34 s | 19 min 38,05 s |

**Tempo total da rodada:** 33 min 43,36 s. Intervalo (UTC): 2026-10-19T08:24:36.564Z → 2026-10-19T08:58:19.901Z. “Suíte/comando” inclui processo e sessões internos; o total da plataforma acrescenta build/preparação/limpeza externos e geração intermediária dos relatórios. Preparação Android inclui boot, instalação inicial do APK e Appium. “—” não significa zero. [Medições brutas](../../../test-results/pocs/metrics-2026-10-19-run2/timing.json).

Uma tentativa por suíte, sequencial, um worker. Playwright/Selenium isolam/criam sessões por teste; WDIO compartilha sessão e limpa pela interface. Gestos/esperas diferem e falhas podem encurtar casos ou atingir timeout. São métricas destas implementações, sem ranking de velocidade ou medição de confiabilidade estatística. Builds podem aproveitar cache.

## Falhas e impedimentos

- **Playwright/Web — C10 mouse:** Defeito intencional detectado: clique não abriu as instruções de instalação.
- **Playwright/APK Android — C02:** Desenho incompleto: aguardava 2 vértices, contador apontou 1; causa inconclusiva.
- **Playwright/APK Android — C03:** Desenho incompleto: aguardava 3 vértices, contador apontou 2; causa inconclusiva.
- **Playwright/APK Android — C08:** Desenho incompleto: aguardava 2 vértices, contador apontou 1; causa inconclusiva.
- **Selenium/Web — C10 mouse:** Defeito intencional detectado: clique não abriu as instruções de instalação.
- **Selenium/PWA instalado — D01:** Falha de automação: referência DOM obsoleta durante leitura; etapas seguintes não concluídas.
- **Selenium/Electron — D01:** Falha de automação: referência DOM obsoleta durante leitura; etapas seguintes não concluídas.
- **Selenium/APK Android — C02:** Espera pela contagem de vértices esgotada; valor observado não registrado; causa inconclusiva.
- **Selenium/APK Android — C05:** Driver rejeitou coordenadas fora da viewport; gesto de confirmação não exercitado.
- **WebdriverIO/Web — D01:** Seleção divergente entre janelas: esperado Polígono 1, recebido Polígono 2; caso não concluído.
- **WebdriverIO/Web — C10 mouse:** Defeito intencional detectado: clique não abriu as instruções de instalação.
- **WebdriverIO/PWA instalado — D01:** Seleção divergente entre janelas: esperado Polígono 1, recebido Polígono 2; caso não concluído.
- **WebdriverIO/Electron — Preparação:** Sessão não criada: DevToolsActivePort ausente; 13 casos não executados.

Falha antes da última etapa não valida o restante do cenário. As causas não diagnosticadas permanecem inconclusivas.

## Portabilidade

Na construção da POC, o plano foi compartilhado e a execução adaptada por ferramenta. Esta rodada reexecutou os cenários existentes; acrescentou medição e documentação.

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

Escopo: Electron macOS arm64; APK debug em emulador. Não cobre aparelho físico, instaladores, diálogos/permissões do sistema, plugins nativos ou posicionamento em dois monitores físicos.

## Detalhamento omitido

Esta versão não lista as 150 linhas originais nem as linhas individuais das revalidações com suas durações, erros completos, screenshots/traces, exemplos de código de migração, inventário de arquivos compartilhados ou histórico dos ajustes. A [versão completa](RELATORIO-2026-10-19-ANTES-RODADA-FINAL.md) mantém esses detalhes e links para evidências.
