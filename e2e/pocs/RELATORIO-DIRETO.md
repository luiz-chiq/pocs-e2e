# Relatório direto das POCs E2E — situação atual

Atualizado em 19/10/2026, 19:07:09 (São Paulo). [Relatório completo](RELATORIO.md).

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

**Soma dos testes** reúne as durações individuais. **Suíte/comando** inclui processo, sessões e encerramento internos à ferramenta. O total contínuo da plataforma só existe quando suas três ferramentas pertencem à mesma rodada; não somamos execuções diferentes para apresentar um tempo global. “—” significa não aplicável ou indisponível, não zero. Build/preparação/limpeza externos ficam fora do comando da suíte.

Playwright e Selenium isolam sessões por teste; WDIO compartilha a sessão e limpa os dados pela interface. Gestos, esperas, reinício e custos de conexão variam. Uma execução não mede frequência de intermitência. O bug de instalação por mouse foi mantido, sem skip, expectedFailure ou inversão de expectativa.

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log).

Nova funcionalidade Electron: importação/exportação JSON por preload/contextBridge, IPC e fs no processo principal. Importar acrescenta polígonos e sincroniza a janela separada; a validação do lote é integral. Exportar grava por arquivo temporário e rename. O bug intencional de instalação por mouse permanece.

Nesta etapa foram reexecutados somente os três clientes Electron: catálogo C/D e rodada adicional N01–N05. Web, PWA e Android preservam as últimas evidências indicadas nas tabelas. A escolha do caminho no diálogo é simulada apenas na build POC; IPC, validação e leitura/gravação são reais. O seletor nativo visual não foi automatizado. A causa da intermitência histórica C08 web continua inconclusiva.

**Resultados desta etapa:** Electron C/D 39/39; arquivos N01–N05 15/15 (5 por ferramenta); serviço de arquivos Node 6/6. Sem falhas nesta etapa. As tabelas C/D continuam com 150 casos, 147 aprovações e somente os três C10 mouse intencionais da web; os testes de arquivos têm contagem própria. Os 36 testes C/D de duas janelas estão aprovados; N05 acrescenta mais três validações de importação/exportação com duas janelas. As três ferramentas Electron C/D agora pertencem à mesma rodada, permitindo calcular seus percentuais; PWA mantém rodadas distintas. WDIO registrou avisos de referência DOM obsoleta durante a regressão, mas concluiu 13/13 e código de saída 0; o log integral permanece disponível.

## Limitações e portabilidade

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. O catálogo original de 150 casos C/D não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa. A funcionalidade de arquivos do processo principal Electron tem uma rodada adicional N01–N05, apresentada separadamente abaixo.

Reaproveitados: catálogo/critérios, seletores, dados e parte da infraestrutura. Reescritos por ferramenta: interação, esperas, asserções, sessões e evidências. Não houve conversão automática dos testes.

- **Playwright:** Electron e Android experimentais; APIs para processo principal Electron e ações nativas Android existem, mas nossa cobertura se concentra na interface web.
- **Selenium:** Electron via ChromeDriver; Android via Appium/UiAutomator2. Menus/diálogos nativos do desktop exigem integração adicional.
- **WebdriverIO:** Electron via ChromeDriver direto nesta POC, com 13/13 aprovados; bridge do serviço Electron não utilizada. Android via Appium/UiAutomator2.

A versão completa detalha limitações documentadas, configuração e evidências. Esta versão omite as 150 linhas individuais C/D e as 15 linhas de arquivos, erros completos, screenshots/traces e exemplos de migração.

## Arquivos no processo principal do Electron

[Relatório da rodada adicional](ELECTRON-ARQUIVOS.md), com evidências, duração individual e limites da simulação do diálogo.

Esta é uma rodada adicional da nova funcionalidade Electron. Seus casos N01–N05 são separados do consolidado histórico de 150 testes; web, PWA e Android não foram reexecutados nesta rodada.

| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |
| --- | --- | --- | --- | --- | --- |
| Playwright | 5 | 0 | 0 | 6.84 s | 48.61% |
| Selenium | 5 | 0 | 0 | 4.60 s | 0.00% |
| WebdriverIO | 5 | 0 | 0 | 5.17 s | 12.21% |

Cada duração inclui lançamento de um app empacotado com perfil novo, cenário e encerramento. A soma exclui build e trabalho externo do runner; não equivale ao tempo do comando das suítes antigas. Percentual: (soma ÷ menor soma − 1) × 100, somente com os cinco casos registrados nas três ferramentas. Uma execução não estabelece um benchmark de desempenho.


## Histórico separado

[Relatório histórico completo](old/RELATORIO-ANTES-ARQUIVOS-ELECTRON.md) · [Histórico direto](old/RELATORIO-DIRETO-ANTES-ARQUIVOS-ELECTRON.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
