# Relatório completo das POCs E2E — situação atual

Atualizado em 26/10/2026, 00:09:55 (São Paulo). [Versão direta](RELATORIO-DIRETO.md).

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
- [Portabilidade](#portabilidade)
- [Limitações e escopo](#limitações-e-escopo)
- [Ambiente e evidências](#ambiente-e-evidências)
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

## Etapas externas e totais contínuos

| Plataforma | Build | Preparação | Soma dos comandos atuais | Limpeza | Total contínuo da plataforma |
| --- | --- | --- | --- | --- | --- |
| Web | — | — | 3 min 6,53 s | — | — (escopo ou rodadas distintos) |
| PWA instalado | — | — | 3 min 0,58 s | — | — (escopo ou rodadas distintos) |
| Electron | 5,73 s | — | 2 min 22,51 s | — | — (escopo ou rodadas distintos) |
| APK Android | 4,39 s | 27,92 s | 13 min 41,35 s | 1,65 s | — (escopo ou rodadas distintos) |

**Soma dos testes** reúne as durações individuais. **Suíte/comando** inclui processo, sessões e encerramento internos à ferramenta. O total contínuo da plataforma só existe quando suas duas ferramentas pertencem à mesma rodada; não somamos execuções diferentes para apresentar um tempo global. “—” significa não aplicável ou indisponível, não zero. Build/preparação/limpeza externos ficam fora do comando da suíte.

Playwright e Selenium isolam sessões por teste. Gestos, esperas, reinício e custos de conexão variam. Uma execução não mede frequência de intermitência. O bug de instalação por mouse foi mantido, sem skip, expectedFailure ou inversão de expectativa.

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).

## Correções aplicadas

A main mantém somente Playwright e Selenium. A POC completa das três ferramentas está preservada na branch codex/poc-tres-ferramentas, commit 98f49f5. Os números abaixo filtram as evidências existentes; não representam uma nova execução.

A integração Android Playwright + Appium continua experimental e sem validação funcional completa. O cliente nativo foi migrado para Selenium JS; os resultados anteriores não validam esse novo adaptador.

O catálogo C/D tem 100 casos nas duas ferramentas. Arquivos Electron e o protótipo Android de arquivos/permissões possuem contagens e evidências separadas. A verificação da remoção reexecutou somente criação de polígono e recuperação da janela do mapa: 2/2 em [Playwright](../../test-results/pocs/remove-wdio-smoke/playwright/results.json) e 2/2 em [Selenium](../../test-results/pocs/remove-wdio-smoke/selenium/results.json). Não substitui as suítes completas históricas da matriz.

- Comandos, dependências e suítes da ferramenta arquivada foram retirados da main.
- Resultados e tempos de Playwright/Selenium preservam a origem das execuções anteriores; as falhas C10 mouse são intencionais.

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

## Portabilidade

# Portabilidade entre Playwright e Selenium

As duas POCs C/D têm implementações independentes em TypeScript. Catálogo,
critérios, seletores, fixtures e parte da infraestrutura são compartilhados;
interações, esperas, asserções, sessões e evidências são adaptadas por ferramenta.
Não houve conversão automática nem um executor universal.

| Parte | Reaproveitamento |
| --- | --- |
| Catálogo e critérios | [Fixtures comuns](shared/fixtures.ts) |
| Implementação da UI | [Playwright](playwright/web.spec.ts) e [Selenium](selenium/web.test.ts) |
| Lançamento e persistência | [Fixtures Playwright](playwright/fixtures.ts), adaptadores Selenium e helpers comuns |
| PWA | Instalação/lançamento via protocolo e perfis isolados; janela standalone real |
| Electron | Playwright `_electron`; Selenium/ChromeDriver na suíte C/D |
| Android | Playwright conecta à WebView; Selenium usa Appium/UiAutomator2 |

Dentro de uma ferramenta, os cenários são reutilizados entre plataformas com
adaptações de lançamento, toque, teclado e janelas. Isso não torna iguais os
intervalos de gestos, esperas ou custos de sessão; métricas precisam considerar
essas diferenças. Não foram medidos percentual de reutilização ou esforço de
migração em horas.

## Cenários de arquivos Electron

N01–N05 usam as mesmas funções de cenário e asserções, com adaptadores para
Playwright e Selenium. Os arquivos reais, nomes, coordenadas, cancelamentos,
rejeições e sincronização são conferidos. Na modalidade sem ChromeDriver,
Playwright acessa o main diretamente; Selenium/Mac2 continua pendente do
ambiente e da adaptação dos seletores nativos.

## Integração Android

[Playwright + Appium](android-hybrid.test.ts) agora usa
[Selenium JS como cliente nativo](shared/appium-native.ts). O adaptador traduz
as operações utilizadas pelo protótipo para endpoints Appium: selecionar um
elemento Android, clicar, voltar, consultar pacote/contexto, alterar settings e
salvar screenshots. Isso permite retirar a dependência da ferramenta arquivada
sem alterar os critérios dos oito cenários H01–H08.

Os testes de contrato do adaptador usam um servidor simulado. Os fluxos completos
no emulador ainda precisam de revalidação; o resultado antigo não foi transferido
como aprovação da implementação nova.

O material completo da comparação anterior permanece na branch
`codex/poc-tres-ferramentas`, commit `98f49f5`.


## Limitações e escopo

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. O catálogo original de 100 casos C/D não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa. A funcionalidade de arquivos do processo principal Electron tem uma rodada adicional N01–N05, apresentada separadamente abaixo.

### Limitações por ferramenta em Electron e Android

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | Integração `_electron` experimental; exige configuração compatível de inspeção. Permite acesso ao main. Diálogos nativos não são elementos DOM. | API Android experimental para Chrome/WebView e algumas ações nativas; exige ADB e WebView depurável. Reconexões, gestos e ciclo de vida precisam de validação. |
| Selenium | A suíte JS C/D usa ChromeDriver compatível com o Chromium do Electron. Controlar a página não dá acesso genérico ao main nem ao seletor do SO. | Usa Appium/UiAutomator2. O contexto WebView normalmente usa ChromeDriver; contexto nativo usa acessibilidade e comandos próprios de Appium. |

Fontes: [Playwright Electron](https://playwright.dev/docs/api/class-electron),
[Playwright Android](https://playwright.dev/docs/api/class-android),
[Electron/Selenium](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium),
[UiAutomator2](https://github.com/appium/appium-uiautomator2-driver).

### Escopo das execuções preservadas

C/D: web/PWA em Chrome, Electron macOS arm64 e APK debug no emulador Pixel_8.
Windows, instaladores, aparelhos físicos e todas as versões Android/WebView
não foram validados. Duas janelas não equivalem a dois monitores físicos.
O APK C03/C08 usa controles da interface, sem Enter/Delete físicos.
As falhas de instalação C10 mouse são intencionais e continuam contabilizadas.

Os resultados C/D anteriores não validam automaticamente a implementação atual
de arquivos Android ou o novo cliente Appium. As implementações têm políticas
de sessões, gestos e esperas diferentes; uma execução não mede estabilidade
estatística nem determina um ranking universal de desempenho.

### Arquivos e processo principal

Criar/exportar arquivos faz parte de E2E quando a ação vem da interface e o
arquivo real é conferido. Criar o arquivo no teste e verificar sua existência
não valida a exportação do aplicativo.

Os [cinco cenários Playwright de arquivos Electron](ELECTRON-ARQUIVOS.md)
passaram na execução indicada, usando main, preload, IPC e disco reais.
Somente a resposta de seleção/cancelamento do diálogo foi simulada; a interação
visual com o seletor nativo não foi testada. Selenium/Mac2 tentou iniciar a
sessão nativa, sem sucesso por falta de Xcode completo. O diagnóstico não é uma
implementação completa dos cenários pela árvore de acessibilidade.

### Protótipo híbrido Android

A integração combina Playwright na WebView e Selenium JS como cliente Appium
nativo. Ela não usa Appium como backend do Playwright. Traces Playwright não
capturam automaticamente as interações nativas; screenshots/XML e logs Appium
são evidências separadas.

O [adaptador Selenium](shared/appium-native.ts) possui testes de contrato com
servidor simulado para comandos, seletores, screenshots, erros e timeout.
Essa verificação não é uma aprovação no emulador. A tentativa Android anterior,
com cliente diferente, teve 1 aprovação e 7 falhas de execução; a causa não foi
isolada. Os cenários precisam de nova execução com o adaptador atual.

A autorização de pasta Android pelo SAF limita o acesso à pasta escolhida.
Permissões concedidas antecipadamente ou respostas simuladas não validam a
interação real de permitir/negar. O protótipo usa `autoGrantPermissions=false`.


## Ambiente e evidências

Ambiente registrado nas execuções históricas de origem, anterior à remoção da terceira ferramenta: macOS 15.3 arm64; Node v24.11.0; Chrome 155.0.8059.82; @playwright/test 1.63.0; selenium-webdriver 4.51.0; webdriverio 9.31.9; electron 44.4.3; appium 3.8.0; appium-uiautomator2-driver 8.7.0; wdio-electron-service 9.2.1. APK debug no AVD Pixel_8; Web/PWA no deploy https://poc-e2e.chiquetano.com.br/; Electron empacotado para macOS arm64. Android 16 / API 36; Current WebView package (name, version): (com.google.android.webview, 133.0.6943.137).

As 8 linhas da tabela de tempos e as seções por ferramenta apontam para o JSON e o log efetivamente usados. O teste cria/edita pela interface; a API auxiliar lê estado/coordenadas e aguarda persistência.

Artefatos: Electron em `release/electron/`; APK em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Arquivos no processo principal do Electron

[Relatório da rodada adicional](ELECTRON-ARQUIVOS.md), com evidências, duração individual e limites da simulação do diálogo.

**Modalidade atual: sem ChromeDriver.** Playwright controla o Electron diretamente; Selenium tenta uma sessão nativa Appium/Mac2. Não há fallback para ChromeDriver. Sessão indisponível não é aprovação nem falha funcional dos cenários.

N01–N05 têm contagem própria, separada dos 100 casos C/D anteriores. Esta rodada não reexecuta web, PWA, Android ou o catálogo C/D.

| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |
| --- | --- | --- | --- | --- | --- |
| Playwright | 5 | 0 | 0 | 8.46 s | — |
| Selenium | 0 | 0 | 5 | — | — |

Cada duração executada inclui lançamento com perfil novo, cenário e encerramento; exclui build e preparação externa. Cenários não executados não recebem duração zero. O tempo da tentativa de criar a sessão Mac2 aparece separadamente abaixo, sem ser confundido com execução dos cinco testes. Não há percentual comparativo com uma ferramenta sem execução.

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

### Implementação e limites

- **Playwright:** `_electron.launch` abre o app empacotado. `electronApplication.evaluate` configura somente a resposta dos diálogos no processo principal e lê a auditoria. Não usa ChromeDriver nem POLYGON_E2E_DIALOG_PLAN. Os cliques da interface, preload, IPC, validação e operações de disco são reais. O seletor visual do sistema continua simulado.
- **Selenium:** a tentativa nativa Appium Mac2/WebDriverAgentMac não iniciou por falta de Xcode completo. Nenhum N01–N05 nativo foi validado nessa integração. O bootstrap é diagnóstico de sessão; os cenários ainda precisam ser adaptados e validados com seletores de acessibilidade. O Mac2 está separado do Android em `test-results/appium-mac2`. [Requisitos Mac2](https://appium.github.io/appium-mac2-driver/latest/getting-started/).
- Appium é o servidor e Mac2 é seu driver nativo macOS. Usar Appium não elimina automaticamente ChromeDriver: no Android/WebView ele pode continuar necessário.
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

[Rodada histórica das três ferramentas](old/ELECTRON-ARQUIVOS-COM-CHROMEDRIVER.md): preservada como evidência anterior, em outra modalidade. Esses resultados não são aprovações da tentativa nativa atual. A implementação completa está na branch codex/poc-tres-ferramentas. O comando antigo está disponível explicitamente como npm run test:poc:electron:files:chromedriver.

## Histórico separado

[Relatório histórico completo](old/RELATORIO-ANTES-SEM-CHROMEDRIVER.md) · [Histórico direto](old/RELATORIO-DIRETO-ANTES-SEM-CHROMEDRIVER.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
