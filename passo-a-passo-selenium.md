# Selenium: passo a passo para testar a versão web do Mapa

Guia preparado em 04/11/2026. Faça primeiro [o guia de Playwright](passo-a-passo-playwright.md); volte a este quando quiser comparar os mesmos cenários usando WebDriver.

Este documento é um roteiro, não uma instalação executada. Os testes, scripts, hooks e workflows descritos ainda serão criados por você. Não é necessário instalar Playwright para seguir o Selenium: os dois podem existir em pastas separadas e compartilhar apenas dados de teste.

## Como usar este guia

Cada etapa tem atividade manual, resultado esperado e prompt opcional. Para preservar a parte que quer aprender sozinho, acrescente ao prompt: **“Não edite arquivos nem execute comandos; apenas explique e revise minha tentativa.”** Para delegar, use: **“Implemente somente esta etapa, execute apenas o caso envolvido e mostre o diff.”**

Escolhas para começar:

- JavaScript em arquivos `.mjs`, acompanhando o projeto ESM e usando Node 24.
- Selenium WebDriver com Chrome e Selenium Manager para resolver o driver.
- Runner e assertions do próprio Node: `node:test` e `node:assert/strict`.
- Execução sequencial, um navegador novo por teste.
- Origem exclusiva: `http://127.0.0.1:5175`, diferente do desenvolvimento e do Playwright.
- Primeiro a versão web desktop; Grid, outros navegadores e dispositivos vêm depois.

