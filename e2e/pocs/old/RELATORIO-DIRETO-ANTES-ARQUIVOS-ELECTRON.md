> **RELATÓRIO HISTÓRICO — RESULTADOS SUBSTITUÍDOS.** Anterior à funcionalidade de arquivos Electron. Consulte o [relatório atual](../RELATORIO.md) e a [versão direta](../RELATORIO-DIRETO.md).

# Relatório direto das POCs E2E — situação atual

Atualizado em 19/10/2026, 10:33:45 (São Paulo). [Relatório completo](../RELATORIO.md).

## Sumário

- [Resumo atual](#resumo-atual)
- [Tempos por ferramenta e plataforma](#tempos-por-ferramenta-e-plataforma)
- [Tempo de execução por plataforma](#tempo-de-execução-por-plataforma)
- [Falhas atuais](#falhas-atuais)
- [Limitações e portabilidade](#limitações-e-portabilidade)
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
| Playwright | Web | 14/15 aprovados; 1 falha | 76,30 s | 1 min 18,49 s | 0,00% | Revalidação · [JSON](../../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/results.json) · [Log](../../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log) |
| Playwright | PWA instalado | 13/13 aprovados | 78,50 s | 1 min 19,55 s | — | Rodada original · [JSON](../../../test-results/pocs/final-2026-10-19/pwa/playwright/results.json) · [Log](../../../test-results/pocs/final-2026-10-19/pwa/playwright.log) |
| Playwright | Electron | 13/13 aprovados | 61,74 s | 1 min 2,55 s | — | Rodada original · [JSON](../../../test-results/pocs/final-2026-10-19/electron/playwright/results.json) · [Log](../../../test-results/pocs/final-2026-10-19/electron/playwright.log) |
| Playwright | APK Android | 9/9 aprovados | 325,92 s | 5 min 26,90 s | 0,00% | Rodada original · [JSON](../../../test-results/pocs/final-2026-10-19/android/playwright/results.json) · [Log](../../../test-results/pocs/final-2026-10-19/android/playwright.log) |
| Selenium | Web | 14/15 aprovados; 1 falha | 106,18 s | 1 min 48,04 s | 37,65% | Revalidação · [JSON](../../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium/results.json) · [Log](../../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log) |
| Selenium | PWA instalado | 13/13 aprovados | 99,22 s | 1 min 41,03 s | — | Rodada original · [JSON](../../../test-results/pocs/final-2026-10-19/pwa/selenium/results.json) · [Log](../../../test-results/pocs/final-2026-10-19/pwa/selenium.log) |
| Selenium | Electron | 13/13 aprovados | 80,14 s | 1 min 20,58 s | — | Rodada original · [JSON](../../../test-results/pocs/final-2026-10-19/electron/selenium/results.json) · [Log](../../../test-results/pocs/final-2026-10-19/electron/selenium.log) |
| Selenium | APK Android | 9/9 aprovados | 493,86 s | 8 min 14,45 s | 51,25% | Rodada original · [JSON](../../../test-results/pocs/final-2026-10-19/android/selenium/results.json) · [Log](../../../test-results/pocs/final-2026-10-19/android/selenium.log) |
| WebdriverIO | Web | 14/15 aprovados; 1 falha | 132,71 s | 2 min 16,55 s | 73,97% | Revalidação · [JSON](../../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio/results.json) · [Log](../../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log) |
| WebdriverIO | PWA instalado | 13/13 aprovados | 87,37 s | 1 min 35,74 s | — | Revalidação · [JSON](../../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio/results.json) · [Log](../../../test-results/pocs/web-fix-2026-10-19/pwa-verified/pwa/webdriverio.log) |
| WebdriverIO | Electron | 13/13 aprovados | 61,96 s | 1 min 5,99 s | — | Revalidação · [JSON](../../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio/results.json) · [Log](../../../test-results/pocs/wdio-electron-fix-2026-10-19/final-verified/electron/webdriverio.log) |
| WebdriverIO | APK Android | 9/9 aprovados | 438,36 s | 7 min 29,93 s | 37,63% | Rodada original · [JSON](../../../test-results/pocs/final-2026-10-19/android/webdriverio/results.json) · [Log](../../../test-results/pocs/final-2026-10-19/android/webdriverio.log) |

**Percentuais:** (tempo da suíte ÷ menor tempo elegível − 1) × 100. Só comparamos quando as três ferramentas da plataforma vêm da mesma rodada e todos os casos foram registrados. Web e Android atendem a esse critério; PWA e Electron combinam rodadas distintas e ficam com “—”. Falhas e políticas diferentes de isolamento limitam a comparação; não é um benchmark universal. Os percentuais históricos continuam no arquivo de histórico.

**Soma dos testes** reúne as durações individuais. **Suíte/comando** inclui processo, sessões e encerramento internos à ferramenta. O total contínuo da plataforma só existe quando suas três ferramentas pertencem à mesma rodada; não somamos execuções diferentes para apresentar um tempo global. “—” significa não aplicável ou indisponível, não zero. Build/preparação/limpeza externos ficam fora do comando da suíte.

Playwright e Selenium isolam sessões por teste; WDIO compartilha a sessão e limpa os dados pela interface. Gestos, esperas, reinício e custos de conexão variam. Uma execução não mede frequência de intermitência. O bug de instalação por mouse foi mantido, sem skip, expectedFailure ou inversão de expectativa.

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log).

WDIO reconsulta o rótulo selecionado no D01, agora validado em web/PWA. Playwright direciona o Delete ao mapa com clique real no polígono e confirmação de foco. O bug intencional de instalação por mouse permanece.

C08 já passou antes do novo preparo: a causa da intermitência anterior continua inconclusiva. Três verificações isoladas e a suíte completa passaram após o ajuste; isso não mede estabilidade estatística. Nesta etapa foram reexecutados web nas três ferramentas e WDIO/PWA; os demais resultados são anteriores, incluindo a correção WDIO/Electron.

**Resultados desta etapa:** 42/45 na web, com apenas os três C10 mouse intencionais; WDIO/PWA 13/13. Total do orquestrador web: **5 min 23,41 s**; WDIO/PWA: **1 min 35,94 s**, em execução separada. Nenhum teste ficou sem execução. O consolidado passa a ter somente três falhas intencionais; os 36 testes de duas janelas estão aprovados. O WDIO/PWA registrou um aviso de sessão antiga no reinício, sem impedir os 13 testes; a versão completa preserva o log e a limitação.

## Limitações e portabilidade

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. Não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa.

Reaproveitados: catálogo/critérios, seletores, dados e parte da infraestrutura. Reescritos por ferramenta: interação, esperas, asserções, sessões e evidências. Não houve conversão automática dos testes.

- **Playwright:** Electron e Android experimentais; APIs para processo principal Electron e ações nativas Android existem, mas nossa cobertura se concentra na interface web.
- **Selenium:** Electron via ChromeDriver; Android via Appium/UiAutomator2. Menus/diálogos nativos do desktop exigem integração adicional.
- **WebdriverIO:** Electron via ChromeDriver direto nesta POC, com 13/13 aprovados; bridge do serviço Electron não utilizada. Android via Appium/UiAutomator2.

A versão completa detalha limitações documentadas, configuração e evidências. Esta versão omite as 150 linhas individuais, erros completos, screenshots/traces e exemplos de migração.

## Histórico separado

[Relatório histórico completo](RELATORIO-HISTORICO-2026-10-19.md) · [Histórico direto](RELATORIO-DIRETO-HISTORICO-2026-10-19.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
