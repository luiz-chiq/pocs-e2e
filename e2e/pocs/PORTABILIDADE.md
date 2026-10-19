### O que foi reaproveitado nesta POC

No catálogo original C/D, as três POCs têm **implementações de testes independentes**. Foram reaproveitados o plano e os critérios funcionais; o código que opera a interface foi escrito para cada ferramenta. Não há um teste de WebdriverIO sendo executado por Playwright ou Selenium, nem conversão automática entre eles. A rodada adicional N01–N05 de arquivos Electron adota outro desenho, explicado no final deste documento.

| Camada | Como ficou nesta POC | Evidência no projeto |
| --- | --- | --- |
| Catálogo e critérios | Mesmos IDs C01–C10 e D01–D03, títulos e expectativas de negócio. C10 tem duas entradas e D02 duas variações. | [Catálogo e contratos](shared/fixtures.ts), [plano](README.md). |
| Seletores e dados comuns | Seletores `data-testid`/CSS, triângulo inicial, viewport, tipos de coordenadas e configuração de ambiente compartilhados. Alguns dados, como listas de nomes inválidos, continuam escritos em cada suíte. | [Fixtures compartilhadas](shared/fixtures.ts). |
| Infraestrutura | Instalação/lançamento do PWA, conexão CDP, obtenção de ChromeDriver do Electron, capabilities Android e orquestração têm módulos compartilhados. Isso não substitui os gestos de cada ferramenta. | [PWA](shared/pwa.ts), [conexão Chrome](shared/chrome-pipe.ts), [Electron](shared/electron.ts), [Android](shared/android.ts), [orquestrador](../../scripts/run-pocs.mjs). |
| Leitura do app | Mesmo contrato auxiliar de coordenadas, persistência, prontidão e contagem de vértices. Não injeta polígonos nem altera resultados para aprovar testes. | `polygonTestApi`, disponível na build E2E. |
| Execução da interface | Cliques, preenchimento, desenho, arraste, esperas, asserções e troca entre janelas implementados separadamente. Helpers como `create`, `deselect` e `confirmName` existem em cada suíte, com assinaturas/implementações próprias. | [Playwright](playwright/web.spec.ts), [Selenium](selenium/web.test.ts), [WebdriverIO](webdriverio/web.e2e.ts). |
| Sessões e evidências | Hooks, reinício/persistência, captura de screenshots, trace e gravação do resultado adaptados ao runner. As durações individuais vêm de pontos de medição diferentes. | [Fixtures Playwright](playwright/fixtures.ts), [reporter](playwright/reporter.ts), [Selenium](selenium/web.test.ts), [configuração WDIO](../../wdio.poc.conf.ts). |

Compartilhado não significa utilizado pelas três ferramentas em todos os ambientes: as capabilities Appium e parte da conexão Chrome atendem Selenium/WebdriverIO; Playwright usa seus próprios adaptadores de sessão para Android/Electron. Os helpers comuns de instalação do PWA são usados pelas três integrações.

Exemplo do mesmo passo de negócio, usando o seletor compartilhado `s.draw`:

```ts
// Playwright
await page.locator(s.draw).click()

// Selenium
await (await driver.findElement(By.css(s.draw))).click()

// WebdriverIO
await $(s.draw).click()
```

O clique simples muda pouco. Esperar a criação de três vértices, arrastar geometria, coordenar duas janelas e reiniciar um APK exigem adaptação maior. Por exemplo, o Playwright Android desta POC envia gestos por CDP; Selenium e WebdriverIO usam ações W3C via Appium. A espera do `hitTest` e as confirmações com teclado aberto também precisaram de ajustes próprios. Ter os mesmos nomes de cenário não garante que os eventos e seus intervalos sejam idênticos.

### Reutilização entre plataformas e custo de isolamento

| Plataforma | Playwright | Selenium | WebdriverIO |
| --- | --- | --- | --- |
| Web | Contexto isolado por teste; navegador do worker é compartilhado. | Processo/perfil de Chrome por teste. | Sessão/perfil compartilhados; limpa dados pela interface. |
| PWA | Perfil novo e instalação real por teste; C07 reabre preservando o perfil daquele caso. | Perfil novo e instalação real por teste; C07 reabre com o PWA já instalado naquele perfil. | Instala no início da suíte; C07 relança usando o perfil existente. |
| Electron | Lança app/perfil por teste; C07 fecha e reabre o mesmo perfil. | Inicia ChromeDriver/app/perfil por teste; C07 reinicia. | Sessão/perfil compartilhados, conexão direta ao ChromeDriver do Electron; C07 reinicia o app com o mesmo perfil. Suíte atual aprovada 13/13. |
| Android | Force-stop, limpeza do pacote e lançamento por teste; conecta à WebView do PID atual. | Sessão Appium por teste, com instalação/reset conforme as capabilities; contexto WebView. | Sessão Appium compartilhada; refresh e limpeza pela interface entre casos; C07 encerra/reativa o app. |

