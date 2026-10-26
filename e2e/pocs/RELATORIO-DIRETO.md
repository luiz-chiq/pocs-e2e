# Relatório direto das POCs E2E — situação atual

Atualizado em 26/10/2026, 00:09:55 (São Paulo). [Relatório completo](RELATORIO.md).

**Mudança posterior do mapa-base:** o app passou a usar Esri World Imagery. A [verificação adicional de satélite](MAPA-SATELITE.md) cobre Chrome e Electron com duas janelas, separadamente dos catálogos C/D e N abaixo. Não houve nova rodada completa das quatro plataformas nem atualização do deploy.

## Sumário

- [Resumo atual](#resumo-atual)
- [Tempos por ferramenta e plataforma](#tempos-por-ferramenta-e-plataforma)
- [Tempo de execução por plataforma](#tempo-de-execução-por-plataforma)
- [Falhas atuais](#falhas-atuais)
- [Limitações e portabilidade](#limitações-e-portabilidade)
- [Arquivos no processo principal do Electron](#arquivos-no-processo-principal-do-electron)
- [Histórico separado](#histórico-separado)

## Resumo atual

**Nova cobertura:** os testes N01–N05 de arquivos no processo principal Electron estão na [rodada adicional](#arquivos-no-processo-principal-do-electron), separados dos 100 casos C/D abaixo.

**98 aprovações, 2 falhas e 0 sem validação concluída**, de 100 casos previstos. 2 falhas são o bug intencional C10 mouse; 0 são outras falhas.

**Duas janelas: 24/24 aprovados**, 0 falhas e 0 sem validação. Android não inclui duas janelas.

| Ferramenta | Web | PWA instalado | Electron | Android |
| --- | --- | --- | --- | --- |
| Playwright | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |
| Selenium | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |

Este é o consolidado mais recente das 8 combinações. Cada combinação usa a última suíte completa referenciada, com a origem indicada nas tabelas; não representa uma nova execução simultânea das 8. Resultados substituídos ficam somente nos arquivos históricos.

## Tempo de execução por plataforma

| Plataforma | Playwright | Selenium |
| --- | --- | --- |
| Web | 1 min 18,49 s | 1 min 48,04 s |
| PWA instalado | 1 min 19,55 s | 1 min 41,03 s |
| Electron | 1 min 2,25 s | 1 min 20,26 s |
| APK Android | 5 min 26,90 s | 8 min 14,45 s |

Cada célula mostra o tempo de execução da suíte/comando daquela ferramenta e plataforma. Inclui inicialização, sessões, testes e encerramento internos ao comando; exclui build, preparação externa e limpeza externa. As origens das últimas execuções estão identificadas na tabela detalhada; combinações da mesma plataforma podem vir de rodadas distintas.

## Tempos por ferramenta e plataforma

| Ferramenta | Plataforma | Resultado atual | Soma dos testes | Suíte/comando | Aumento sobre o menor tempo | Origem da suíte |
| --- | --- | --- | --- | --- | --- | --- |
| Playwright | Web | 14/15 aprovados; 1 falha | 76,30 s | 1 min 18,49 s | 0,00% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log) |
| Playwright | PWA instalado | 13/13 aprovados | 78,50 s | 1 min 19,55 s | 0,00% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/pwa/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/playwright.log) |
| Playwright | Electron | 13/13 aprovados | 61,52 s | 1 min 2,25 s | 0,00% | Revalidação · [JSON](../../test-results/pocs/electron-files-regression/electron/playwright/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/playwright.log) |
| Playwright | APK Android | 9/9 aprovados | 325,92 s | 5 min 26,90 s | 0,00% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/playwright/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/playwright.log) |
| Selenium | Web | 14/15 aprovados; 1 falha | 106,18 s | 1 min 48,04 s | 37,65% | Revalidação · [JSON](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium/results.json) · [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log) |
| Selenium | PWA instalado | 13/13 aprovados | 99,22 s | 1 min 41,03 s | 27,00% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/pwa/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/pwa/selenium.log) |
| Selenium | Electron | 13/13 aprovados | 79,80 s | 1 min 20,26 s | 28,94% | Revalidação · [JSON](../../test-results/pocs/electron-files-regression/electron/selenium/results.json) · [Log](../../test-results/pocs/electron-files-regression/electron/selenium.log) |
| Selenium | APK Android | 9/9 aprovados | 493,86 s | 8 min 14,45 s | 51,25% | Rodada original · [JSON](../../test-results/pocs/final-2026-10-19/android/selenium/results.json) · [Log](../../test-results/pocs/final-2026-10-19/android/selenium.log) |

**Percentuais:** (tempo da suíte ÷ menor tempo elegível − 1) × 100. Só comparamos quando as duas ferramentas da plataforma vêm da mesma rodada e todos os casos foram registrados. Plataformas que combinam rodadas distintas ficam com “—”. Falhas e políticas diferentes de isolamento limitam a comparação; não é um benchmark universal. Os percentuais históricos continuam no arquivo de histórico.

**Soma dos testes** reúne as durações individuais. **Suíte/comando** inclui processo, sessões e encerramento internos à ferramenta. O total contínuo da plataforma só existe quando suas duas ferramentas pertencem à mesma rodada; não somamos execuções diferentes para apresentar um tempo global. “—” significa não aplicável ou indisponível, não zero. Build/preparação/limpeza externos ficam fora do comando da suíte.

Playwright e Selenium isolam sessões por teste. Gestos, esperas, reinício e custos de conexão variam. Uma execução não mede frequência de intermitência. O bug de instalação por mouse foi mantido, sem skip, expectedFailure ou inversão de expectativa.

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).

A main mantém somente Playwright e Selenium. A POC completa das três ferramentas está preservada na branch codex/poc-tres-ferramentas, commit 98f49f5. Os números abaixo filtram as evidências existentes; não representam uma nova execução.

A integração Android Playwright + Appium continua experimental e sem validação funcional completa. O cliente nativo foi migrado para Selenium JS; os resultados anteriores não validam esse novo adaptador.

O catálogo C/D tem 100 casos nas duas ferramentas. Arquivos Electron e o protótipo Android de arquivos/permissões possuem contagens e evidências separadas. A verificação da remoção reexecutou somente criação de polígono e recuperação da janela do mapa: 2/2 em [Playwright](../../test-results/pocs/remove-wdio-smoke/playwright/results.json) e 2/2 em [Selenium](../../test-results/pocs/remove-wdio-smoke/selenium/results.json). Não substitui as suítes completas históricas da matriz.

## Limitações e portabilidade

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. O catálogo original de 100 casos C/D não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa. A funcionalidade de arquivos do processo principal Electron tem uma rodada adicional N01–N05, apresentada separadamente abaixo.

Reaproveitados: catálogo/critérios, seletores, dados e parte da infraestrutura. Reescritos por ferramenta: interação, esperas, asserções, sessões e evidências. Não houve conversão automática dos testes.

- **Playwright:** Electron e Android experimentais; APIs para processo principal Electron e ações nativas Android existem, mas nossa cobertura se concentra na interface web.
- **Selenium:** Electron via ChromeDriver; Android via Appium/UiAutomator2. Menus/diálogos nativos do desktop exigem integração adicional.

A versão completa detalha limitações documentadas, configuração e evidências. Esta versão omite as 100 linhas individuais C/D e as 10 linhas de arquivos, erros completos, screenshots/traces e exemplos de migração.

## Arquivos no processo principal do Electron

[Relatório da rodada adicional](ELECTRON-ARQUIVOS.md), com evidências, duração individual e limites da simulação do diálogo.

**Modalidade atual: sem ChromeDriver.** Playwright controla o Electron diretamente; Selenium tenta uma sessão nativa Appium/Mac2. Não há fallback para ChromeDriver. Sessão indisponível não é aprovação nem falha funcional dos cenários.

N01–N05 têm contagem própria, separada dos 100 casos C/D anteriores. Esta rodada não reexecuta web, PWA, Android ou o catálogo C/D.

| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |
| --- | --- | --- | --- | --- | --- |
| Playwright | 5 | 0 | 0 | 8.46 s | — |
| Selenium | 0 | 0 | 5 | — | — |

Cada duração executada inclui lançamento com perfil novo, cenário e encerramento; exclui build e preparação externa. Cenários não executados não recebem duração zero. O tempo da tentativa de criar a sessão Mac2 aparece separadamente abaixo, sem ser confundido com execução dos cinco testes. Não há percentual comparativo com uma ferramenta sem execução.


## Histórico separado

[Relatório histórico completo](old/RELATORIO-ANTES-SEM-CHROMEDRIVER.md) · [Histórico direto](old/RELATORIO-DIRETO-ANTES-SEM-CHROMEDRIVER.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
