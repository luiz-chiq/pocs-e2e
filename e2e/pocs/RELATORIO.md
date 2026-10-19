# Relatório das POCs E2E

Atualizado em 19/10/2026, 03:58:55 (São Paulo).

## Resumo

| Ferramenta | Plataforma | O que foi executado/previsto | Resultado | Tempo somado dos testes |
| --- | --- | --- | --- | --- |
| Playwright | Web | 15 registros / 15 previstos; 4 de duas janelas · rodada anterior | 14 passaram; 1 falhou | 76,41 s |
| Playwright | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas · rodada anterior | ✅ Funcionou: 13/13 | 77,35 s |
| Playwright | Electron | 13 registros / 13 previstos; 4 de duas janelas · rodada anterior | ✅ Funcionou: 13/13 | 63,76 s |
| Playwright | APK Android | 9 registros / 9 previstos | 8 passaram; 1 falhou | 344,55 s |
| Selenium | Web | 15 registros / 15 previstos; 4 de duas janelas · rodada anterior | 14 passaram; 1 falhou | 89,65 s |
| Selenium | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas · rodada anterior | ✅ Funcionou: 13/13 | 90,36 s |
| Selenium | Electron | 13 registros / 13 previstos; 4 de duas janelas | ✅ Funcionou: 13/13 | 70,25 s |
| Selenium | APK Android | 9 registros / 9 previstos | ✅ Funcionou: 9/9 | 461,23 s |
| WebdriverIO | Web | 15 registros / 15 previstos; 4 de duas janelas · rodada anterior | 13 passaram; 2 falharam | 139,55 s |
| WebdriverIO | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas · rodada anterior | 12 passaram; 1 falhou | 89,95 s |
| WebdriverIO | Electron | 0 registros / 13 previstos; 4 de duas janelas · rodada anterior | ⛔ Não foi possível criar/concluir a sessão | — |
| WebdriverIO | APK Android | 9 registros / 9 previstos | 8 passaram; 1 falhou | 398,48 s |

Os testes de duas janelas fazem parte das suítes completas web, PWA e Electron. O APK usa C01–C09 com controles de toque; separar mapa e instalar o PWA não se aplicam ao app Android. C10 mouse continua detectando o defeito intencional de instalação na web, e C10 touch exige um toque confiável.

No Android, C03 inicia edição pelo botão e C08 usa os controles de exclusão; os atalhos físicos Enter/Delete não são exercitados. As falhas anteriores de web/PWA e o impedimento do WebdriverIO/Electron permanecem identificados como resultados da rodada anterior.

Esta revalidação abrange Android nas três ferramentas e Selenium/Electron. O Selenium/Electron foi aprovado nos 13 testes, incluindo as quatro verificações de duas janelas. Web, PWA e as demais ferramentas no Electron mantêm os resultados da [primeira rodada](RELATORIO-2026-10-19-PRIMEIRA-RODADA.md); não foram reexecutados nesta etapa. Tentativas anteriores, incluindo a execução que pode ter sofrido interação manual e as rodadas de ajuste da automação, estão preservadas em attempts/. A tabela usa a última suíte completa de cada ferramenta, sem substituir falhas individuais por aprovações de outras tentativas.

No Android, restam duas falhas na última suíte completa de cada ferramenta: Playwright/C03 parou na criação inicial (três toques confiáveis chegaram ao mapa, mas foram confirmados dois vértices); WebdriverIO/C05 mostrou a validação de nome vazio no campo, mas não o aviso esperado no topo após concluir. As etapas posteriores desses cenários não foram alcançadas e as causas não estão determinadas. C05 havia passado na tentativa anterior do WebdriverIO, indicando variação entre execuções. C08 passou após aguardar a desseleção antes de criar outro polígono. Selenium/Android aprovou os nove cenários.

