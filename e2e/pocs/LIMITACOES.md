## Aprendizados das rodadas anteriores

Esta seção registra a análise da revalidação anterior. Os resultados da rodada atual estão na matriz e na lista de falhas do relatório; os episódios abaixo não são contados novamente como falhas atuais.

O resultado funcional deveria convergir para o mesmo app, estado e interação. Os cenários têm os mesmos objetivos, mas seus adaptadores não reproduzem exatamente a mesma sequência e duração de eventos. Selenium e WebdriverIO usam Appium no Android; Playwright conecta diretamente à WebView via sua API Android e usa CDP nos gestos do mapa. Os métodos de preenchimento, rolagem, esperas e isolamento também diferem. Isso limita a comparação atual.

| Falha observada | O que a evidência comprova | O que ainda não foi comprovado |
| --- | --- | --- |
| Playwright/Android — C03 | Antes de testar seleção, chegaram três eventos de toque confiáveis ao mapa; a consulta de desenho confirmou dois vértices, mesmo após a espera de 5 s. A criação inicial não terminou. | A causa do vértice ausente: pode envolver entrega/processamento do gesto, estado do SDK ou comportamento do app. Não há evidência suficiente para atribuir a falha exclusivamente ao Playwright ou ao aplicativo. |
| WebdriverIO/Android — C05 | O campo indicou nome vazio/inválido. Após o gesto de concluir, o aviso do topo permaneceu sem `role="alert"`. A suíte parou nessa verificação, antes dos nomes válidos e do limite de caracteres. Esse caso havia passado na tentativa anterior. | Não foi confirmado se o toque acionou o handler de concluir. Mudanças de posição ao rolar/fechar o teclado e uma divergência do app são hipóteses; não houve telemetria suficiente do botão para distinguir essas causas. |

O 9/9 do Selenium confirma que os cenários passaram naquela execução. Não prova que o app esteja livre de problemas intermitentes nem que os outros resultados sejam falsos positivos. **Naquelas rodadas históricas, essas duas falhas ficaram inconclusivas quanto à causa; elas não constam como falhas no consolidado atual**, apesar de suas asserções terem falhado. A falha anterior de C08 no WebdriverIO era uma transição não aguardada pela automação: o mapa faz `hitTest` assíncrono; depois de esperar o botão voltar ao modo de criação, a suíte completa passou por C08.

As diferenças podem ser verificadas nos adaptadores de [Playwright](playwright/web.spec.ts), [Selenium](selenium/web.test.ts) e [WebdriverIO](webdriverio/web.e2e.ts). Para uma comparação de confiabilidade, falta igualar a política de isolamento e os contratos de gestos/esperas, registrar alvo/coordenadas/viewport e acionamento do botão, e repetir os cenários com o mesmo APK e emulador. Isso permitiria medir frequência de falhas, além do resultado de uma execução. A rodada comparativa de métricas repetiu as suítes existentes, sem normalizar essas diferenças entre adaptadores. A revalidação posterior do Selenium/Playwright ajusta alguns gestos e esperas; seus novos tempos são apresentados separadamente.

## Limitações por ferramenta em Electron e Android

