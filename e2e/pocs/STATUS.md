# Estado das POCs — situação atual

Atualizado em 20/10/2026, 14:00:51 (São Paulo). [Relatório completo](RELATORIO.md) · [Versão direta](RELATORIO-DIRETO.md).

**Mudança posterior do mapa-base:** o app passou a usar Esri World Imagery. A [verificação adicional de satélite](MAPA-SATELITE.md) cobre Chrome e Electron com duas janelas, separadamente dos catálogos C/D e N abaixo. Não houve nova rodada completa das quatro plataformas nem atualização do deploy.

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

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log).

## Escopo e observações

Nova funcionalidade Electron: importação/exportação JSON por preload/contextBridge, IPC e fs no processo principal. Importar acrescenta polígonos e sincroniza a janela separada; a validação do lote é integral. Exportar grava por arquivo temporário e rename. O bug intencional de instalação por mouse permanece.

O catálogo C/D preserva as últimas execuções indicadas nas tabelas. Na rodada atual de arquivos sem ChromeDriver, Playwright executou N01–N05 por Electron direto e acesso ao main; Selenium/WDIO tentaram sessões nativas Mac2, que não iniciaram porque falta Xcode completo. Os dez cenários nativos ficaram sem execução. A interação visual com o diálogo não foi automatizada.

**Arquivos sem ChromeDriver, modalidade atual:** Playwright 5/5 aprovados; Selenium/Mac2 e WDIO/Mac2 0 executados, cinco cenários indisponíveis em cada um. O Mac2 4.5.0 foi instalado isoladamente; doctor e tentativas de sessão apontam falta de Xcode válido e encerramento do WebDriverAgentMac com código 1. Não houve fallback. Esses impedimentos não são falhas funcionais do app nem aprovações. A rodada anterior de arquivos com ChromeDriver em Selenium/WDIO passou 15/15 e foi arquivada.

**Catálogo C/D anterior:** Electron 39/39; o consolidado permanece com 147 aprovações e três C10 mouse intencionais na web. Os 36 casos C/D de duas janelas passaram nas execuções referenciadas. Esses resultados não foram reexecutados ou convertidos para Mac2. A troca posterior do fundo de mapa e sua verificação têm evidências próprias.

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. O catálogo original de 150 casos C/D não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa. A funcionalidade de arquivos do processo principal Electron tem uma rodada adicional N01–N05, apresentada separadamente abaixo.

Este arquivo é gerado a partir dos mesmos resultados brutos das duas versões do relatório. As origens, as durações individuais e os percentuais estão no relatório completo.

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


## Histórico separado

[Relatório histórico completo](old/RELATORIO-ANTES-SEM-CHROMEDRIVER.md) · [Histórico direto](old/RELATORIO-DIRETO-ANTES-SEM-CHROMEDRIVER.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