Selenium controla o navegador, mas não fornece sozinho toda a estrutura de uma suíte. Neste guia o Node descobre os casos, executa assertions e informa aprovação/falha. Isso evita adicionar outro runner logo no início. [Referências: Selenium](https://www.selenium.dev/documentation/webdriver/), [runner Node 24](https://nodejs.org/docs/latest-v24.x/api/test.html).

## 1. Conferir ambiente e entender as peças

**Faça à mão**

Na raiz:

```sh
node --version
yarn --version
git status --short
```

Use Node 24 atualizado, Yarn Classic 1.22.22 e Google Chrome instalado. O nome da pasta `webDriverIO` não significa que WebdriverIO esteja configurado; este roteiro usa diretamente `selenium-webdriver`.

Diferencie:

| Peça | Função |
|---|---|
| Selenium WebDriver | API que envia ações ao navegador |
| ChromeDriver | Implementação do protocolo para controlar Chrome |
| Selenium Manager | Localiza/obtém driver compatível e mantém cache |
| Runner Node | Executa os casos, hooks e assertions |
| Selenium Server/Grid | Execução remota; desnecessário para este começo local |

Não é necessário instalar Java ou um Selenium Server para rodar estes testes JavaScript locais. A primeira criação da sessão pode precisar de internet para obter o driver. Mantenha o Chrome atualizado e deixe o Manager resolver a compatibilidade.

**Resultado esperado:** você sabe por que instalar o pacote não é o mesmo que iniciar um servidor Grid.

**Prompt opcional**

```text
Explique como Selenium WebDriver, ChromeDriver, Selenium Manager e node:test vão trabalhar neste projeto React/Vite ESM. Confira meu ambiente e proponha apenas os pré-requisitos para Chrome local. Não instale Java, Grid, WebdriverIO nem gerenciadores extras de driver.
```

Referência: [Selenium Manager](https://www.selenium.dev/documentation/selenium_manager/).

## 2. Instalar a dependência

**Faça à mão**

```sh
yarn add --dev --exact selenium-webdriver
yarn why selenium-webdriver
```

Preserve `yarn.lock` e os scripts Playwright, se já existirem. Não crie um segundo `package-lock.json` e não baixe ChromeDriver manualmente como etapa padrão.

Nesta combinação, configure o Chrome por `chrome.Options`. Exemplos antigos de Selenium 2/3 com gerenciadores de driver adicionais, caminhos fixos e APIs removidas não são a base do roteiro.

**Resultado esperado:** uma devDependency exata aparece no projeto, sem adicionar outro framework de testes.

**Prompt opcional**

```text
Instale somente selenium-webdriver como devDependency exata com Yarn Classic. Preserve as dependências e scripts atuais. Não adicione chromedriver, webdriver-manager, Mocha, WebdriverIO ou Selenium Server. Explique o que o Selenium Manager fará ao abrir a primeira sessão.
```

Referência: [primeiros passos](https://www.selenium.dev/documentation/webdriver/getting_started/).

## 3. Preparar pastas e iniciar o aplicativo

**Faça à mão**

Crie `tests/selenium/`. Os arquivos deste guia terminam em `.test.mjs`; os Playwright ficam em `tests/playwright/` e terminam em `.spec.ts`. Não mova os testes de uma ferramenta para o runner da outra.

Se ainda não existir, adicione ao `.gitignore`:

```gitignore
/test-results/
```

Em um terminal separado, mantenha o app disponível:

```sh
yarn dev --host 127.0.0.1 --port 5175 --strictPort
```

Confira `http://127.0.0.1:5175` em uma janela de teste. No aprendizado local o servidor será manual; o workflow do passo 16 vai administrá-lo no CI.

O app guarda projetos em IndexedDB e localStorage. Nos testes, use perfis temporários criados pelo WebDriver, sem apontar `--user-data-dir` para seu Chrome pessoal. Um navegador novo por teste resolve o isolamento melhor que apagar apenas cookies.

**Resultado esperado:** o app está disponível na porta reservada e os testes não vão tocar seus projetos do perfil habitual.

**Prompt opcional**

```text
Prepare somente a pasta tests/selenium e a exclusão de test-results no Git. Explique como iniciar Vite na porta exclusiva 5175 e como o perfil temporário do Chrome mantém IndexedDB e localStorage isolados. Não configure um perfil pessoal nem gere casos de teste.
```

## 4. Escrever seu primeiro teste à mão

**Faça à mão**

Antes do código, escreva o mesmo cenário de inicialização que usou no Playwright. Depois crie `tests/selenium/inicio.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { Builder, By, until } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

const baseURL = process.env.SELENIUM_BASE_URL ?? 'http://127.0.0.1:5175';

test('@smoke abre o Mapa pronto para criar', { timeout: 90_000 }, async t => {
  const options = new chrome.Options();
  options.addArguments('--window-size=1280,720');
  if (process.env.HEADLESS === '1' || process.env.CI) {
    options.addArguments('--headless=new');
  }

  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();

  t.after(async () => { await driver.quit(); });
  await driver.manage().setTimeouts({
    implicit: 0, pageLoad: 45_000, script: 15_000,
  });

  await driver.get(baseURL);
  const create = await driver.wait(
    until.elementLocated(By.id('create-feature')), 45_000,
  );
  await driver.wait(until.elementIsVisible(create), 15_000);
  await driver.wait(until.elementIsEnabled(create), 45_000);

  assert.equal(await driver.getTitle(), 'Mapa');
  assert.equal(await driver.findElement(By.id('page-title')).getText(), 'Mapa');
  assert.equal(await driver.findElement(By.id('polygon-count')).getText(), '0');
  for (const id of ['sidebar-tab-polygon', 'sidebar-tab-point', 'sidebar-tab-validation']) {
    assert.equal(await driver.findElement(By.id(id)).isDisplayed(), true);
  }
});
```

Execute com o app do passo 3 ainda rodando:

```sh
yarn node --test tests/selenium/inicio.test.mjs
```

`driver.get()` navega; `wait()` observa uma condição; as assertions comparam o resultado. `quit()` encerra a sessão inteira, inclusive em falha, pois o cleanup foi registrado logo após abrir o navegador. O HTML pode carregar antes do mapa; por isso aguardamos Criar habilitado.

Não inclua `--disable-gpu` como receita de headless: o Mapa usa WebGL. Investigue suporte gráfico se o ArcGIS falhar, em vez de desativá-lo automaticamente.

**Resultado esperado:** Chrome abre, verifica o app e fecha. Mude temporariamente a expectativa do título para confirmar que uma falha é detectada, depois restaure.

**Prompt opcional**

```text
Revise meu primeiro teste Selenium com node:test. Confira await em todas as chamadas, driver.quit registrado mesmo em falha, espera por Criar habilitado e isolamento. Não reescreva o teste inteiro. Mostre como provocar e depois desfazer uma falha de assertion.
```

## 5. Criar scripts e comparar headed/headless

**Faça à mão**

Acrescente ao objeto `scripts` do `package.json`, mantendo o restante:

```json
{
  "test:selenium": "node --test --test-concurrency=1 tests/selenium/*.test.mjs",
  "test:selenium:smoke": "node --test --test-concurrency=1 --test-name-pattern=@smoke tests/selenium/*.test.mjs",
  "test:selenium:watch": "node --test --watch --test-concurrency=1 tests/selenium/*.test.mjs"
}
```

```sh
yarn test:selenium
HEADLESS=1 yarn test:selenium
yarn test:selenium:smoke
```

As atribuições de ambiente destes exemplos usam sintaxe de macOS/Linux. No PowerShell, defina por exemplo `$env:HEADLESS='1'` antes de chamar o comando e remova a variável ao terminar.

Sem `HEADLESS` e fora do CI, o teste abre uma janela. Com `HEADLESS=1`, executa sem a janela. O modo watch acompanha arquivos de teste e dependências importadas; ele não observa automaticamente todo o código React servido por HTTP. Rode novamente após mudanças no app se o runner não repetir sozinho.

Mantenha um caso pequeno por arquivo inicialmente. Filtre um caso pelo nome colocando a opção antes do caminho:

```sh
yarn node --test --test-concurrency=1 --test-name-pattern='abre o Mapa' tests/selenium/inicio.test.mjs
```

**Resultado esperado:** você roda um caso, os smoke ou a suíte inteira sem misturar os comandos Playwright.

**Prompt opcional**

```text
Adicione somente os scripts Selenium do passo 5, preservando os scripts Playwright e os de build. Explique execução visível, HEADLESS e watch do runner Node. Não use waits fixos para tornar a execução visível mais lenta e não adicione outro runner.
```

Referência: [execução e filtros no Node 24](https://nodejs.org/docs/latest-v24.x/api/test.html).

## 6. Aprender locators e esperas explícitas

**Faça à mão**

No Selenium, localizar um elemento não garante que ele esteja visível, habilitado ou livre de sobreposição. Espere a condição da próxima ação. O `assert` do Node também não refaz uma verificação automaticamente como `expect(locator)` do Playwright.

Locators existentes úteis neste app:

| Elemento | Locator inicial |
|---|---|
| Criar | `By.id('create-feature')` |
| Abas | `By.id('sidebar-tab-polygon')`, `sidebar-tab-point`, `sidebar-tab-validation` |
| Projetos | `By.css('button[aria-label^="Projetos:"]')` |
| Modal de projetos aberto | `By.css('#projects-dialog[open]')` |
| Nome do novo projeto | `By.id('new-project-name')` |
| Nome em edição | `By.id('polygon-name')` |
| Mapa | `By.id('map')` |

Prefira IDs e atributos estáveis. Não copie XPath absoluto nem classes geradas pelo ArcGIS. Quando houver vários botões Criar, use um escopo específico de diálogo/formulário. React pode substituir um nó: depois de uma transição, localize novamente em vez de reutilizar um `WebElement` antigo.

Para um resultado assíncrono, espere a condição antes do assert:

```js
await driver.wait(async () => {
  const count = await driver.findElement(By.id('polygon-count')).getText();
  return count === '2';
}, 15_000, 'A importação não produziu dois elementos');
assert.equal(await driver.findElement(By.id('polygon-count')).getText(), '2');
```

Não misture implicit wait com explicit waits, não use `driver.sleep()` para aguardar o app e não capture toda exceção retornando sucesso. Se precisar tratar `StaleElementReferenceError` durante uma espera, capture somente o erro transitório esperado e procure o elemento novamente.

**Resultado esperado:** você sabe se a falha é de localização, visibilidade, habilitação ou resultado ainda pendente.

**Prompt opcional**

```text
Revise os locators e waits deste teste Selenium. Use os IDs/atributos reais do Mapa e esperas explícitas para condições da UI. Diferencie elemento localizado de elemento interagível. Não use driver.sleep, implicit wait, XPath absoluto ou clique por JavaScript para esconder uma sobreposição.
```

Referências: [esperas](https://www.selenium.dev/documentation/webdriver/waits/), [locators](https://www.selenium.dev/documentation/webdriver/elements/locators/).

## 7. Extrair a criação de navegador sem compartilhar sessões

**Faça à mão**

Depois de entender o primeiro teste, extraia a configuração para `tests/selenium/support/browser.mjs`:

```js
import { Builder } from 'selenium-webdriver';
import chrome from 'selenium-webdriver/chrome.js';

export const baseURL = process.env.SELENIUM_BASE_URL ?? 'http://127.0.0.1:5175';

export async function createDriver() {
  const options = new chrome.Options();
  options.addArguments('--window-size=1280,720');
  if (process.env.HEADLESS === '1' || process.env.CI) {
    options.addArguments('--headless=new');
  }
  const driver = await new Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
    .build();
  try {
    await driver.manage().setTimeouts({
      implicit: 0, pageLoad: 45_000, script: 15_000,
    });
    return driver;
  } catch (error) {
    await driver.quit();
    throw error;
  }
}
```

Atualize o primeiro teste para importar `createDriver` e `baseURL`, mantendo o `t.after()` para fechar a sessão. O helper retorna um navegador novo a cada chamada; não exporte uma instância global já aberta.

Seu objetivo agora é remover configuração duplicada, não esconder todos os passos do teste em uma abstração genérica.

**Resultado esperado:** dois testes poderão usar a mesma configuração sem compartilhar projetos ou navegador.

**Prompt opcional**

```text
Extraia apenas a configuração repetida de Chrome para support/browser.mjs. Cada chamada deve criar uma sessão nova e cada teste deve encerrá-la. Preserve ESM, os scripts atuais e as assertions visíveis no teste. Não crie um framework genérico ou driver global.
```

Referência: [práticas de isolamento](https://www.selenium.dev/documentation/test_practices/encouraged/fresh_browser_per_test/).

## 8. Criar um teste de projeto com resultado observável

**Faça à mão**

Crie `tests/selenium/projetos.test.mjs`, usando o helper do passo anterior:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { By, until } from 'selenium-webdriver';
import { baseURL, createDriver } from './support/browser.mjs';

test('cria um projeto vazio com o nome informado', { timeout: 90_000 }, async t => {
  const driver = await createDriver();
  t.after(async () => { await driver.quit(); });
  await driver.get(baseURL);

  const create = await driver.wait(until.elementLocated(By.id('create-feature')), 45_000);
  await driver.wait(until.elementIsEnabled(create), 45_000);
  const switcher = await driver.findElement(By.css('button[aria-label^="Projetos:"]'));
  await switcher.click();

  const dialog = await driver.wait(
    until.elementLocated(By.css('#projects-dialog[open]')), 15_000,
  );
  await driver.wait(until.elementIsVisible(dialog), 15_000);
  await driver.findElement(By.id('new-project-name')).sendKeys('Projeto Selenium');
  const submit = await driver.findElement(
    By.css('#projects-dialog .project-create button[type="submit"]'),
  );
  await driver.wait(until.elementIsEnabled(submit), 15_000);
  await submit.click();

  await driver.wait(async () => {
    const opened = await driver.findElements(By.css('#projects-dialog[open]'));
    return opened.length === 0;
  }, 15_000, 'O diálogo de projetos não fechou');
  const active = await driver.wait(until.elementLocated(
    By.css('button[aria-label="Projetos: Projeto Selenium"]'),
  ), 15_000);
  assert.equal(await active.isDisplayed(), true);
  assert.equal(await driver.findElement(By.id('polygon-count')).getText(), '0');
});
```

Execute somente esse arquivo. Depois escreva sozinho renomear e trocar entre dois projetos, cada cenário preparando seus próprios dados. Não deixe o primeiro teste criar algo de que o segundo precisa.

**Resultado esperado:** a criação é comprovada pelo nome ativo e pela coleção vazia, não apenas pelo clique no botão.

**Prompt opcional**

```text
Revise meu teste de criação de projeto Selenium. Confira o escopo do submit, a espera pelo fechamento do dialog HTML e a confirmação do nome ativo. Quero escrever os testes de renomear e trocar sozinho; não os implemente. Aponte apenas os requisitos que devo observar.
```

## 9. Importar dados sem automatizar o seletor do sistema

**Faça à mão**

Use a fixture `tests/fixtures/mapa-basico.geojson` descrita no passo 11 do guia Playwright. Ela não depende do Playwright: é apenas um arquivo com uma área e um ponto da mesma cor. Se ainda não a criou, copie o JSON daquele passo e confira a geometria.

Selenium envia o caminho absoluto ao `input[type=file]` com `sendKeys`; ele não precisa preencher o seletor de arquivos do macOS/Windows. Neste app o input é criado dinamicamente ao clicar em Importar. Comece esse caso em **headless**, evitando o seletor nativo da sessão visível.

Trecho para colocar dentro de um teste que já abriu o app e esperou sua prontidão:

```js
// Acrescente: import path from 'node:path';
await driver.findElement(By.id('import-polygons')).click();
const input = await driver.wait(
  until.elementLocated(By.css('input[type="file"]')), 10_000,
);
await input.sendKeys(path.resolve('tests/fixtures/mapa-basico.geojson'));
const confirm = await driver.wait(
  until.elementLocated(By.id('confirm-import')), 15_000,
);
await driver.wait(until.elementIsVisible(confirm), 15_000);
await driver.wait(until.elementIsEnabled(confirm), 15_000);
await confirm.click();
await driver.wait(async () => {
  return await driver.findElement(By.id('polygon-count')).getText() === '2';
}, 15_000);
```

Não espere o input estar visível: ele é propositalmente oculto. No Chrome padrão, o envio de arquivo pelo WebDriver não exige mostrá-lo. Não use ferramentas do sistema para dirigir a janela de arquivos.

Ao criar `importacao.test.mjs`, rode:

```sh
HEADLESS=1 yarn node --test tests/selenium/importacao.test.mjs
```

Implemente depois a verificação da aba Avisos: alerta para mesma cor, erro para cor diferente. No app esses modais são elementos HTML `<dialog>`; `switchTo().alert()` serve para alert/confirm/prompt nativos e não para esses elementos.

Para exportação, configure uma pasta temporária de downloads por teste e leia o JSON quando o download estiver completo. O WebDriver clássico não oferece a mesma abstração de `Download` do Playwright. Não marque como concluído porque um arquivo parcial apareceu; aguarde o arquivo final e valide seu conteúdo. Em Grid, o arquivo pode ficar na máquina remota e exige estratégia própria de transferência.

**Resultado esperado:** você testa o importador pela UI e as regras com dados conhecidos, sem confundir um diálogo HTML com o seletor do sistema.

**Prompt opcional**

```text
Me ajude a planejar meu teste Selenium de importação da fixture mapa-basico.geojson. O app cria um input file oculto ao clicar em Importar. Quero rodar o caso em headless, usar sendKeys com caminho absoluto e verificar os avisos pela UI. Não automatize diálogos do sistema nem altere o controller para carregar os dados.
```

Referências: [upload de arquivos](https://www.selenium.dev/documentation/webdriver/elements/file_upload/), [limitações de downloads](https://www.selenium.dev/documentation/test_practices/discouraged/file_downloads/).

## 10. Capturar evidências quando um teste falhar

**Faça à mão**

Comece salvando screenshot, HTML e URL do navegador que falhou. O exemplo abaixo é um helper a criar em `tests/selenium/support/evidence.mjs`:

```js
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export async function captureFailure(driver, t) {
  try {
    const folder = path.resolve('test-results/selenium', randomUUID());
    await mkdir(folder, { recursive: true });
    const captures = await Promise.allSettled([
      driver.takeScreenshot().then(image =>
        writeFile(path.join(folder, 'screenshot.png'), Buffer.from(image, 'base64'))),
      driver.getPageSource().then(html =>
        writeFile(path.join(folder, 'page.html'), html)),
      driver.getCurrentUrl().then(url =>
        writeFile(path.join(folder, 'context.json'), JSON.stringify({
          test: t.name, url, time: new Date().toISOString(),
        }, null, 2))),
    ]);
    t.diagnostic(`Evidências: ${folder}`);
    if (captures.some(result => result.status === 'rejected')) {
      t.diagnostic('Uma das evidências não pôde ser capturada.');
    }
  } catch (error) {
    t.diagnostic(`Falha ao capturar evidências: ${String(error)}`);
  }
}
```

No corpo de um teste, envolva as ações/assertions, preservando o cleanup registrado com `t.after()`:

```js
// Acrescente: import { captureFailure } from './support/evidence.mjs';
try {
  // Ações e assertions deste teste.
} catch (error) {
  await captureFailure(driver, t);
  throw error;
}
```

O `throw error` é essencial: capturar screenshot não transforma falha em aprovação. Como as capturas dependem de uma sessão ainda viva, faça-as antes de `quit()`.

Use `t.diagnostic('Abrindo o modal de projetos')` em pontos relevantes. O HTML não contém os pixels do canvas; por isso a screenshot é útil neste app. Para console e rede, estude as APIs BiDi compatíveis com a versão instalada, em vez de presumir que snippets CDP de outra linguagem funcionarão no JavaScript.

**Resultado esperado:** uma falha proposital produz evidências e o processo continua retornando código de erro.

**Prompt opcional**

```text
Adicione captura de screenshot, HTML e URL somente em falha nos meus testes Selenium existentes. Preserve o erro original e o encerramento da sessão. Use uma pasta única por teste em test-results/selenium. Não capture dados do meu perfil pessoal e não transforme exceptions em testes verdes.
```

Referências: [WebDriver JS](https://www.selenium.dev/selenium/docs/api/javascript/), [BiDi](https://www.selenium.dev/documentation/webdriver/bidi/).

## 11. Executar e depurar pela interface do editor

**Faça à mão**

No Selenium puro não existe um comando equivalente a `playwright test --ui`. Você tem opções complementares:

| Ferramenta | Uso |
|---|---|
| Chrome visível | Acompanhar a interação real do teste |
| Debugger Node/VS Code | Parar nas linhas do teste, inspecionar variáveis e executar passo a passo |
| Selenium IDE | Gravar/reproduzir cenários em uma ferramenta própria |
| Console do Grid | Acompanhar sessões remotas; não é um relatório de assertions |

Para começar pelo debugger:

```sh
yarn node --inspect-brk --test --test-concurrency=1 tests/selenium/inicio.test.mjs
```

Conecte o debugger do editor ao processo/endereço informado no terminal. No VS Code, outra opção é criar uma configuração de lançamento Node que execute `--test --test-concurrency=1` e o caminho do arquivo; habilite o acompanhamento de processos filhos quando necessário. Marque um breakpoint antes do clique e examine o locator e o estado do elemento.

Uma pausa de debug não é uma espera do teste: remova `debugger` e configurações de pausa que impediriam o CI de avançar. Pare o modo watch antes de iniciar outra execução do mesmo arquivo.

**Resultado esperado:** você consegue acompanhar a UI e o código sem depender de `sleep()` para enxergar o teste.

**Prompt opcional**

```text
Me oriente a depurar apenas inicio.test.mjs no VS Code com Node e Selenium. Explique a conexão ao inspector e o processo filho do runner. Não apresente uma UI de testes que não faça parte do Selenium puro e não adicione esperas para desacelerar a automação.
```

## 12. Entender o equivalente ao Trace Viewer

**Faça à mão**

O WebDriver usado neste guia não produz o `trace.zip` interativo do Playwright. Comece com as evidências do passo 10, diagnósticos de passos e logs da execução. Elas ajudam a investigar, mas não reconstroem automaticamente snapshots de cada ação.

Quando avançar para Selenium Grid, a observabilidade do Grid pode registrar traces dos comandos distribuídos. Isso investiga a infraestrutura e as chamadas entre componentes; não é um replay da página igual ao Trace Viewer. Vídeo e relatórios mais completos dependem da infraestrutura ou de ferramentas adicionais escolhidas separadamente.

Faça um exercício manual: provoque uma falha, leia o erro no terminal, abra a screenshot e localize no HTML o elemento esperado. Registre qual evidência confirma sua hipótese.

**Resultado esperado:** você sabe quais evidências o setup atual possui e não procura um trace Playwright em uma execução Selenium.

**Prompt opcional**

```text
Analise o erro, screenshot, HTML e diagnósticos desta execução Selenium. Separe falha de locator, prontidão, app e infraestrutura. Não invente trace.zip nem uma função nativa de replay de DOM. Se faltar evidência, proponha a menor captura adicional que ajude a confirmar a causa.
```

Referência: [observabilidade do Grid](https://www.selenium.dev/documentation/grid/advanced_features/observability/).

## 13. Usar Selenium IDE como gravador opcional

**Faça à mão**

O Selenium IDE é uma ferramenta separada para gravar e reproduzir ações. Use os canais indicados pelo [site oficial](https://www.selenium.dev/selenium-ide/) e confira a disponibilidade para seu navegador/versão antes de instalar. Ele não é instalado pelo pacote `selenium-webdriver`.

1. Com o app na porta 5175, crie um projeto de gravação.
2. Grave abrir Projetos e criar um projeto vazio.
3. Adicione uma verificação do nome ativo; não grave somente cliques.
4. Reproduza a gravação e observe esperas e locators.
5. Salve o projeto `.side` se quiser mantê-lo.
6. Se exportar código JavaScript, confira o formato escolhido antes de incorporar.

A exportação documentada de JavaScript usa **Mocha**. Este guia usa **node:test**, portanto adapte hooks, imports ESM e assertions em vez de copiar o arquivo diretamente. Os exemplos de versões na documentação histórica do IDE não são uma indicação para instalar Selenium antigo.

A gravação não resolve automaticamente desenho no canvas, dados de teste ou isolamento. Trate-a como material de estudo e rascunho.

**Resultado esperado:** você diferencia o projeto `.side`, o código exportado e a suíte escrita à mão.

**Prompt opcional**

```text
Revise esta gravação/exportação do Selenium IDE. Identifique o runner e a linguagem gerados, depois explique como adaptar somente este caso para ESM e node:test. Preserve as verificações do cenário. Não instale Mocha automaticamente nem copie versões antigas das dependências do exemplo do IDE.
```

Referência: [exportação de código do IDE](https://www.selenium.dev/selenium-ide/docs/en/introduction/code-export).

## 14. Usar MCP para explorar com IA, opcionalmente

**Faça à mão**

Um servidor MCP é uma integração adicional; `selenium-webdriver` não o inicia sozinho. O ecossistema do Selenium lista o projeto comunitário **MCP-Selenium**, de Angie Jones. Ele é mantido separadamente do Selenium; a listagem não o torna parte do pacote oficial.

Leia o [README do projeto](https://github.com/angiejones/mcp-selenium) e confira os comandos e a versão antes de configurar. Um exemplo para clientes com `mcpServers`:

```json
{
  "mcpServers": {
    "selenium": {
      "command": "npx",
      "args": ["-y", "@angiejones/mcp-selenium@latest"]
    }
  }
}
```

No Codex CLI, a configuração equivalente pode ser adicionada assim:

```sh
codex mcp add selenium -- npx -y @angiejones/mcp-selenium@latest
codex mcp list
```

Use apenas o formato apropriado ao seu cliente, sem duplicar servidores. Esse exemplo roda o pacote via `npx`; não é uma devDependency exigida pela suíte. Após experimentar, fixe uma versão da integração se precisar de reprodutibilidade.

Inicie o app na porta 5175. Peça ao agente uma sessão nova do Chrome, sem perfil pessoal e sem reaproveitar dados anteriores. Não passe argumentos exclusivos do Playwright MCP, como `--isolated`, para um servidor Selenium sem que a documentação dele os defina.

**Prompt para explorar sem escrever testes**

```text
Use o MCP Selenium configurado para abrir uma sessão nova de Chrome em http://127.0.0.1:5175. Explore apenas a criação de um projeto vazio com dados fictícios. Informe os locators reais e as condições observadas. Não edite arquivos nem gere testes ainda. Não use meu perfil habitual e feche a sessão ao terminar.
```

**Prompt para implementação assistida após a exploração**

```text
Implemente somente o cenário que revisei, usando selenium-webdriver e node:test, não Playwright. Confira as APIs na documentação atual e no pacote instalado. Use esperas explícitas, sessão nova e quit no cleanup. Execute só o arquivo envolvido e mostre o resultado real. Não enfraqueça assertions nem altere o app para fazer passar.
```

O MCP ajuda a descobrir a interface; o artefato repetível é o teste versionado. Uma sessão MCP pode ter versões e estado diferentes da suíte: passar na exploração não comprova que o arquivo Selenium passou.

**Resultado esperado:** você usa a IA para acelerar uma etapa revisável, mantendo a execução do CI independente dela.

Referências: [ecossistema Selenium](https://www.selenium.dev/ecosystem/), [MCP-Selenium](https://github.com/angiejones/mcp-selenium), [MCP no Codex — documentação oficial OpenAI](https://learn.chatgpt.com/docs/extend/mcp).

## 15. Expandir cenários sem confundir emulação e aparelho real

**Faça à mão**

Depois de smoke e projetos, avance com os mesmos comportamentos do guia Playwright: importação/validação, criação real, edição/cancelamento, clone, bloqueio, seleção múltipla, persistência e busca.

Para clicar no mapa, calcule posições relativas ao elemento e use a Actions API. Um trecho dentro de um teste que já abriu o modo de criação:

```js
const map = await driver.findElement(By.id('map'));
const rect = await map.getRect();
assert.ok(rect.width > 0 && rect.height > 0);
await driver.actions({ async: true })
  .move({ origin: map, x: 0, y: 0 })
  .click()
  .perform();
```

O offset da Actions API é relativo ao centro visível do elemento. Não copie a semântica de coordenadas do Playwright, que usa posição relativa ao canto do elemento. Escolha locais longe dos controles sobrepostos e confirme pelo card ou exportação que o elemento foi criado.

Para conferir o layout compacto, reduza a janela com `driver.manage().window().setRect({ width: 390, height: 844 })` e confira a largura real com `window.innerWidth` por `executeScript`. Chrome mobile emulado exige configuração específica de `mobileEmulation`; somente redimensionar não cria eventos touch nem testa um celular físico. Abra o drawer antes de procurar abas.

Chrome, Firefox e Safari exigem suas próprias Options e condições de ambiente. Não tente abrir Safari em um job Ubuntu. Grid só será necessário quando quiser sessões remotas ou distribuir navegadores; não é pré-requisito destes casos locais.

Para busca, não consulte o Photon em todo teste. Você pode testar coordenadas localmente e usar resposta controlada para endereços por uma estratégia de interceptação/proxy/BiDi compatível com seus bindings. O método `page.route()` pertence ao Playwright e não deve ser copiado para Selenium.

**Resultado esperado:** cada cenário testa seu comportamento com a ferramenta correta, sem confundir viewport, touch e app nativo.

**Prompt opcional**

```text
Planeje meu próximo cenário Selenium do Mapa, mantendo a versão web. Explique a Actions API e o referencial de coordenadas quando envolver o canvas. Para mobile, separe resize, emulação e teste físico. Para rede, proponha uma estratégia compatível com Selenium JavaScript e não use APIs do Playwright.
```

Referências: [Actions API](https://www.selenium.dev/documentation/webdriver/actions_api/), [Chrome](https://www.selenium.dev/documentation/webdriver/browsers/chrome/), [Grid](https://www.selenium.dev/documentation/grid/getting_started/).

## 16. Executar Selenium no GitHub Actions

**Faça à mão**

Com a suíte local passando, crie `.github/workflows/selenium.yml`. O exemplo usa Chrome do runner Ubuntu e Selenium Manager; não instala Grid. O build vem antes de iniciar preview.

```yaml
name: Selenium web

on:
  push:
  pull_request:
    branches: [main]
  merge_group:
    types: [checks_requested]
  workflow_dispatch:

permissions:
  contents: read

jobs:
  chrome:
    name: Selenium Chrome
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: '24'
          package-manager-cache: false
      - name: Preparar Yarn
        run: npm install --global yarn@1.22.22
      - name: Instalar dependências fixadas
        run: yarn install --frozen-lockfile
      - name: Conferir navegador do runner
        run: google-chrome --version
      - name: Compilar aplicativo
        run: yarn build
      - name: Executar testes com preview local
        shell: bash
        env:
          HEADLESS: '1'
          SELENIUM_BASE_URL: http://127.0.0.1:5175
        run: |
          set -euo pipefail
          mkdir -p test-results/selenium
          yarn preview --host 127.0.0.1 --port 5175 --strictPort > test-results/selenium/vite-preview.log 2>&1 &
          server_pid=$!
          trap 'kill "$server_pid" 2>/dev/null || true' EXIT
          ready=0
          for attempt in $(seq 1 60); do
            if ! kill -0 "$server_pid" 2>/dev/null; then
              cat test-results/selenium/vite-preview.log
              exit 1
            fi
            if curl --fail --silent "$SELENIUM_BASE_URL" > /dev/null; then
              ready=1
              break
            fi
            sleep 1
          done
          if [ "$ready" -ne 1 ]; then
            cat test-results/selenium/vite-preview.log
            exit 1
          fi
          yarn node --test --test-concurrency=1 --test-reporter=spec --test-reporter=junit --test-reporter-destination=stdout --test-reporter-destination=test-results/selenium/junit.xml tests/selenium/*.test.mjs
      - name: Publicar evidências
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: selenium-chrome
          path: test-results/selenium/
          retention-days: 7
          if-no-files-found: ignore
```

O loop espera o servidor responder, tem limite e verifica se o processo morreu. Esse polling de infraestrutura não substitui as esperas explícitas da UI dentro dos testes. `trap` encerra o processo iniciado pelo job ao sair, inclusive quando os testes falham.

O runner atual traz Chrome; ao mudar a imagem ou usar runner próprio, confira a lista de software e providencie um navegador compatível. O Selenium Manager também pode precisar baixar o driver no primeiro uso. Os testes do ArcGIS ainda dependem de recursos externos se você não preparar uma estratégia específica de rede.

O XML JUnit é um artefato de resultados, não uma UI nativa do Selenium nem um trace. O GitHub marca o job pela saída do processo; para um painel extra com resultados por teste, escolha e configure um publicador de JUnit separadamente.

Como no Playwright, `push` testa o estado enviado, `pull_request` verifica o PR e o merge dispara um push em `main`. Um commit só local não dispara Actions; um push com vários commits não gera necessariamente um teste separado de cada commit intermediário. Os gatilhos push e PR podem duplicar execuções. Para reduzir duplicidade, limite push a `main` e mantenha PRs.

**Resultado esperado:** a execução não precisa de um servidor manual, retorna falha se o teste falhar e publica logs, XML e capturas disponíveis.

**Prompt opcional**

```text
Crie somente o workflow Selenium do passo 16 usando Chrome e Node 24 no runner Ubuntu. Preserve Yarn 1.22.22 e frozen-lockfile. Compile antes de iniciar preview, espere a porta 5175 com limite e encerre o processo em falha. Execute com HEADLESS e um processo de teste por vez, publicando JUnit e evidências. Não adicione Grid, credenciais ou IA ao CI.
```

Referências: [Actions e eventos](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [software dos runners](https://github.com/actions/runner-images), [reporters do Node 24](https://nodejs.org/docs/latest-v24.x/api/test.html#test-reporters), [upload de artefatos](https://github.com/actions/upload-artifact).

## 17. Exigir o check no merge e escolher hooks locais

**Faça à mão**

Depois da primeira execução, exija **Selenium Chrome** nas regras de `main`, junto de **Playwright Chromium** se quiser que ambos sejam obrigatórios. Use os nomes exibidos nas execuções reais, evitando jobs com nomes iguais em workflows diferentes.

Exigir os checks antes do merge é uma regra do repositório; colocar `on: push` no YAML, sozinho, não bloqueia a integração. Configure PR obrigatório, checks exigidos e aplicação das regras conforme o plano do GitHub e suas permissões. Um PR com expectativa errada deve ficar bloqueado até ser corrigido.

Para commits locais, a opção mais simples é um hook que chame os smoke. Se já seguiu o guia Playwright, **edite o hook existente**, em vez de configurar outro `core.hooksPath` e desativar o primeiro sem perceber. Um exemplo de `.githooks/pre-commit`, com servidor Selenium já disponível:

```sh
#!/bin/sh
set -eu
yarn test:pw --project=chromium --grep '@smoke'
HEADLESS=1 yarn test:selenium:smoke
```

Se ainda não configurou o Playwright, deixe somente a linha do Selenium. Aqui o Playwright administra seu servidor; o Selenium depende do servidor manual na porta 5175. Para automatizar também o servidor local do Selenium, crie um script de infraestrutura com início, verificação de prontidão e cleanup como no workflow. Não inclua uma espera fixa esperando que Vite “já tenha iniciado”.

Confira o valor anterior de `core.hooksPath`, dê permissão de execução e só então ative o hook. Os hooks podem ser ignorados e não são a barreira remota. Como abrir dois navegadores em todo commit é caro, você pode preferir `pre-push` ou manter apenas o CI obrigatório.

**Resultado esperado:** você escolheu conscientemente quando rodar cada suíte, sem remover hooks anteriores e sem confundir falha pós-merge com bloqueio pré-merge.

**Prompt opcional**

```text
Revise minha política de testes locais e no GitHub. Já posso ter um hook Playwright. Mostre como incluir somente o smoke Selenium preservando o hook atual e explicando a dependência do servidor na porta 5175. Compare custo de pre-commit e pre-push. Não altere core.hooksPath ou regras remotas automaticamente.
```

Referências: [proteção de branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches), [hooks do Git](https://git-scm.com/docs/githooks).

## 18. Organizar a aprendizagem com e sem IA

**Faça à mão**

Use a mesma descrição de comportamento nas duas ferramentas, mas escreva as implementações separadas. Assim você compara esperas, locators e evidências, em vez de comparar cenários diferentes.

| Etapa de aprendizagem | Parte que vale fazer manualmente | Uso opcional de IA |
|---|---|---|
| Primeiro smoke | Criar driver, esperar prontidão e escrever assertions | Revisar await, locators e cleanup |
| Projeto | Preparar cenário e definir o resultado | Sugerir escopos e diagnosticar falha |
| Importação | Construir a fixture e explicar a geometria | Conferir coordenadas e regras esperadas |
| Edição | Definir o que é ou não uma alteração | Revisar cobertura dos casos de troca/cancelamento |
| Debug | Ler erro e evidências primeiro | Comparar hipóteses com o que foi observado |
| Infraestrutura | Entender o fluxo do job e os gatilhos | Montar YAML e revisar encerramento do servidor |

Não traduza mecanicamente `getByRole`, `expect().toBeVisible()` e `page.route()` para nomes parecidos de Selenium. Consulte a API dos bindings JavaScript. Compare a execução real do teste escrito, não apenas o sucesso de uma exploração da IA.

Extraia Page Objects quando houver repetição útil. Preserve as assertions de negócio no teste e não adicione retries amplos para ocultar uma corrida. Nomes claros e preparo independente ajudam mais que uma estrutura enorme para dois casos.

**Resultado esperado:** você entende o código que mantém e consegue implementar um caso novo sem depender do agente.

**Prompt opcional**

```text
Atue como revisor da minha suíte Selenium, sem expandi-la. Aponte APIs antigas, waits frágeis, estado compartilhado e cleanup ausente. Consulte documentação atual quando houver dúvida. Proponha uma melhoria pequena por vez e me deixe escrever os cenários que marquei como manuais.
```

Referência: [orientação oficial para usar IA com Selenium](https://www.selenium.dev/documentation/ai_agents/).

## 19. Resolver os problemas mais comuns

| Sintoma | Primeiro diagnóstico |
|---|---|
| Driver incompatível ou sessão não criada | Confira Chrome, versão instalada de Selenium, mensagens do Manager, rede/proxy e cache; não baixe um driver aleatório |
| `ERR_CONNECTION_REFUSED` | Confirme o servidor e a porta 5175 antes de culpar o locator |
| Elemento existe, mas clique é interceptado | Procure modal, drawer ou overlay e espere o estado correto; não force por JavaScript |
| `StaleElementReferenceError` | O React recriou o nó; espere a transição e localize novamente |
| O assert compara um estado antigo | Espere o resultado com `driver.wait()` antes de usar o assert do Node |
| Testes dependem da ordem | Crie uma sessão nova por teste e prepare dados próprios |
| Sobraram processos Chrome | Confira `quit()` em todos os caminhos, inclusive falhas de setup |
| Importação abriu janela do sistema | Envie o arquivo ao input e comece esse caso em headless, conforme o passo 9 |
| Abas sumiram no layout pequeno | Confira `innerWidth` e abra o drawer antes de localizar as abas |
| Só falha no CI | Compare modo headless, viewport, WebGL, navegador, rede externa e evidências |
| IDE exportou um código que não roda | Confira linguagem, runner e CommonJS/ESM; não confunda Mocha com node:test |
| MCP funcionou e o teste falhou | A sessão exploratória não comprova execução do arquivo nem igualdade de versões/estado |

**Prompt opcional**

```text
Estou no passo [número] do guia Selenium. Comando: [comando]. Erro completo: [erro]. Consulte meu teste, o helper e a documentação dos bindings JavaScript. Proponha uma verificação que confirme a causa antes de corrigir. Não adicione driver.sleep, outro runner ou caminhos de driver fixos para esconder o problema.
```

## Checklist de conclusão

- [ ] Entendi WebDriver, Manager, runner e Grid.
- [ ] Instalei só o necessário e preservei o lockfile.
- [ ] Escrevi e provoquei uma falha no meu primeiro teste.
- [ ] Sei executar com navegador visível e em headless.
- [ ] Uso esperas explícitas e encerro todas as sessões.
- [ ] Consigo depurar pelo editor e ler evidências de falha.
- [ ] Sei que Selenium IDE, MCP e Grid são peças adicionais.
- [ ] Não confundo APIs e artefatos Playwright com Selenium.
- [ ] O workflow inicia/encerra o servidor e publica resultados.
- [ ] Checks obrigatórios estão separados dos hooks locais.
- [ ] A IA acelera etapas revisadas, sem substituir meu entendimento dos casos.
