# Limitações — Playwright e Selenium

A `main` mantém duas ferramentas. O código da comparação anterior está na
branch `codex/poc-tres-ferramentas`, commit `98f49f5`; os relatórios antigos em
`old/` preservam os números e as limitações observadas em suas execuções.

## Limitações por ferramenta em Electron e Android

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | Integração `_electron` experimental; exige configuração compatível de inspeção. Permite acesso ao main. Diálogos nativos não são elementos DOM. | API Android experimental para Chrome/WebView e algumas ações nativas; exige ADB e WebView depurável. Reconexões, gestos e ciclo de vida precisam de validação. |
| Selenium | A suíte JS C/D usa ChromeDriver compatível com o Chromium do Electron. Controlar a página não dá acesso genérico ao main nem ao seletor do SO. | Usa Appium/UiAutomator2. O contexto WebView normalmente usa ChromeDriver; contexto nativo usa acessibilidade e comandos próprios de Appium. |

Fontes: [Playwright Electron](https://playwright.dev/docs/api/class-electron),
[Playwright Android](https://playwright.dev/docs/api/class-android),
[Electron/Selenium](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium),
[UiAutomator2](https://github.com/appium/appium-uiautomator2-driver).

## Escopo das execuções preservadas

C/D: web/PWA em Chrome, Electron macOS arm64 e APK debug no emulador Pixel_8.
Windows, instaladores, aparelhos físicos e todas as versões Android/WebView
não foram validados. Duas janelas não equivalem a dois monitores físicos.
O APK C03/C08 usa controles da interface, sem Enter/Delete físicos.
As falhas de instalação C10 mouse são intencionais e continuam contabilizadas.

Os resultados C/D anteriores não validam automaticamente a implementação atual
de arquivos Android ou o novo cliente Appium. As implementações têm políticas
de sessões, gestos e esperas diferentes; uma execução não mede estabilidade
estatística nem determina um ranking universal de desempenho.

## Arquivos e processo principal

Criar/exportar arquivos faz parte de E2E quando a ação vem da interface e o
arquivo real é conferido. Criar o arquivo no teste e verificar sua existência
não valida a exportação do aplicativo.

Os [cinco cenários Playwright de arquivos Electron](ELECTRON-ARQUIVOS.md)
passaram na execução indicada, usando main, preload, IPC e disco reais.
Somente a resposta de seleção/cancelamento do diálogo foi simulada; a interação
visual com o seletor nativo não foi testada. Selenium/Mac2 tentou iniciar a
sessão nativa, sem sucesso por falta de Xcode completo. O diagnóstico não é uma
implementação completa dos cenários pela árvore de acessibilidade.

## Protótipo híbrido Android

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
