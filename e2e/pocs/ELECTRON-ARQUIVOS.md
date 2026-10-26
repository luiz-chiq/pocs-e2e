# Electron — importação e exportação sem ChromeDriver

Executado de 2026-10-20T16:58:50.469Z a 2026-10-20T16:59:07.587Z. Evidência: [resultados JSON](../../test-results/pocs/electron-direct-final/results.json).

## Sumário

- [Resumo](#resumo)
- [Testes por ferramenta](#testes-por-ferramenta)
- [Implementação e limites](#implementação-e-limites)

## Resumo

**Modalidade atual: sem ChromeDriver.** Playwright controla o Electron diretamente; Selenium tenta uma sessão nativa Appium/Mac2. Não há fallback para ChromeDriver. Sessão indisponível não é aprovação nem falha funcional dos cenários.

N01–N05 têm contagem própria, separada dos 100 casos C/D anteriores. Esta rodada não reexecuta web, PWA, Android ou o catálogo C/D.

| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |
| --- | --- | --- | --- | --- | --- |
| Playwright | 5 | 0 | 0 | 8.46 s | — |
| Selenium | 0 | 0 | 5 | — | — |

Cada duração executada inclui lançamento com perfil novo, cenário e encerramento; exclui build e preparação externa. Cenários não executados não recebem duração zero. O tempo da tentativa de criar a sessão Mac2 aparece separadamente abaixo, sem ser confundido com execução dos cinco testes. Não há percentual comparativo com uma ferramenta sem execução.

## Testes por ferramenta

### Playwright

| Cenário | Resultado | Duração |
| --- | --- | --- |
| N01 importa e exporta nomes e coordenadas usando IPC e disco real | Passou | 3.11 s |
| N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos | Passou | 1.09 s |
| N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente | Passou | 1.22 s |
| N04 informa erros de leitura e escrita sem perder dados nem deixar temporários | Passou | 1.20 s |
| N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados | Passou | 1.84 s |

### Selenium

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

## Implementação e limites

- **Playwright:** `_electron.launch` abre o app empacotado. `electronApplication.evaluate` configura somente a resposta dos diálogos no processo principal e lê a auditoria. Não usa ChromeDriver nem POLYGON_E2E_DIALOG_PLAN. Os cliques da interface, preload, IPC, validação e operações de disco são reais. O seletor visual do sistema continua simulado.
- **Selenium:** a tentativa nativa Appium Mac2/WebDriverAgentMac não iniciou por falta de Xcode completo. Nenhum N01–N05 nativo foi validado nessa integração. O bootstrap é diagnóstico de sessão; os cenários ainda precisam ser adaptados e validados com seletores de acessibilidade. O Mac2 está separado do Android em `test-results/appium-mac2`. [Requisitos Mac2](https://appium.github.io/appium-mac2-driver/latest/getting-started/).
- Appium é o servidor e Mac2 é seu driver nativo macOS. Usar Appium não elimina automaticamente ChromeDriver: no Android/WebView ele pode continuar necessário.
- O [Playwright](https://playwright.dev/docs/api/class-electron) não oferece Appium como backend. Pode-se combinar bibliotecas no mesmo runner, usando Playwright para renderer/main e outro cliente para ações nativas via Appium. Os cinco testes atuais não usam Appium.
- Os mesmos cenários TypeScript verificam JSON com nomes/coordenadas, persistência após reload, cancelamento, rejeição atômica de arquivos inválidos, erros de disco/limpeza e duas janelas. O main continua lendo/gravando os arquivos reais. A rodada atual usa o novo fundo World Imagery. Não foram testados Windows/Linux, instalador nem o seletor nativo visual.

### Pré-requisitos pendentes

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

[Rodada histórica das três ferramentas](old/ELECTRON-ARQUIVOS-COM-CHROMEDRIVER.md): preservada como evidência anterior, em outra modalidade. Esses resultados não são aprovações da tentativa nativa atual. A implementação completa está na branch codex/poc-tres-ferramentas. A implementação antiga de arquivos com ChromeDriver está preservada nessa branch.