“Documentada” indica uma restrição da integração; “observada” descreve esta POC e não uma incapacidade geral da ferramenta.

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | **Documentada:** integração `_electron` experimental; o lançamento depende de configuração compatível com inspeção Node. Diálogos nativos do sistema não são tratados como elementos da página. **Escopo da POC:** app macOS empacotado e duas janelas; instalador e diálogos nativos não avaliados. [Documentação Electron](https://playwright.dev/docs/api/class-electron). | **Documentada:** API Android experimental, voltada a Chrome/WebView; requer ADB. Há limitações de cobertura e captura exige dispositivo acordado. **Observada:** esta POC exercita a WebView do Capacitor; reconexão após reiniciar o app exigiu esperar o PID correto. O resultado atual é 9/9; oscilações anteriores estão preservadas no histórico. [Documentação Android](https://playwright.dev/docs/api/class-android). |
| Selenium | **Integração:** usa ChromeDriver e o executável do Electron, com configuração própria. Controlar a página não fornece automaticamente automação de menus/diálogos do sistema ou das APIs do processo principal. **Observada:** redimensionar por WebDriver falhou em `Browser.getWindowForTarget`; o bootstrap passou a usar o tamanho original. [Guia do Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium). | **Integração:** nesta POC, Selenium é o cliente de Appium/UiAutomator2; Selenium sozinho não é o driver do APK. Precisa de WebView depurável, contexto correto e ChromeDriver compatível. **Observada:** `browserName` precisou ficar vazio para abrir o app; a rotina genérica de esconder teclado enviava Escape e interrompia a edição. O ajuste atual consulta o teclado e envia somente Back nativo quando o IME está aberto, sem trocar/recriar o contexto WebView; também aguarda geometria estável e entrega do clique confiável. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |
| WebdriverIO | **Integração atual da POC:** WDIO conecta diretamente ao ChromeDriver oficial compatível, abrindo o binário Electron por WebDriver clássico. O serviço Electron continua sendo uma opção da ferramenta, mas seus hooks de bridge/foco não são usados nesta suíte. **Diagnóstico:** `DevToolsActivePort` era gravado no perfil definido pelo app e procurado em outro pelo driver; os diretórios agora coincidem. A versão é explícita para evitar a consulta `--version` ao app empacotado. **Limites:** usa os tamanhos definidos pelo app, sem `Browser.getWindowForTarget`; não oferece acesso genérico ao processo principal nem automatiza os diálogos nativos visuais. O fluxo restrito de IPC e arquivos do main é exercitado na rodada adicional N01–N05. O catálogo e as asserções funcionais foram preservados; a espera do D01 reconsulta o rótulo selecionado a cada leitura, pois os nós são reutilizados. [Serviço Electron](https://webdriver.io/docs/desktop-testing/electron/). | **Integração:** também usa Appium/UiAutomator2 e ChromeDriver para a WebView; compartilha essas dependências com Selenium. **Observada:** reutiliza a sessão entre casos; rolagem, teclado e a espera pela desseleção precisam ser coordenados. O resultado atual é 9/9; a troca de contextos e as transições de teclado ainda exigem coordenação no adaptador. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |

A documentação atual do WebdriverIO apresenta `@wdio/electron-service`; o projeto mantém `wdio-electron-service` 9.2.1 para a configuração legada. A suíte POC passou a conectar diretamente ao ChromeDriver, sem atualizar dependências. A diferença entre nomes/versões de pacotes não foi comprovada como causa do problema; o desencontro de perfis foi confirmado no log. A etapa seguinte revalidou web nas três ferramentas e WDIO/PWA: todos os cenários funcionais passaram; só C10 mouse permaneceu falhando por causa do defeito intencional. O C08 Playwright passou antes do novo preparo de foco, portanto a causa da intermitência anterior segue inconclusiva. O teste agora clica de verdade no polígono e confirma foco no mapa antes de Delete; passou em três verificações isoladas e na suíte completa, sem prova estatística de estabilidade. Electron/Android não foram reexecutados nessa etapa web. [Configuração documentada](https://webdriver.io/docs/desktop-testing/electron/).

**Limites comuns desta execução:** Electron foi avaliado apenas no macOS arm64; Android apenas no AVD Pixel_8, com APK de debug e WebView depurável. Não foram avaliados aparelho físico, APK release sem depuração, plugins nativos do Capacitor, permissões do sistema, outras versões de Android/WebView ou o carregamento visual de todos os tiles do mapa de fundo. As verificações do mapa se concentram nas geometrias, rótulos, controles e estados descritos nos cenários. Os testes de duas janelas verificam sincronização, sem posicionamento em dois monitores físicos. A ausência de duas janelas e de Enter/Delete no APK corresponde ao escopo deste app/testes, não a uma limitação geral das ferramentas.

## Criação de arquivos e cobertura E2E

Criar/exportar um arquivo pode fazer parte de E2E: o usuário aciona a função
pela interface e o teste verifica o arquivo realmente gerado e seu conteúdo.
Ler esse arquivo pelo processo de testes não substitui a ação do aplicativo.
Criar o arquivo artificialmente e conferir sua existência não valida a exportação.

No Electron, o runner Node pode observar arquivos acessíveis na máquina de teste.
O Playwright oferece acesso ao processo principal; o WDIO também possui essa
possibilidade por seu serviço Electron, mas a suíte desta POC usa ChromeDriver
direto e não utiliza a bridge do serviço. Um seletor nativo “Salvar como” não é
um elemento HTML: automatizá-lo exige tratamento próprio. Simular somente sua
resposta deixa o seletor do sistema fora da cobertura, mesmo que a gravação seja real.
[Playwright/Electron](https://playwright.dev/docs/api/class-electronapplication),
[serviço WDIO/Electron](https://webdriver.io/docs/desktop-testing/electron/).

No Android, Selenium e WDIO usam Appium/UiAutomator2 para alternar entre WebView
e interface nativa e recuperar arquivos. Arquivos privados exigem acesso permitido
no dispositivo; a transferência por caminho interno do pacote depende de build
depurável. O Playwright também tem ações nativas e shell via ADB, em integração
experimental. As capabilities atuais do Appium concedem permissões automaticamente;
recusa de permissões não foi avaliada.
[Arquivos no Appium](https://github.com/appium/appium-uiautomator2-driver#files-management),
[ações Android no Playwright](https://playwright.dev/docs/api/class-androiddevice).

**Cobertura atual:** o catálogo original C/D cobre a persistência em C07, sem
importação/exportação. A nova rodada [Electron — arquivos](ELECTRON-ARQUIVOS.md)
exercita o processo principal via IPC nas três ferramentas: importação/exportação
JSON, nomes/coordenadas, cancelamento, rejeição atômica de arquivos inválidos,
erros de disco e sincronização entre duas janelas. A leitura/gravação é real;
somente a escolha/cancelamento no diálogo é simulada. O seletor nativo visual
continua fora da cobertura. Isso não dá acesso genérico ao processo principal
para Selenium/WDIO: os clientes acionam os botões e observam os efeitos da API
restrita do aplicativo. O serviço Electron do WDIO continua sem uso nesta rodada.