As durações individuais abaixo são as registradas por cada ferramenta. O total da tabela soma essas durações, incluindo tentativas que falharam ou foram interrompidas; não inclui etapas externas de build e boot do emulador. Playwright e Selenium incluem preparação por teste; WebdriverIO compartilha parte da preparação da sessão. Esses tempos não são um benchmark de desempenho. “—” significa que não houve medição individual; não significa duração zero. Uma falha na preparação ou em uma pré-condição não comprova defeito na funcionalidade citada no título.

## Etapas, builds e ambiente

- **Implementação de duas telas:** Concluída nas três ferramentas: D01, D02 pela principal, D02 pelo mapa e D03 integrados às suítes web, PWA e Electron.
- **Web:** Concluída: 41 passaram, 4 falharam. C10 mouse falhou nas três ferramentas (defeito intencional); D01 seleção falhou no WebdriverIO. As demais verificações de duas janelas passaram.
- **PWA:** Concluída: 38 passaram, 1 falhou. Playwright e Selenium: 13/13. WebdriverIO: 12/13, com divergência de seleção em D01; causa não investigada nesta rodada, conforme orientação para seguir às próximas etapas.
- **Build Electron:** Aplicativo Electron empacotado para o sistema local em release/electron (sem instalador e sem assinatura).
- **Electron:** Selenium revalidado: 13/13 aprovados, incluindo duas janelas. Playwright preservado da primeira rodada (13/13); WebdriverIO Electron não solicitado nesta revalidação e segue com o impedimento anterior.
- **Build APK:** APK de debug gerado com sucesso.
- **Android:** Revalidação concluída no APK/emulador: Playwright 8/9 (C03 falhou na pré-condição de criação), Selenium 9/9 e WebdriverIO 8/9 (C05 falhou na verificação do aviso do topo). Todas as três suítes chegaram ao fim. C08 do WebdriverIO passou após a espera pela desseleção. Logs e evidências preservados; causas das duas falhas restantes não determinadas.

**Ambiente:** macOS arm64; Chrome desktop 155.0.8059.82; Electron 44.4.3 / Chromium 152.0.7977.130; AVD Pixel_8 / WebView Chrome 133.0.6943.137; Appium 3.8.0 / UiAutomator2 8.7.0; JDK 21 na build APK. Base Git 6b3c6bb com alterações locais nos testes e na infraestrutura.

**Correções e ajustes:**

- Selenium Electron: tamanho original das janelas do app, sem Browser.getWindowForTarget.
- Selenium Android: browserName vazio para sessão Appium nativa.
- Playwright Android: aguarda WebView do PID atual; evita duplo toque involuntário no Sketch.
- Emulador: cold boot, espera de inicialização estável e captura de logcat.
- WDIO: captura dos resultados preservada mesmo quando a janela fica indisponível.
- Android: confirmações de nomes feitas por toque; teclado tratado pela interação com o próximo controle, sem Escape/Back ou blur forçado.
- Segundo polígono no Android: deslocamento adaptado à largura do mapa sem sobrepor o primeiro.
- Build E2E expõe somente leitura de prontidão do SDK e contagem de vértices; os testes aguardam a transição da ferramenta e confirmam cada vértice antes de continuar.
- WebdriverIO Android: aguarda o botão voltar ao modo de criação após a desseleção; o hitTest é assíncrono e o clique seguinte podia iniciar edição.

**Artefatos:** Electron em `release/electron/` e APK em `android/app/build/outputs/apk/debug/app-debug.apk`. Logs das builds: [Electron](../../test-results/pocs/revalidation-2026-10-19/electron/build.log) · [APK](../../test-results/pocs/revalidation-2026-10-19/android/build.log).

O PWA foi instalado em perfil de automação e teve `display-mode: standalone` verificado. O Electron foi empacotado para macOS, sem instalador Windows. Duas janelas simultâneas foram usadas; não foi avaliado o posicionamento em dois monitores físicos. A API auxiliar lê coordenadas, prontidão e quantidade de vértices e aguarda a persistência; os desenhos e edições usam gestos das ferramentas. Ambiente web/PWA: https://poc-e2e.chiquetano.com.br/.

