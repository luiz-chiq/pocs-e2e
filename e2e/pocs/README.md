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
- [Diagnóstico com falha real: Playwright e Selenium](DIAGNOSTICO.md)
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

O alvo padrão das POCs web e PWA é `http://localhost:4173/`, servido a partir
da pasta `dist/` gerada por `build:e2e`. O preview usa a porta 4173 fixa e
encerra com erro se ela estiver ocupada. Os comandos de teste não iniciam
o preview automaticamente. Electron e Android usam suas builds empacotadas.
Para testar outro endereço, defina `BASE_URL` explicitamente.

Com o preview ativo em outro terminal:

```bash
# As duas ferramentas em sequência, com cenários web em paralelo
npm run test:poc:web

# Uma ferramenta
npm run test:poc:playwright
npm run test:poc:selenium
```

`POC_FRAMEWORKS=playwright` ou `POC_FRAMEWORKS=selenium` restringe o orquestrador.
`POC_RESULTS_DIR` define a pasta das evidências. O catálogo web tem 15 casos por
ferramenta, incluindo quatro verificações de duas janelas e C10 mouse/touch.
A falha C10 mouse é intencional; não foi invertida ou ignorada.

### Paralelismo web

Os comandos web executam até dois cenários simultaneamente por ferramenta
(um em máquinas com apenas um processador disponível). Cada cenário mantém
seu próprio contexto ou perfil de navegador e suas próprias evidências.
Playwright e Selenium continuam em sequência para limitar o uso de memória.
Os comandos individuais usam o mesmo limite.

No PowerShell, é possível ajustar o limite antes de executar:

```powershell
$env:POC_WORKERS = "4"
npm run test:poc:web

# Voltar à execução individual para diagnóstico ou comparação de tempos
$env:POC_WORKERS = "1"
npm run test:poc:web

# Restaurar o padrão
Remove-Item Env:POC_WORKERS
```

O limite é por cenário, inclusive os que abrem duas janelas. Mais cenários
simultâneos exigem mais memória e GPU; aumentar o limite nem sempre reduz
o tempo total. Android, PWA e Electron permanecem com um cenário por vez,
mesmo com `POC_WORKERS` maior. No Playwright, `fullyParallel` permite dividir
os cenários do mesmo arquivo; no Selenium, a concorrência é definida na suíte
do Node, pois `--test-concurrency` sozinho só distribui arquivos diferentes.

Os JSONs registram `workers`, `startedAt` e `finishedAt` para conferir a
sobreposição dos cenários. Para comparar rodadas, use o tempo total da suíte;
a soma dos tempos individuais não corresponde ao tempo decorrido em paralelo.
Antes dos gestos de edição, os testes aguardam o mapa parar e o SDK preparar
as alças, em vez de depender apenas de uma pausa fixa. A janela separada também
aguarda a inicialização do seu próprio mapa antes de verificar a conexão.
No Playwright web, C07 recebe 45 segundos adicionais no limite total para fechar
e iniciar o segundo processo Chrome; os limites das asserções não aumentam.
A limpeza dos perfis Selenium é assíncrona, para que a liberação de arquivos de
um navegador no Windows não bloqueie os demais cenários.

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

## Esperas de navegação nos cenários C09 e D01

C09 aguarda o mapa parar e parte de um nível de zoom definido antes de verificar
zoom de ida e volta. O enquadramento automático dos cards usa escala livre;
comparar diretamente essa escala com os níveis dos botões gerava uma falha falsa.
A comparação de retorno continua exigindo diferença inferior a 0,5 pixel.

D01 aguarda o enquadramento do segundo polígono, consulta novamente a posição
do primeiro pelo seu identificador e reduz o zoom pelos controles quando ele
está fora da tela. O clique e as demais edições continuam sendo interações reais.
A API de E2E apenas fornece estado e coordenadas, sem selecionar ou alterar áreas.
No Selenium, o clique no segundo card reconsulta o elemento se a sincronização
recriar a lista. A limpeza do perfil temporário também repete tentativas no
Windows, e eventuais falhas dessa etapa são incluídas no relatório.

Esses ajustes não alteram C10 mouse.

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
