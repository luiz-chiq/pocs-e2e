# Relatório das POCs E2E

Atualizado em 19/10/2026, 01:39:00 (São Paulo).

Ambiente web/PWA: https://poc-e2e.chiquetano.com.br/. Cada ferramenta executa seus próprios gestos e verificações. A API auxiliar apenas lê coordenadas e aguarda a persistência; não cria ou altera polígonos.

Os testes D01, D02 (duas variações) e D03 fazem parte da suíte completa em web, PWA e Electron. Android não possui a opção de separar mapa. C10 é executado somente na web: o botão de instalar fica oculto no aplicativo instalado.

O defeito intencional de instalação por mouse continua presente: C10 mouse deve falhar; touch deve passar. As falhas permanecem no resultado e no código de saída.

## Etapas, builds e limitações

- **Implementação dos testes de duas telas:** Concluída nas três ferramentas: D01, D02 pela principal, D02 pelo mapa e D03 integrados às suítes web, PWA e Electron.
- **Suítes web:** Concluída: 41 passaram, 4 falharam. C10 mouse falhou nas três ferramentas (defeito intencional); D01 seleção falhou no WebdriverIO. As demais verificações de duas janelas passaram.
- **Suítes PWA:** Concluída: 38 passaram, 1 falhou. Playwright e Selenium: 13/13. WebdriverIO: 12/13, com divergência de seleção em D01; causa não investigada nesta rodada, conforme orientação para seguir às próximas etapas.
- **Build Electron:** Aplicativo Electron empacotado para o sistema local em release/electron (sem instalador e sem assinatura).
- **Suítes Electron:** Concluída com impedimentos: Playwright aprovou 13/13 no app empacotado; Selenium registrou 13 falhas na preparação da janela (Browser.getWindowForTarget), sem alcançar os cenários funcionais; WebdriverIO não criou a sessão (DevToolsActivePort ausente / Chrome instance exited), portanto seus 13 cenários não foram executados. Não foram feitas correções nesta etapa, conforme orientação para seguir adiante.
- **Build APK:** APK de debug gerado com sucesso.
- **Suítes APK:** Encerrada com resultado parcial: Playwright 2 aprovados e 7 falhas (conexão e criação inicial); Selenium 9 falhas no Builder, sem sessões funcionais; WebdriverIO aprovou C01–C04, perdeu a WebView durante C05 e foi encerrado, deixando C05–C09 sem validação concluída. Há 6 aprovações, 16 falhas registradas pelas ferramentas e 5 cenários sem resultado individual, dos 27 planejados. Emulador e Appium iniciados para esta rodada foram encerrados.

**Ambiente desta rodada:** macOS arm64; Chrome desktop 155.0.8059.82; Electron 44.4.3 / Chromium 152.0.7977.130; AVD Pixel_8 / WebView Chrome 133.0.6943.137; Appium 3.8.0 / UiAutomator2 8.7.0; JDK 21 na build APK. Base Git 6b3c6bb com alterações locais nos testes e na infraestrutura.

**Artefatos gerados:** Electron em `release/electron/` ([log da build](../../test-results/pocs/validation-2026-10-19/electron/build.log)); APK em `android/app/build/outputs/apk/debug/app-debug.apk` ([log da build](../../test-results/pocs/validation-2026-10-19/android/build.log)).

A cobertura de duas telas usa duas janelas simultâneas; o posicionamento em dois monitores físicos não foi avaliado.

O PWA é instalado de verdade em um perfil de automação isolado e seu modo `standalone` é verificado. O perfil pessoal e a instalação já existente do usuário não são utilizados. O Electron local usa o código compilado em `dist`; a geração de instaladores é uma etapa separada. O APK é de debug e os testes limpam os dados somente do pacote `com.example.tasks.poc`. No Android, Enter/Delete e atalhos de teclado são substituídos pelos controles disponíveis por toque.

## Playwright

### Web

