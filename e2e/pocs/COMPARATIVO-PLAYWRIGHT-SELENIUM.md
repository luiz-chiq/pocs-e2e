# Playwright e Selenium — análise para decisão

Data de referência: **25/10/2026**. WebdriverIO está fora das alternativas avaliadas. A análise considera testes em JavaScript/TypeScript, web/PWA, Electron e APK Capacitor, incluindo arquivos e permissões nativas. É uma análise documental e do código/evidências existentes; não é uma nova execução dos testes.

## Sumário

- [Recomendação para o projeto](#recomendação-para-o-projeto)
- [Features](#features)
- [Releases](#releases)
- [Uso no mercado](#uso-no-mercado)
- [Ferramentas](#ferramentas)
- [Plugins e integrações](#plugins-e-integrações)
- [Facilidades](#facilidades)
- [Vantagens](#vantagens)
- [Limitações](#limitações)
- [Quem mantém](#quem-mantém)
- [O que a POC comprova](#o-que-a-poc-comprova)
- [Critérios para a decisão final](#critérios-para-a-decisão-final)

## Recomendação para o projeto

**Minha recomendação preliminar é Playwright como base dos testes web/PWA e Electron, com Appium para os fluxos nativos que precisarem dele.** O encaixe com TypeScript, a depuração integrada e o acesso ao processo principal Electron favorecem esse caminho. Esta é uma avaliação de adequação, não uma superioridade universal ou uma promessa de menor tempo em qualquer cenário.

**Selenium + Appium passa a ser a escolha mais atraente se a prioridade for uniformizar o cliente WebDriver entre navegador e dispositivos, aproveitar uma infraestrutura Grid existente ou trabalhar com equipes/bases de testes em várias linguagens.** O time precisa aceitar montar runner, asserções, relatórios e diagnóstico com componentes adicionais. No Android híbrido, também precisa considerar ChromeDriver ao acessar o DOM da WebView pelo UiAutomator2.

Nenhuma alternativa cobre automaticamente todo o sistema operacional. Seletores nativos, permissões, instaladores e diálogos exigem integração e validação específicas da plataforma.

## Features

O comparativo usa **Playwright Test em Node.js** contra **Selenium WebDriver com um runner escolhido pelo time**. Comparar somente as bibliotecas de automação esconderia parte importante da experiência entregue pelo Playwright Test. A POC Selenium atual utiliza `node:test`.

| Capacidade | Playwright | Selenium | Consequência para este projeto |
| --- | --- | --- | --- |
| Interface web, formulários, frames e abas/janelas | Disponível | Disponível | Ambos cobrem os cenários principais e a sincronização entre janelas. |
| Navegadores | Chromium, Firefox e WebKit; canais Chrome/Edge | Chrome, Edge, Firefox e Safari pelos drivers correspondentes | WebKit do Playwright não equivale a executar o Safari instalado. |
| Linguagens oficiais | JS/TS, Python, Java e .NET | JavaScript, Java, Python, .NET e Ruby | Selenium funciona em JS/TS; a escolha não obriga migrar para Java. |
| Runner e asserções | Playwright Test inclui ambos | Selecionados separadamente | Selenium oferece mais liberdade de composição; Playwright reduz o preparo inicial. |
| Esperas e sincronização | Verificações automáticas antes de ações e asserções que repetem a consulta | Esperas explícitas e estratégias configuráveis | Ambos precisam aguardar os estados de negócio, como concluir importação ou sincronizar o mapa. |
| Isolamento | Contextos de navegador e fixtures integrados | Sessões e preparação/limpeza organizadas pelo framework do time | O custo real depende da política de isolamento, não só da ferramenta. |
| Paralelismo | Workers e divisão da suíte entre executores integrados ao runner | Runner para concorrência e Grid para distribuir sessões | Grid distribui sessões; não substitui o runner. |
| Rede e mocks | APIs diretas para observar, interceptar e responder requisições | WebDriver BiDi/CDP, conforme navegador e binding | É incorreto dizer que Selenium não tem interceptação de rede; a disponibilidade precisa ser validada na combinação usada. |
| API HTTP | Cliente de API integrado | Biblioteca HTTP complementar | Playwright facilita cenários combinando preparação por API e validação pela UI. |
| Regressão visual | Asserções de screenshots no runner | Captura de screenshots; comparação depende de biblioteca/serviço | Em ambos, imagens do mapa exigem controlar dados e condições visuais. |
| Upload e download web | APIs de seleção de arquivos e acompanhamento de download | Upload HTML; downloads dependem do fluxo, driver/ambiente e tratamento adicional | Campo HTML e seletor nativo são coberturas diferentes. |
| Electron | API experimental para renderer, janelas e execução no main | Integração WebDriver/ChromeDriver para a interface; não oferece o mesmo acesso genérico ao main na nossa implementação JS | Vantagem prática do Playwright para a feature de arquivos pelo processo principal. |
| Android real/emulador | API Android experimental para Chrome/WebView, com algumas ações nativas e ADB | Integração com Appium e driver Android | Playwright sozinho não substitui uma estratégia de testes nativos. Selenium sozinho também não. |
| Permissões e diálogos do sistema | Configuração de permissões web; automação nativa complementar quando necessária | Appium/driver nativo ou outra integração apropriada | Dar permissão antecipadamente não comprova o fluxo visual de consentimento. |

Fontes: [Playwright Test](https://playwright.dev/docs/intro), [linguagens Playwright](https://playwright.dev/docs/languages), [navegadores Playwright](https://playwright.dev/docs/browsers), [rede Playwright](https://playwright.dev/docs/network), [navegadores Selenium](https://www.selenium.dev/documentation/webdriver/browsers/), [esperas Selenium](https://www.selenium.dev/documentation/webdriver/waits/), [Selenium Grid](https://www.selenium.dev/documentation/grid/), [WebDriver BiDi](https://www.selenium.dev/documentation/webdriver/bidi/), [Appium](https://appium.io/docs/en/latest/intro/).

## Releases

### Versões verificadas

| Indicador | Playwright | Selenium |
| --- | --- | --- |
| Estável mais recente consultada | **1.64.1**, publicada em **14/10/2026** | **4.51.0**, publicada em **09/10/2026** |
| Releases estáveis anteriores | 1.64.0 em 07/10; 1.63.0 em 04/09; 1.62.0 em 24/07 | 4.50.0 em 30/09; 4.49.0 em 09/09; 4.48.0 em 27/08 |
| Versão efetivamente instalada nesta POC | **1.63.0** de `@playwright/test` | **4.51.0** de `selenium-webdriver` |
| Principal cuidado de atualização | Atualizar pacote e binários compatíveis dos navegadores; revalidar integrações experimentais | Compatibilidade entre binding, navegador e driver; revalidar BiDi e componentes adicionais |

As datas mostram desenvolvimento ativo nos dois projetos. A amostra não estabelece calendário fixo ou SLA de correções. Nightly/pré-release foi excluída da comparação de estáveis.

Um exemplo relevante: a 1.64.1 do Playwright corrige a perda intermitente da primeira janela de Electron empacotado introduzida na 1.64.0. Isso **não** explica as falhas Android desta POC, instalada em 1.63.0, nem comprova que atualizar resolveria a integração Android.

Selenium Manager automatiza descoberta, download e cache de drivers/navegadores nas situações suportadas. Isso reduz trabalho manual, mas **não elimina o driver** nem resolve automaticamente toda configuração específica de Electron e Appium.

Fontes: [Playwright 1.64.1](https://github.com/microsoft/playwright/releases/tag/v1.64.1), [histórico Playwright](https://github.com/microsoft/playwright/releases), [Selenium 4.51.0](https://github.com/SeleniumHQ/selenium/releases/tag/selenium-4.51.0), [histórico Selenium](https://github.com/SeleniumHQ/selenium/releases), [Selenium Manager](https://www.selenium.dev/documentation/selenium_manager/). Os valores consultados nas APIs estão no [registro da pesquisa](../../test-results/research/playwright-selenium-2026-10-25.json).

## Uso no mercado

### Indicador quantitativo comparável no ecossistema Node.js

Downloads registrados pelo npm no **mesmo período, de 25/09/2026 a 24/10/2026**:

| Pacote | Downloads |
| --- | ---: |
| `@playwright/test` | 251.709.143 |
| `selenium-webdriver` | 5.972.005 |

Fontes primárias: [API npm — Playwright Test](https://api.npmjs.org/downloads/point/2026-09-25:2026-10-24/@playwright/test), [API npm — Selenium JS](https://api.npmjs.org/downloads/point/2026-09-25:2026-10-24/selenium-webdriver). Uma cópia das respostas está no [registro local](../../test-results/research/playwright-selenium-2026-10-25.json).

**Interpretação:** há muito mais atividade de download do pacote Playwright Test neste recorte Node.js. Isso é um sinal favorável à relevância do ecossistema JS/TS para o nosso time.

**Limite:** downloads incluem CI, reinstalações e automações; não contam usuários únicos, empresas, vagas ou projetos ativos. O número do Selenium não inclui Java, Python, .NET e Ruby. Portanto, não permite afirmar que Playwright tem determinada porcentagem do mercado total ou que oferece mais vagas no Brasil. Também não foram somados pacotes sobrepostos como `playwright`, `playwright-core` e `@playwright/test`.

Selenium tem uma trajetória documentada desde 2004 e um ecossistema de frameworks em várias linguagens. Isso pesa especialmente quando a empresa já tem infraestrutura, profissionais e testes baseados em WebDriver. A relevância dessa base para a contratação do time precisa ser confrontada com as linguagens e o mercado de trabalho desejados. [História e organização do Selenium](https://www.selenium.dev/about/), [ecossistema Selenium](https://www.selenium.dev/ecosystem/).

## Ferramentas

| Necessidade | Playwright | Selenium |
| --- | --- | --- |
| Desenvolver e depurar | UI Mode, Inspector, Codegen e extensão VS Code | Debugger da linguagem/IDE, logs do cliente e driver, ferramentas do runner |
| Investigar falhas no CI | Trace Viewer, passos, screenshots e relatório HTML | Logs, screenshots e anexos organizados pelo framework; infraestrutura e relatórios adicionais |
| Gerar testes iniciais | Codegen | Ferramentas de gravação do ecossistema, como Selenium IDE; o código precisa ser revisado |
| Executar remotamente | Workers, sharding e integrações de execução remota | Selenium Grid e provedores compatíveis com WebDriver |
| Gerenciar binários | Instalação dos navegadores compatíveis com a versão | Selenium Manager, com opções de cache e versões |
| Compartilhar resultados | HTML e outros reporters integrados; Allure opcional | Reporters do runner e integrações como Allure |

A vantagem do Playwright aqui é ter uma experiência de diagnóstico mais integrada. Isso não torna impossível obter evidências equivalentes com Selenium; exige selecionar e manter mais componentes. Gravação de testes ajuda a iniciar, mas não produz automaticamente bons critérios de validação.

Fontes: [UI Mode](https://playwright.dev/docs/test-ui-mode), [Trace Viewer](https://playwright.dev/docs/trace-viewer-intro), [Selenium Grid](https://www.selenium.dev/documentation/grid/), [ecossistema Selenium](https://www.selenium.dev/ecosystem/).

## Plugins e integrações

| Finalidade | Playwright em JS/TS | Selenium em JS/TS |
| --- | --- | --- |
| Relatórios Allure | Adapter `allure-playwright` | Adapter do runner, por exemplo `allure-mocha` se o time escolher Mocha |
| Acessibilidade | `@axe-core/playwright` | `@axe-core/webdriverjs` |
| Extensão da infraestrutura | Fixtures, reporters e asserções personalizadas | Hooks do runner, helpers, bibliotecas e extensões WebDriver |
| BDD | Integração adicional com Gherkin/Cucumber ou adapter do ecossistema | Cucumber.js com os bindings e hooks da suíte |
| Android nativo | Cliente Appium separado coordenado com Playwright | Cliente WebDriver conectado ao Appium, com extensões necessárias |

**Appium é uma plataforma separada, não um plugin interno do Playwright ou Selenium.** O driver escolhido, como UiAutomator2, fornece a automação da plataforma. Para comandos específicos de Appium, o cliente JS Selenium pode exigir adaptadores/endpoints adicionais, como já acontece na POC; não se deve prometer paridade automática com um cliente Appium especializado.

Na integração Playwright + Appium há duas sessões coordenadas: Playwright cuida da WebView/renderer e o cliente Appium das telas nativas. O Trace Viewer do Playwright não registra automaticamente a árvore nativa e as ações executadas pelo Appium; é necessário anexar essas evidências e correlacionar os passos.

Selenium possui um ecossistema histórico amplo; a integração de cada biblioteca depende da linguagem e do runner. Mais plugins também aumentam a superfície de compatibilidade a manter. No Playwright muitas necessidades já são atendidas pelo núcleo, reduzindo a necessidade de plugins, mas não eliminando integrações externas.

Fontes: [Allure Playwright](https://allurereport.org/docs/playwright/), [Allure Mocha](https://allurereport.org/docs/mocha/), [acessibilidade Playwright](https://playwright.dev/docs/accessibility-testing), [axe WebDriverJS](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/webdriverjs), [ecossistema Selenium](https://www.selenium.dev/ecosystem/), [Appium](https://appium.io/docs/en/latest/intro/).

## Facilidades

**Playwright:** configuração inicial concentrada, TypeScript integrado à experiência do runner, seletores por papel/texto/test ID, esperas antes das ações, asserções com repetição e depuração visual. Para uma suíte nova em JS/TS, avalio que isso reduz decisões de infraestrutura e tempo de diagnóstico. Ainda é necessário definir bons seletores, isolamento, dados e estados aguardados.

**Selenium:** combina com o framework, IDE, linguagem e infraestrutura já adotados pela empresa. O time pode manter `node:test`, escolher Mocha ou aproveitar um framework existente, e Selenium Manager reduz a configuração manual dos drivers. Em contrapartida, relatórios, asserções e esperas exigem uma arquitetura deliberada. Selenium não é restrito a Java; nossos testes existentes são TypeScript com o binding JavaScript.

Não há migração automática dos testes entre os dois. Dados, catálogo, critérios e parte das abstrações podem ser preservados; interações, esperas, sessões e asserções precisam de adaptação. Isso corresponde ao método usado nesta POC.

## Vantagens

| Playwright | Selenium |
| --- | --- |
| Conjunto integrado para uma suíte nova em JS/TS | Liberdade para compor a arquitetura e aproveitar ferramentas existentes |
| Depuração por trace, DOM, rede e passos | Ecossistema WebDriver, Grid e integrações em várias linguagens |
| Acesso ao main Electron por API própria, ainda experimental | Aproximação entre cliente de navegador e cliente Appium pela base WebDriver |
| Rede, API, isolamento e comparação visual disponíveis no mesmo ecossistema | Automação de navegadores instalados, incluindo Safari no ambiente compatível |
| Pode testar Electron diretamente sem ChromeDriver | Governança comunitária e implementação baseada em padrões abertos |

As vantagens indicam adequação ao contexto, não garantias de estabilidade, desempenho ou menor custo sem medição.

## Limitações

| Ambiente/critério | Playwright | Selenium |
| --- | --- | --- |
| Navegadores antigos ou Safari instalado | Não tem como objetivo cobrir qualquer versão histórica; WebKit não é o aplicativo Safari | Depende da disponibilidade e compatibilidade dos drivers e do sistema operacional |
| Electron | API experimental; exige configuração compatível de inspeção; não opera o seletor nativo como DOM | O caminho usado no JS da POC depende de ChromeDriver; não oferece o mesmo acesso direto ao main |
| Android | API experimental e dependência de WebView depurável/ADB; não equivale a cobertura geral de aplicativos nativos | Precisa de Appium e driver Android; WebView por UiAutomator2 normalmente acrescenta ChromeDriver |
| Diálogos e permissões nativas | Exigem ações nativas disponíveis ou automação complementar; permissões web não concedem acesso global ao sistema | Não são cobertos só pelo WebDriver do navegador; dependem do driver nativo e das restrições do SO |
| Facilidade de diagnóstico | Trace cobre ações Playwright; integração nativa precisa de evidências adicionais | Mais responsabilidade do framework para reunir logs, passos, screenshots e vídeos |
| Estabilidade | Esperas automáticas não eliminam intermitência ou problemas do app | Esperas explícitas não implicam instabilidade inevitável; a implementação e o ambiente são determinantes |
| Tempo de execução | Não é sempre mais rápido | Não é sempre mais lento |

**Sobre a exigência de não usar ChromeDriver:** Playwright consegue acessar diretamente Electron e a WebView Android. Com Selenium, o caminho convencional para o DOM Electron/Chromium usa ChromeDriver. Appium em contexto nativo pode evitá-lo, mas troca seletores DOM por acessibilidade e não dá acesso genérico ao main. Appium/UiAutomator2 em contexto WebView volta a usar ChromeDriver; instalar Appium não remove essa dependência.

Testar duas janelas não exige dois monitores físicos. Nenhum dos dois frameworks garante sozinho o fluxo de instalação e todos os comportamentos do PWA pelo sistema operacional. Emulação mobile no navegador também não equivale a testar o APK.

Fontes: [Playwright Electron](https://playwright.dev/docs/api/class-electron), [Playwright Android](https://playwright.dev/docs/api/class-android), [Playwright navegadores](https://playwright.dev/docs/browsers), [guia Electron de automação](https://www.electronjs.org/docs/latest/tutorial/automated-testing), [UiAutomator2 — contextos WebView](https://github.com/appium/appium-uiautomator2-driver#web-context).

## Quem mantém

| Aspecto | Playwright | Selenium |
| --- | --- | --- |
| Liderança de manutenção | Projeto aberto liderado pela Microsoft, com contribuições da comunidade | Projeto aberto comunitário SeleniumHQ, com committers e comitês de liderança técnica e do projeto |
| Organização | Microsoft | Projeto integrante da Software Freedom Conservancy |
| Licença do núcleo | Apache 2.0 | Apache 2.0 |
| Implicação | Direção técnica mais concentrada e ferramentas integradas | Governança aberta entre contribuidores e organizações; drivers e integrações têm mantenedores próprios |

Os dois podem ser usados comercialmente sem pagar licença do núcleo. Serviços de nuvem, relatórios comerciais, infraestrutura e suporte contratado têm custos próprios. O mantenedor do núcleo não mantém necessariamente os plugins escolhidos, nem os drivers nativos do Appium.

Fontes: [repositório Microsoft Playwright](https://github.com/microsoft/playwright), [repositório SeleniumHQ](https://github.com/SeleniumHQ/selenium), [governança Selenium](https://www.selenium.dev/project/governance/), [organização Selenium/SFC](https://www.selenium.dev/about/).

## O que a POC comprova

### Resultados anteriores aproveitáveis

O [consolidado C/D](RELATORIO.md) registra execuções anteriores em que as duas alternativas cobriram web, PWA, Electron e Android. Os tempos pertencem às implementações e ambientes descritos no relatório; políticas de sessão, gestos e esperas diferentes impedem transformar esses números em uma regra geral de velocidade.

A [rodada Electron sem ChromeDriver](ELECTRON-ARQUIVOS.md) registra **5/5 no Playwright**, com acesso ao main e arquivos reais; a escolha/cancelamento do caminho no diálogo foi simulada. Os cenários Selenium nativos não rodaram porque o Mac2 não conseguiu iniciar sem Xcode completo. Isso é um impedimento do ambiente dessa tentativa, não prova de incapacidade geral do Selenium.

### Pendência descoberta ao conferir a integração Android

O protótipo [Playwright + Appium no APK](android-hybrid.test.ts) **ainda não está validado**. A [tentativa de 20/10](../../test-results/pocs/android-hybrid-connection-fix/results.json) terminou com **1 aprovação e 7 falhas**, envolvendo timeouts, descoberta/reconexão da WebView e sessão Appium encerrada. Esses dados não permitem atribuir todos os problemas ao Playwright, ao Appium, ao aplicativo ou ao emulador. A aprovação do cancelamento não comprova importação/exportação nem autorização de pasta.

Essa tentativa adicional não está incluída nos 150 casos C/D do consolidado anterior. Não se deve apresentar os 9/9 Android C/D como aprovação dos novos cenários de arquivos e permissões. Nesta análise não foi feita nova execução nem correção desse protótipo.

**Dependência relevante para remover WebdriverIO:** esse protótipo ainda usa `remote` do pacote `webdriverio` como cliente Appium. A retirada completa exige trocar esse cliente, por exemplo por Selenium JS com os comandos nativos necessários. Excluir a dependência agora sem adaptar o código quebraria a integração em construção. WebdriverIO foi excluído desta avaliação de escolha, mas as dependências e evidências históricas existentes foram preservadas.

## Critérios para a decisão final

| Prioridade do time | Escolha que eu favoreceria |
| --- | --- |
| Suíte nova JS/TS, foco web/PWA, Electron e facilidade de diagnóstico | **Playwright** |
| Necessidade de testar o main Electron diretamente e evitar ChromeDriver nesse alvo | **Playwright** |
| Infraestrutura Selenium/Grid, testes existentes e equipe já produtiva nesse ecossistema | **Selenium** |
| Unificar o cliente WebDriver entre navegador e Appium, aceitando drivers e complementos | **Selenium + Appium** |
| Muito fluxo Android nativo, arquivos e consentimento do sistema | **Appium como parte da arquitetura**, com cliente e integração validados; a escolha web não resolve esse requisito sozinha |
| Eliminar ChromeDriver em todas as plataformas mantendo seletores DOM | **Não considerar Selenium convencional equivalente ao Playwright**; esse requisito muda a arquitetura e precisa ser tratado explicitamente |

Antes de fechar a decisão global, falta comprovar uma rodada estável dos fluxos nativos de importar, exportar, permitir, negar e cancelar no APK e validar a plataforma desktop que a equipe usará, especialmente Windows. Isso pode alterar o custo da solução combinada. A decisão de web/Electron pode ser tomada separadamente, onde a adequação do Playwright está mais bem sustentada nesta POC.