## Playwright

### Web

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/web/playwright/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/web/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,11 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,12 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,05 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 4,93 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,44 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,81 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,18 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,38 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,38 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,76 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 1,25 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,67 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,31 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,63 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,39 s | Verificações concluídas. |

### PWA instalado

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/pwa/playwright/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/pwa/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,58 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 5,22 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,32 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,11 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,60 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,07 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,62 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,63 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,57 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 10,00 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,46 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,62 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,55 s | Verificações concluídas. |

### Electron

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/electron/playwright/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/electron/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 5,64 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 3,88 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,05 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 5,10 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,33 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,80 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,55 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,53 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,34 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,78 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,14 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,22 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,42 s | Verificações concluídas. |

### APK Android

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/android/playwright/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/android/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 25,05 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 34,29 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ❌ Falhou | 19,10 s | Falhou na pré-condição de criação: um toque não foi reconhecido como vértice pelo SDK. A funcionalidade posterior do cenário não foi alcançada; causa ainda não determinada. Error: O SDK não recebeu o vértice 3.  O SDK não recebeu o vértice 3.  expect(received).toBe(expected) // Object.is equality  Expected: 3 Received: 2  Call Log: - Timeout 5000ms exceeded while waiting on the predicate |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 43,64 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 45,21 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 32,90 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 38,12 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 67,68 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 38,54 s | Verificações concluídas. |

## Selenium

### Web

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/web/selenium/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/web/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,08 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,57 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,99 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 5,40 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,91 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,54 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 5,92 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,66 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,88 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 12,23 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 2,20 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 10,89 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 6,11 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 6,20 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,06 s | Verificações concluídas. |

### PWA instalado

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/pwa/selenium/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/pwa/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,64 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 5,47 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,55 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,36 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,92 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,35 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 8,98 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 8,03 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,38 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 12,20 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 7,85 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 8,24 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 8,40 s | Verificações concluídas. |

### Electron

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/electron/selenium/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/electron/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,50 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,11 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,30 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 5,05 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,62 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,16 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,81 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,61 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,09 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 10,88 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,98 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 6,37 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,78 s | Verificações concluídas. |

### APK Android

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/android/selenium/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/android/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 28,12 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 46,31 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 43,30 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 50,65 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 58,38 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 46,11 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 54,75 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 86,99 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 46,63 s | Verificações concluídas. |

## WebdriverIO

### Web

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/web/webdriverio/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/web/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 7,72 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 11,02 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 7,25 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 9,73 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 6,53 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,99 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 8,09 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 11,44 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 7,16 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,91 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 3,46 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 17,10 s | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 11,43 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 9,66 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 11,06 s | Verificações concluídas. |

### PWA instalado

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/pwa/webdriverio/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/pwa/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 4,12 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 7,87 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 6,13 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 7,75 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 6,89 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,95 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 7,60 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,62 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 4,48 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 14,24 s | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,44 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,64 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,23 s | Verificações concluídas. |

### Electron

Resultado preservado da primeira rodada; não reexecutado nesta revalidação.

⛔ A ferramenta encerrou sem produzir relatório. ChromeDriver não encontrou DevToolsActivePort; a sessão Electron não foi criada. [Log](../../test-results/pocs/revalidation-2026-10-19/electron/webdriverio.log)

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

[JSON com durações e evidências](../../test-results/pocs/revalidation-2026-10-19/android/webdriverio/results.json) · [Log completo](../../test-results/pocs/revalidation-2026-10-19/android/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 20,85 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 39,23 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 35,55 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 48,65 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ❌ Falhou | 39,49 s | O campo indicou nome inválido, mas o aviso do topo não apresentou role=alert após concluir. As etapas seguintes de C05 não foram executadas; causa ainda não determinada. Expect $(`#map-instructions`) to have attribute role  Expected: "alert" Received: null |
| C06 cancela alterações de nome e geometria | ✅ Passou | 42,50 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 50,93 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 80,90 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 40,40 s | Verificações concluídas. |
