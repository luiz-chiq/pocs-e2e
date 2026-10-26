# POCs E2E — Playwright e Selenium

A `main` contém somente **Playwright e Selenium**, em JavaScript/TypeScript.
A branch `codex/poc-tres-ferramentas`, commit `98f49f5`, preserva o estado completo
anterior com três ferramentas, incluindo configurações, testes, relatórios e
trabalho Android em andamento. Binários, `node_modules` e resultados locais
ignorados pelo Git não fazem parte do snapshot.

## Documentos

- [Relatório completo](RELATORIO.md)
- [Relatório direto](RELATORIO-DIRETO.md)
- [Estado atual](STATUS.md)
- [Comparativo para decisão](COMPARATIVO-PLAYWRIGHT-SELENIUM.md)
- [Limitações](LIMITACOES.md)
- [Portabilidade](PORTABILIDADE.md)
- [Arquivos Electron](ELECTRON-ARQUIVOS.md)
- [Histórico](old/README.md)

## Executar

```bash
npm ci
npx playwright install chromium
npm run build:e2e
npm run preview
```

Com o preview ativo em outro terminal:

```bash
# As duas ferramentas em sequência
npm run test:poc:web

# Uma ferramenta
npm run test:poc:playwright
npm run test:poc:selenium
```

`POC_FRAMEWORKS=playwright` ou `POC_FRAMEWORKS=selenium` restringe o orquestrador.
`POC_RESULTS_DIR` define a pasta das evidências. O catálogo web tem 15 casos por
ferramenta, incluindo quatro verificações de duas janelas e C10 mouse/touch.
A falha C10 mouse é intencional; não foi invertida ou ignorada.

```bash
npm run test:poc:pwa
npm run test:poc:electron
npm run test:poc:android
npm run test:poc:all
```

PWA instala e abre uma janela standalone em perfil isolado. Electron e Android
são compilados pelo orquestrador. Android exige SDK/JDK, um AVD ou dispositivo
de testes e o driver UiAutomator2 instalado para o Appium local:

```bash
npx appium driver install uiautomator2
```

Use `ANDROID_AVD`, `ANDROID_SERIAL`, `ANDROID_HOME` e `ANDROID_JAVA_HOME` para
selecionar o ambiente. Appium e emulador podem ser iniciados pelo orquestrador.
A suíte C/D Android usa a WebView; não inclui duas janelas ou instalação de PWA.

## Arquivos Electron

```bash
npm run electron:build:poc
npm run test:electron:files
npm run test:poc:electron:files
```

A modalidade padrão não usa ChromeDriver: Playwright controla Electron/main;
Selenium tenta uma sessão nativa Appium/Mac2. A sessão Mac2 exige Xcode completo
no macOS. Sem sessão, os casos correspondentes não recebem aprovação e o comando
encerra com código 2. O bootstrap Mac2 ainda não implementa os cenários visuais
completos. A escolha do caminho nos cinco cenários Playwright é simulada; IPC,
validação e leitura/gravação dos arquivos são reais.

A modalidade antiga de arquivos Electron com ChromeDriver foi removida da main.
A implementação anterior permanece na branch `codex/poc-tres-ferramentas`.
Isso não altera a suíte comparativa C/D Selenium no Electron, que ainda usa
um ChromeDriver compatível.

## Protótipo Android: Playwright + Appium

```bash
npm run test:poc:android:hybrid
npm run test:appium:native
```

Playwright opera a WebView. O cliente Selenium JS envia comandos nativos ao
Appium/UiAutomator2, sem entrar no contexto WebView do Appium. O adaptador está
em [appium-native.ts](shared/appium-native.ts); seus testes de contrato usam
servidor simulado e não substituem execução no APK.

A troca do cliente ainda precisa de revalidação no emulador. A tentativa
anterior terminou com 1 aprovação e 7 falhas de execução; não comprova os fluxos
novos de arquivos/permissões. Ela é separada dos resultados Android C01–C09.
O plugin Android usa o seletor de documentos para importar e solicita acesso
à pasta escolhida para exportar; não pede acesso amplo ao armazenamento.

## Relatórios e evidências

```bash
npm run report:poc
npm run report:poc:check
```

Os relatórios atuais filtram somente Playwright/Selenium das evidências
existentes: oito combinações e 100 casos C/D. Não houve nova execução completa
por remover a terceira ferramenta. As 24 verificações de duas janelas pertencem
a web, PWA e Electron. Arquivos do main Electron têm contagem separada.

Os tempos continuam separados por ferramenta e plataforma. Percentuais só são
comparados quando as duas suítes vêm da mesma rodada e estão completas.
Totais contínuos antigos que incluíam a ferramenta arquivada não são usados
como totais das duas ferramentas. Resultados não executados não recebem tempo
zero. `test-results/` é local e ignorado pelo Git; sem os JSONs de origem,
não é possível regenerar/auditar os números históricos.

Os arquivos em `old/` mantêm resultados históricos, inclusive da ferramenta
removida. Os comandos e fontes anteriores podem ser consultados na branch de
preservação. As referências históricas não significam dependência executável
na `main`.
