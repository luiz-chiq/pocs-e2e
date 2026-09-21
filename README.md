# Pins ArcGIS POC

Uma aplicação de pins nomeados, usando o ArcGIS Maps SDK for JavaScript, com a mesma interface preparada para três embalagens: PWA, Electron para Windows e Android via Capacitor. Ela existe para validar a estratégia de automação E2E.

## Execução

```bash
npm install
npm run dev
```

Abra a URL indicada pelo Vite, normalmente `http://localhost:5173`. Navegadores consideram `localhost` um contexto seguro para desenvolvimento, portanto o service worker funciona sem certificado local.

## PWA

```bash
npm run build
npm run preview
```

Instale pelo menu do navegador. Em produção, publique o conteúdo de `dist/` atrás de HTTPS.

## Teste E2E

Em um terminal, execute `npm run preview`. Em outro:

```bash
npm run test:e2e
```

Para acompanhar a execução no Chrome, em vez do modo headless:

```bash
HEADLESS=false npm run test:e2e
```

## Comparação: WebdriverIO e Playwright

As duas stacks executam os mesmos sete cenários de negócio — criação, edição,
cancelamento, persistência, exclusão e painel lateral — contra a mesma PWA e
os mesmos atributos `data-testid`.

| Stack | Arquivo | Comando |
| --- | --- | --- |
| WebdriverIO | `e2e/cancel-edit.e2e.ts` | `npm run test:e2e` |
| Playwright | `e2e/playwright/cancel-edit.spec.ts` | `npm run test:e2e:playwright` |

O Playwright inicia o Vite automaticamente; a suíte WebdriverIO continua
esperando que `npm run preview` ou `npm run dev` esteja ativo em outro terminal.
Para acompanhar a execução do Playwright no navegador, use:

```bash
npm run test:e2e:playwright:visual
```

O teste cria dois pins em posições distintas do mapa, confirma que ambos foram salvos e abre o popup ArcGIS de cada um para validar seus nomes. Os atributos `data-testid` são contratos de automação próprios; o conteúdo do popup é validado no componente real do ArcGIS.

## ArcGIS

O mapa usa `MapView`, `GraphicsLayer`, `Graphic` e `PopupTemplate` do ArcGIS. Sem credencial, a POC utiliza tiles públicos do OpenStreetMap como base para não expor uma chave no repositório. Para usar um basemap ArcGIS, crie um arquivo `.env.local` com:

```bash
VITE_ARCGIS_API_KEY=sua_chave_publica_restrita_por_referrer
```

Nunca inclua uma chave privada ou com privilégios além de basemap no repositório.

## A mesma suíte nos três alvos

Os cenários de negócio ficam em um único arquivo: `e2e/cancel-edit.e2e.ts`.
Ele valida criar, mover, editar vértices, inserir vértice, cancelar, persistir,
excluir e recolher o painel. As configurações abaixo só definem em qual
embalagem essa mesma suíte será executada:

| Alvo | Comando |
| --- | --- |
| Site/PWA (Chrome) | `npm run test:e2e` |
| Electron (macOS ou Windows) | `npm run test:e2e:electron` |
| Android (Capacitor WebView) | `npm run test:e2e:android` |

## Electron

Electron para Windows:

```bash
npm run electron:build
```

Teste Electron local (macOS ou Windows):

```bash
npm run test:e2e:electron
```

No macOS, esse comando usa o Electron local e valida a aplicação desktop. No Windows, use o mesmo cenário contra o `.exe` empacotado na etapa de release.

## Android

Para o teste E2E Android, instale Android Studio/SDK, crie ou inicie um
emulador (ou conecte um dispositivo com depuração USB), e instale Appium e o
driver UiAutomator2 uma vez na máquina:

```bash
npm install --global appium
appium driver install uiautomator2
```

Gere e instale a versão atual do app:

```bash
npm run test:e2e:android:build
```

Em um terminal, inicie o servidor Appium. Em outro, execute a mesma suíte:

```bash
appium
npm run test:e2e:android
```

Caso o nome do emulador não seja `Android Emulator`, informe-o com
`ANDROID_DEVICE_NAME="nome exibido pelo adb" npm run test:e2e:android`.
O diretório `android/` é a embalagem nativa; código de negócio, interface e
casos de E2E continuam compartilhados.