Essas decisões pertencem à implementação desta POC, não são imposições universais das ferramentas. Explicam por que reaproveitar o roteiro não produz custos de execução equivalentes. Normalizar o isolamento seria uma alteração adicional nos adaptadores; não foi feita durante a rodada de métricas.

### Como migrar testes existentes para outra ferramenta

1. Preservar o comportamento esperado: pré-condições, ações, resultados e dados. Identificar o que realmente é regra de negócio e o que é detalhe do runner antigo.
2. Reaproveitar seletores, dados e componentes de domínio que não importem APIs da ferramenta. Page Objects que chamam diretamente `browser`, `page` ou `driver` precisam ter essa parte adaptada.
3. Reescrever a camada de execução: locators, preenchimento, gestos, asserções, esperas, hooks, perfis, janelas e evidências. Copiar uma espera fixa não garante equivalência entre drivers.
4. Adaptar o lançamento por plataforma: navegador; instalação real e janela standalone do PWA; executável/driver do Electron; APK, ADB, contexto WebView e teclado no Android.
5. Validar paridade antes de comparar métricas: mesma versão do app, dados iniciais, isolamento, critérios de toque e sinais de prontidão. Repetir os casos sensíveis e investigar divergências sem enfraquecer as asserções.

Selenium → WebdriverIO pode reaproveitar parte da configuração conceitual de WebDriver/Appium; as chamadas do cliente, asserções e lifecycle ainda mudam. Playwright → Selenium/WebdriverIO também exige adaptar fixtures/contextos e a integração de protocolo. Dentro de uma mesma ferramenta, esta POC reutiliza boa parte do corpo dos cenários entre plataformas, com branches e adaptadores para lançamento, toque, persistência e janelas.

No catálogo original C/D, seria possível definir ações de domínio como `criarPoligono` e implementar um adaptador por ferramenta. Essa abstração **não foi criada para unificar as três suítes C/D**: manter execuções independentes permite observar as diferenças, mas duplica parte da manutenção. A nova suíte N01–N05 adota adaptadores compartilhando os cenários. Não foi medido o tempo de desenvolvimento/migração nem um percentual de reaproveitamento de código; os tempos do relatório são de execução dos testes.

### Exemplo observado na correção dos adaptadores

Na revalidação de 19/10/2026, os critérios dos cenários foram preservados. No
Playwright Android, o toque no mapa passou a enviar início/fim consecutivos por
CDP. No Selenium, foram ajustadas as ações W3C de toque, a coordenação com o
teclado/viewport e a espera pela entrega do clique de confirmação. As leituras
de geometria passaram a tolerar somente a referência DOM obsoleta transitória;
o mouse ganhou um intervalo de hover antes de pressionar. São correções nos
adaptadores específicos, sem reescrever o roteiro de negócio ou aplicar uma
conversão automática às três ferramentas. Os resultados e os tempos dessa
revalidação ficam separados da rodada comparativa original.

### Rodada adicional de arquivos Electron

Em [electron-files.test.ts](electron-files.test.ts), os cinco cenários N01–N05
e suas asserções são compartilhados entre os três clientes, com runner Node Test
e adaptadores de lançamento, clique, leitura, reload e troca de janela. Playwright
usa `_electron`; Selenium usa `Builder`/ChromeDriver; WebdriverIO usa `remote` com
ChromeDriver. Os testes continuam em TypeScript. Essa abstração foi criada para
a nova funcionalidade; as suítes C/D não foram convertidas para ela.

Os dados de entrada são arquivos de teste. A escolha do caminho no diálogo é
simulada exclusivamente na build POC; importar e exportar continuam sendo ações
reais pelos botões, preload, IPC e `fs` do main. O runner lê o arquivo de saída
para conferir seu conteúdo. Há um processo/perfil novo por caso nas três
ferramentas, diferente do isolamento da suíte WDIO original. Por isso, seus tempos
ficam [separados](ELECTRON-ARQUIVOS.md) das métricas C/D anteriores.