15 testes registrados: 14 aprovados, 1 falharam. [JSON](../../test-results/pocs/validation-2026-10-19/web/playwright/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/web/playwright.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | Verificações concluídas. |

### PWA instalado

13 testes registrados: 13 aprovados. [JSON](../../test-results/pocs/validation-2026-10-19/pwa/playwright/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/pwa/playwright.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | Verificações concluídas. |

### Electron

13 testes registrados: 13 aprovados. [JSON](../../test-results/pocs/validation-2026-10-19/electron/playwright/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/electron/playwright.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | Verificações concluídas. |

### APK Android

**Limites observados:** ocorreram falhas de conexão do dispositivo/página. Alguns outros casos falharam na criação do polígono inicial; nesses casos, a validação específica de edição, nome ou persistência não foi alcançada. Os resultados abaixo não comprovam defeitos nessas funcionalidades.

9 testes registrados: 7 falharam, 2 aprovados. [JSON](../../test-results/pocs/validation-2026-10-19/android/playwright/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/android/playwright.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ❌ Falhou | Error: locator.evaluate: Target page, context or browser has been closed Call log:   - waiting for locator('[data-testid="arcgis-map"]')     - locator resolved to visible &lt;div id="map" data-testid="arcgis-map" aria-label="Mapa para desenhar polígonos" class="esri-view esri-view-width-xsmall esri-view-width-less-than-small esri-view-width-less-than-medium esri-view-width-less-than-large esri-view-width-less-than-xlarge esri-view-height-xsmall esri-view-height-less-than-small esri-view-height-less-than-medium esri-view-height-less-than-large esri-view-height-less-than-xlarge esri-view-orientation-portrait"&gt;…&lt;/div&gt; |
| C02 bloqueia desenhos vazios, incompletos e sem área | ❌ Falhou | Error: Nenhum Android disponível no adb. Inicie um emulador e instale o APK E2E. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ❌ Falhou | Error: expect(locator).toHaveCount(expected) failed  Locator:  locator('[data-testid="polygon-item"]') Expected: 1 Received: 0 Timeout:  10000ms  Call log:   - Expect "toHaveCount" locator('[data-testid="polygon-item"]') with timeout 10000ms   - waiting for locator('[data-testid="polygon-item"]')     23 × locator resolved to 0 elements        - unexpected value "0" |
| C05 valida nomes, acentos e limite de trinta caracteres | ❌ Falhou | Error: expect(locator).toHaveCount(expected) failed  Locator:  locator('[data-testid="polygon-item"]') Expected: 1 Received: 0  Call log:   - Expect "toHaveCount" locator('[data-testid="polygon-item"]') with timeout 10000ms   - waiting for locator('[data-testid="polygon-item"]')     16 × locator resolved to 0 elements        - unexpected value "0"   - Target page, context or browser has been closed |
| C06 cancela alterações de nome e geometria | ❌ Falhou | Error: Nenhum Android disponível no adb. Inicie um emulador e instale o APK E2E. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ❌ Falhou | Error: page.waitForTimeout: Target page, context or browser has been closed |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ❌ Falhou | Error: Nenhum Android disponível no adb. Inicie um emulador e instale o APK E2E. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |

## Selenium

### Web

15 testes registrados: 14 aprovados, 1 falharam. [JSON](../../test-results/pocs/validation-2026-10-19/web/selenium/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/web/selenium.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | Verificações concluídas. |

### PWA instalado

13 testes registrados: 13 aprovados. [JSON](../../test-results/pocs/validation-2026-10-19/pwa/selenium/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/pwa/selenium.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | Verificações concluídas. |

### Electron

**Impedimento de infraestrutura:** todas as tentativas falharam na preparação, ao ajustar o tamanho da janela. Os cenários funcionais, incluindo os de duas telas, não chegaram a ser executados. O Electron desta sessão não oferece `Browser.getWindowForTarget`.

13 testes registrados: 13 falharam. [JSON](../../test-results/pocs/validation-2026-10-19/electron/selenium/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/electron/selenium.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C02 bloqueia desenhos vazios, incompletos e sem área | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C03 seleciona sem editar e permite edição por Enter ou botão | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C04 move a área, arrasta um vértice, insere outro e salva | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C05 valida nomes, acentos e limite de trinta caracteres | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C06 cancela alterações de nome e geometria | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| C09 aplica zoom, gira a bússola e retorna ao norte | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| D02 reúne pela principal e separa novamente sem duplicar dados | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ❌ Falhou | Infraestrutura de controle da janela: unknown command: 'Browser.getWindowForTarget' wasn't found   (Session info: chrome=152.0.7977.130) |

### APK Android

**Impedimento de infraestrutura:** as nove tentativas falharam no Builder antes de criar a sessão Appium, por ausência de `browserName` nas capabilities. Nenhum cenário funcional foi executado por esta ferramenta no APK.

9 testes registrados: 9 falharam. [JSON](../../test-results/pocs/validation-2026-10-19/android/selenium/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/android/selenium.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C02 bloqueia desenhos vazios, incompletos e sem área | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C03 seleciona sem editar e permite edição por Enter ou botão | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C04 move a área, arrasta um vértice, insere outro e salva | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C05 valida nomes, acentos e limite de trinta caracteres | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C06 cancela alterações de nome e geometria | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |
| C09 aplica zoom, gira a bússola e retorna ao norte | ❌ Falhou | Target browser must be a string, but is &lt;undefined&gt;; did you forget to call forBrowser()? |

## WebdriverIO

### Web

15 testes registrados: 13 aprovados, 2 falharam. [JSON](../../test-results/pocs/validation-2026-10-19/web/webdriverio/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/web/webdriverio.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | Verificações concluídas. |

### PWA instalado

13 testes registrados: 12 aprovados, 1 falharam. [JSON](../../test-results/pocs/validation-2026-10-19/pwa/webdriverio/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/pwa/webdriverio.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | Verificações concluídas. |

### Electron

❌ Não foi possível concluir a execução: A ferramenta encerrou sem produzir relatório. ChromeDriver não encontrou DevToolsActivePort; a criação da sessão Electron falhou. Os 13 cenários funcionais não foram executados. [Log](../../test-results/pocs/validation-2026-10-19/electron/webdriverio.log)

### APK Android

**Execução interrompida:** C01–C04 passaram. Durante a tentativa de C05, a sessão perdeu a WebView (`web view not found` / `target window already closed`). A tentativa foi encerrada sem recuperar a sessão; C05 ficou incompleto e C06–C09 não foram executados. O hook de captura não gerou registros individuais desses cinco casos. Não foi atribuída falha funcional às regras de nomes, cancelamento, persistência, exclusão ou navegação.

4 testes registrados: 4 aprovados. [JSON](../../test-results/pocs/validation-2026-10-19/android/webdriverio/results.json) · [Log](../../test-results/pocs/validation-2026-10-19/android/webdriverio.log)

| Teste executado | Resultado | Observação |
| --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | Verificações concluídas. |

**Relatório parcial:** 5 cenários ficaram sem resultado individual. Não foram considerados aprovados nem falhas funcionais. Consulte o log para a interrupção da sessão.

| Cenário sem validação concluída | Situação |
| --- | --- |
| C05 valida nomes, acentos e limite de trinta caracteres | Bloqueado/interrompido por infraestrutura; sem resultado individual. |
| C06 cancela alterações de nome e geometria | Bloqueado/interrompido por infraestrutura; sem resultado individual. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | Bloqueado/interrompido por infraestrutura; sem resultado individual. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | Bloqueado/interrompido por infraestrutura; sem resultado individual. |
| C09 aplica zoom, gira a bússola e retorna ao norte | Bloqueado/interrompido por infraestrutura; sem resultado individual. |
