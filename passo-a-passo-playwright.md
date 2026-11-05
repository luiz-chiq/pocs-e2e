# Playwright: passo a passo para testar a versão web do Mapa

Guia preparado em 04/11/2026. Comece por este documento; depois siga [o guia de Selenium](passo-a-passo-selenium.md).

Este é um roteiro para você implementar os testes. A criação deste documento não instala pacotes, não configura MCP e não adiciona testes ao projeto. Os arquivos e comandos abaixo são etapas futuras, a executar conforme você avançar.

## Como usar este guia

Cada etapa tem uma parte manual, um resultado esperado e um prompt opcional. Você pode fazer uma etapa sozinho e usar IA na seguinte. Antes de consultar o exemplo de código, tente escrever sua versão.

Se quiser apenas orientação, acrescente ao prompt: **“Não edite arquivos nem execute comandos; explique e revise minha tentativa.”** Se quiser delegar uma etapa, acrescente: **“Implemente apenas esta etapa e mostre o diff. Não avance para a próxima.”**

Contexto usado nos exemplos:

- Aplicativo React + TypeScript + Vite, com mapa ArcGIS e PWA.
- Node 24 e Yarn Classic 1.22.22; o repositório já usa `yarn.lock`.
- Testes primeiro em Chromium desktop, com um worker para reduzir o consumo de memória.
- Endereço exclusivo dos testes: `http://127.0.0.1:5174`. O desenvolvimento habitual pode continuar em outra porta.
- Dados do Mapa ficam em IndexedDB **e** localStorage. Limpar só localStorage não zera os projetos.
- Os exemplos cobrem a versão web. Electron e Android nativo ficam para uma etapa posterior.

## 1. Conferir o ambiente e escolher seu primeiro cenário

**Faça à mão**

Na raiz do projeto:

```sh
node --version
yarn --version
git status --short
```

Use Node 24 atualizado e Yarn 1.22.22. Se Yarn não estiver disponível, instale essa versão conforme sua instalação do Node; uma opção é `npm install --global yarn@1.22.22`. Aqui o npm instala somente o gerenciador global: continue usando Yarn para as dependências do projeto, sem criar `package-lock.json`.

Abra o aplicativo normalmente e escreva seu primeiro caso em português:

> Dado um navegador sem dados anteriores, quando abro o Mapa, então vejo o título, as três abas e o botão Criar disponível.

Escolha também um caso que modifica algo: abrir um projeto novo com nome e confirmar que ele começa vazio. Decida as expectativas antes de escrever os comandos do teste.

**Resultado esperado:** você sabe qual comportamento quer verificar e qual seria uma falha real.

**Prompt opcional**

```text
Quero começar os testes web do Mapa com Playwright, fazendo a implementação na mão. Leia package.json, vite.config.ts e os componentes envolvidos. Proponha três cenários pequenos com preparação, ação e resultado observável. Não crie testes ainda. Considere IndexedDB, localStorage e o mapa ArcGIS.
```

Referência: [requisitos e instalação](https://playwright.dev/docs/intro).

## 2. Instalar apenas o necessário

**Faça à mão**

```sh
yarn add --dev --exact @playwright/test
yarn playwright install chromium
yarn playwright --version
```

O primeiro comando adiciona o runner ao projeto; o segundo baixa o navegador compatível com essa versão. O Chromium dos testes é independente do Chrome do seu uso diário. Ao atualizar `@playwright/test`, rode novamente a instalação dos navegadores.

No Linux/CI, use `yarn playwright install --with-deps chromium` para incluir dependências do sistema. No macOS, o comando simples acima basta para começar.

Para aprender a configuração, este guia segue a instalação manual. O assistente `yarn create playwright` é uma alternativa, **não uma segunda etapa obrigatória**: ele pode gerar configuração, exemplos e workflow que você vai preferir escrever agora.

**Resultado esperado:** `package.json` e `yarn.lock` mudaram e a CLI mostra uma versão. Nenhuma suíte precisa existir ainda.

**Prompt opcional**

```text
Instale somente @playwright/test como devDependency com versão exata usando Yarn Classic e o Chromium correspondente. Preserve os scripts e as dependências existentes. Não gere testes, configuração ou workflow. Explique separadamente a dependência npm e o navegador baixado.
```

## 3. Criar a estrutura e a configuração

**Faça à mão**

Crie `tests/playwright/` e, na raiz, `playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env.CI);

export default defineConfig({
  testDir: './tests/playwright',
  fullyParallel: false,
  workers: 1,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
  ],
  outputDir: 'test-results/playwright',
  use: {
    baseURL: 'http://127.0.0.1:5174',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10_000,
    navigationTimeout: 45_000,
    serviceWorkers: 'block',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: ci
      ? 'yarn preview --host 127.0.0.1 --port 5174 --strictPort'
      : 'yarn dev --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

O runner inicia e encerra o servidor. Localmente usa Vite dev; no CI usa o build servido pelo preview. **No CI, `yarn build` precisa rodar antes dos testes.** A porta estrita evita migrar silenciosamente para outro endereço; se estiver ocupada, investigue o processo em vez de usar sua sessão normal do aplicativo.

O bloqueio de service workers mantém esta primeira suíte funcional fora do cache da PWA. Testes específicos de instalação, atualização e offline devem usar outra configuração com service workers permitidos.

Adicione ao `.gitignore`:

```gitignore
/playwright-report/
/test-results/
/blob-report/
/playwright/.auth/
```

Não ignore `tests/` nem os arquivos de referência de screenshots que você aprovar futuramente.

**Resultado esperado:** a configuração aponta só para os testes Playwright e não vai procurar testes Selenium.

**Prompt opcional**

```text
Crie somente a configuração Playwright do passo 3 deste guia e as entradas de .gitignore. Use tests/playwright, Chromium, um worker, porta 5174, servidor novo por execução e preview no CI após build. Explique trace on-first-retry e o bloqueio de service workers. Não escreva testes nem altere o app.
```

Referências: [configuração](https://playwright.dev/docs/test-configuration), [servidor web](https://playwright.dev/docs/test-webserver).

## 4. Adicionar scripts e verificar os tipos

**Faça à mão**

Acrescente estas entradas ao objeto `scripts` existente no `package.json`, preservando as demais:

```json
{
  "test:pw": "playwright test",
  "test:pw:ui": "playwright test --ui",
  "test:pw:headed": "playwright test --headed",
  "test:pw:debug": "playwright test --debug",
  "test:pw:report": "playwright show-report",
  "test:pw:types": "tsc --noEmit -p tsconfig.playwright.json"
}
```

O TypeScript do app inclui `src`, mas não esta nova pasta. Crie `tsconfig.playwright.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["node", "@playwright/test"]
  },
  "include": ["playwright.config.ts", "tests/playwright/**/*.ts"]
}
```

Playwright transforma TypeScript para executar, mas isso não substitui uma checagem de tipos. Depois de criar o primeiro teste, rode também `yarn test:pw:types`.

**Resultado esperado:** os comandos têm nomes próprios e não conflitam com os futuros scripts `test:selenium`.

**Prompt opcional**

```text
Adicione os scripts Playwright e o tsconfig.playwright.json do passo 4, sem substituir scripts existentes. Explique por que o build do app e a execução do Playwright não garantem a checagem de tipos de tests/playwright. Não crie casos de teste.
```

Referência: [TypeScript no Playwright](https://playwright.dev/docs/test-typescript).

## 5. Escrever o primeiro teste 100% à mão

**Faça à mão**

Crie `tests/playwright/inicio.spec.ts`. Tente escrever o cenário do passo 1 antes de consultar:

```ts
import { test, expect } from '@playwright/test';

test('@smoke abre o Mapa pronto para criar', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Mapa', exact: true }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Criar', exact: true }))
    .toBeEnabled();
  await expect(page.getByRole('tab', { name: 'Áreas 0', exact: true }))
    .toBeVisible();
  await expect(page.getByRole('tab', { name: 'Pontos 0', exact: true }))
    .toBeVisible();
  await expect(page.getByRole('tab', { name: 'Avisos 0', exact: true }))
    .toBeVisible();
});
```

```sh
yarn test:pw tests/playwright/inicio.spec.ts --project=chromium
yarn test:pw:types
```

Neste app, ver o título não significa que o mapa e os dados terminaram de iniciar. O botão Criar habilitado é uma condição melhor para começar a interagir. O `@smoke` no título permite filtrar este grupo depois.

Troque temporariamente uma expectativa, por exemplo `Pontos 0` por `Pontos 99`, e veja o teste falhar. Depois restaure. Um teste que falha quando o resultado está errado é mais útil que uma sequência de cliques sem verificações.

**Resultado esperado:** um teste passa; a mudança proposital provoca uma falha compreensível.

**Prompt opcional**

```text
Revise meu inicio.spec.ts como tutor. Confira se testa o comportamento do Mapa e espera prontidão suficiente. Aponte problemas sem reescrever o arquivo. Não adicione esperas fixas, mocks ou cenários novos. Explique qual mudança faria o teste falhar de propósito.
```

## 6. Aprender locators e esperas antes de aumentar a suíte

**Faça à mão**

Prefira nomes e papéis acessíveis: `getByRole`, `getByLabel` e o escopo de um diálogo ou card. Use `exact: true` quando o nome for específico. Recorra a IDs existentes para condições técnicas; crie `data-testid` apenas quando o contrato acessível não resolver.

Exemplo de escopo, dentro de um teste:

```ts
await page.getByRole('button', { name: /^Projetos:/ }).click();
const dialog = page.getByRole('dialog', { name: 'Projetos', exact: true });
await expect(dialog).toBeVisible();
await dialog.getByLabel('Novo projeto', { exact: true }).fill('Meu teste');
await dialog.getByRole('button', { name: 'Criar', exact: true }).click();
await expect(dialog).not.toBeVisible();
await expect(page.getByRole('button', { name: 'Projetos: Meu teste' }))
  .toBeVisible();
```

`click()` espera o elemento estar apto à ação; `expect(locator)` refaz a verificação até o timeout. Isso não significa que qualquer processo do app acabou: espere também o resultado, como o diálogo fechar ou um card aparecer.

Evite `waitForTimeout`, `force: true` como correção genérica, XPath absoluto, `.nth()` para esconder ambiguidades e `networkidle` para decidir que o mapa terminou. O ArcGIS carrega recursos e imagens de forma independente.

**Resultado esperado:** você consegue explicar por que cada locator é único e cada espera é necessária.

**Prompt opcional**

```text
Revise somente os locators e as esperas deste teste. Confira os nomes acessíveis reais nos componentes. Prefira roles, labels e escopos; não invente data-testid e não use sleeps, force ou nth para fazer passar. Explique cada ambiguidade antes de propor uma alteração.
```

Referências: [locators](https://playwright.dev/docs/locators), [assertions](https://playwright.dev/docs/test-assertions), [auto-waiting](https://playwright.dev/docs/actionability).

## 7. Usar a UI e o navegador visível

**Faça à mão**

```sh
yarn test:pw:ui --project=chromium
```

Na UI, selecione `inicio.spec.ts`, execute só esse teste, examine cada ação e ative o acompanhamento de alterações quando quiser repetir ao salvar. Os filtros por arquivo, nome e projeto ajudam a trabalhar com um cenário por vez.

Compare três ferramentas diferentes:

| Comando | O que abre |
|---|---|
| `yarn test:pw:ui` | Painel de desenvolvimento dos testes, com ações, resultados e modo de acompanhamento |
| `yarn test:pw:headed` | Navegador visível enquanto o runner executa |
| `yarn test:pw:report` | Relatório HTML da execução já concluída |

Se usar VS Code, a extensão oficial **Playwright Test for VSCode**, da Microsoft, permite executar e depurar testes pelo painel Testing. Ela é opcional e usa a configuração do repositório.

**Resultado esperado:** você executa um teste isolado pela UI e identifica em qual ação uma falha aconteceu.

**Prompt opcional**

```text
Me oriente a executar meu teste existente no UI Mode do Playwright. Explique a diferença entre UI Mode, headed e relatório HTML. Não mude os testes. Se eu enviar um erro ou trace, ajude a localizar a primeira expectativa incorreta antes de sugerir código.
```

Referências: [UI Mode](https://playwright.dev/docs/test-ui-mode), [extensão VS Code](https://playwright.dev/docs/getting-started-vscode).

## 8. Depurar com Inspector e pause

**Faça à mão**

```sh
yarn test:pw tests/playwright/inicio.spec.ts --project=chromium --debug
```

O Inspector permite acompanhar passos e experimentar locators. Em um teste específico, `await page.pause()` cria uma pausa para exploração; remova a pausa antes de enviar o código para CI.

Reproduza uma falha com o mesmo navegador, viewport e dados. Diferencie elemento ausente, elemento encoberto por modal, seletor ambíguo e app ainda iniciando. Só aumente timeout quando o tempo necessário for parte conhecida do cenário.

**Resultado esperado:** você encontra a condição faltante, em vez de corrigir a falha com uma espera arbitrária.

**Prompt opcional**

```text
Ajude a depurar apenas este teste Playwright. Use o erro e a linha que falhou para propor uma investigação com Inspector. Não aumente timeouts nem adicione retries ou sleeps antes de identificar a causa. Quero fazer a correção final à mão.
```

Referência: [debug de testes](https://playwright.dev/docs/debug).

## 9. Gravar e ler um trace — o “tracer”

**Faça à mão**

Para gerar um trace mesmo sem retry:

```sh
yarn test:pw tests/playwright/inicio.spec.ts --project=chromium --trace on
yarn test:pw:report
```

Abra a execução no relatório e entre no trace. Para abrir diretamente um `trace.zip` encontrado dentro de `test-results/playwright/`, use:

```sh
yarn playwright show-trace caminho/para/trace.zip
```

Substitua o caminho pelo arquivo real. Examine a ação que falhou, os snapshots antes/depois, o locator, o log da chamada, console e rede. O trace ajuda a reconstruir o que o teste viu; uma screenshot mostra só um instante.

A configuração deste guia usa `on-first-retry`: no CI haverá trace no primeiro retry; localmente, com zero retries, use `--trace on` quando investigar. Outra opção é `trace: 'retain-on-failure'`, que grava e conserva traces de falhas. Evite guardar tudo indefinidamente.

Você também pode organizar um fluxo longo com `test.step('Importar dados', async () => { /* ações */ })`. Esses nomes aparecem nos resultados e ajudam a ler o trace.

**Resultado esperado:** você consegue explicar uma falha usando evidências do trace. Ao compartilhar artefatos, confira se contêm somente os dados fictícios do teste.

**Prompt opcional**

```text
Analise este trace ou os trechos que eu fornecer. Diga a última condição que estava correta, a primeira ação que falhou e a evidência de DOM/rede/console que sustenta a hipótese. Não remova assertions para fazer o teste passar. Sugira uma correção pequena, separando problema do app e problema do teste.
```

Referências: [Trace Viewer](https://playwright.dev/docs/trace-viewer), [API de tracing](https://playwright.dev/docs/api/class-tracing).

## 10. Usar codegen como rascunho

**Faça à mão**

Codegen não inicia automaticamente o `webServer` da configuração. Com o runner parado, abra outro terminal e execute:

```sh
yarn dev --host 127.0.0.1 --port 5174 --strictPort
```

Em um segundo terminal:

```sh
yarn playwright codegen --browser chromium --viewport-size '1280,720' --target playwright-test --output tests/playwright/gravacao.spec.ts http://127.0.0.1:5174
```

Use um nome de arquivo novo: `--output` pode sobrescrever uma gravação existente. Grave abrir Projetos, preencher um nome e criar um projeto vazio. Use os controles de assertions do Inspector para registrar uma verificação do resultado.

Depois leia e reescreva o arquivo: dê um nome ao caso, troque a URL absoluta por `page.goto('/')`, remova ações redundantes, espere prontidão e acrescente expectativas de negócio. Não transfira cegamente cliques do mapa por pixels para uma suíte estável.

Encerre o servidor manual com Ctrl+C antes de voltar a `yarn test:pw`: a configuração exige uma porta livre para iniciar o próprio servidor.

**Resultado esperado:** você entende cada linha da gravação e transforma o rascunho em um teste que detecta um erro real.

**Prompt opcional**

```text
Revise esta gravação do codegen como rascunho. Preserve o cenário que eu gravei e proponha nomes, escopos e assertions melhores. Explique quais linhas são ruído e quais coordenadas dependem do layout. Não gere outros casos e não altere o app para acomodar a gravação.
```

Referência: [codegen](https://playwright.dev/docs/codegen).

## 11. Preparar dados pelo importador e testar validação

**Faça à mão**

Para testar as regras do mapa, comece com geometrias pequenas e conhecidas, importadas pela interface. Você separa a regra espacial da dificuldade de desenhar com mouse.

Crie manualmente `tests/fixtures/mapa-basico.geojson`:

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": { "name": "Área de teste", "color": "#23845b" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-46.64, -23.55], [-46.63, -23.55], [-46.63, -23.54],
          [-46.64, -23.54], [-46.64, -23.55]
        ]]
      }
    },
    {
      "type": "Feature",
      "properties": { "name": "Ponto de teste", "color": "#23845b" },
      "geometry": { "type": "Point", "coordinates": [-46.635, -23.545] }
    }
  ]
}
```

Crie `tests/playwright/importacao.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import path from 'node:path';

test('importa área e ponto da mesma cor e mostra alerta', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Criar', exact: true }))
    .toBeEnabled();

  const fileChooserPromise = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: 'Importar áreas e pontos', exact: true })
    .click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles(path.resolve('tests/fixtures/mapa-basico.geojson'));

  const dialog = page.getByRole('dialog', {
    name: 'Importar áreas e pontos', exact: true,
  });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Adicionar itens', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('#polygon-count')).toHaveText('2');

  await page.getByRole('tab', { name: 'Avisos 1', exact: true }).click();
  await expect(page.getByText('Alerta', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', {
    name: 'Localizar: O ponto “Ponto de teste” está dentro da área “Área de teste” da mesma cor.',
    exact: true,
  })).toBeVisible();
});
```

A espera por `filechooser` vem **antes** do clique. O diálogo de importação é um `<dialog>` HTML, não um `alert()` do navegador; ele é localizado no DOM.

Agora faça sozinho um segundo caso: ponto de cor diferente deve gerar **Erro**. Não mude o arquivo compartilhado durante o teste; crie outra fixture ou uma cópia em memória. Depois exercite substituir/adicionar, projeto vazio e exportar somente os selecionados.

**Resultado esperado:** a geometria conhecida produz o aviso correto, sem depender de cliques no canvas.

**Prompt opcional**

```text
Quero implementar a validação espacial à mão. Revise minha fixture GeoJSON: confirme longitude/latitude, ponto dentro da área e igualdade das cores da paleta. Depois revise o teste de importação e alerta, sem criar o caso de erro por mim. Não prepare dados chamando o controller nem escrevendo diretamente no armazenamento do app.
```

Referências: [arquivos e ações](https://playwright.dev/docs/input), [GeoJSON](https://datatracker.ietf.org/doc/html/rfc7946).

## 12. Testar o desenho real e a exportação

**Faça à mão**

Mantenha alguns testes próprios para a interação com o mapa, além dos testes por importação. Para desenhar um ponto, use o botão Criar, escolha Ponto, clique dentro de `#map`, preencha Nome do ponto e confirme.

Calcule o clique em relação ao mapa, dentro de um teste com viewport fixo:

```ts
const map = page.locator('#map');
const box = await map.boundingBox();
if (!box) throw new Error('O mapa não está visível');
await map.click({ position: { x: box.width * 0.55, y: box.height * 0.55 } });
```

Esse trecho supõe que o modo de criação já foi aberto. Para uma área, escolha pontos não colineares, longe dos controles flutuantes, e conclua pela ação que a UI oferece. Verifique o card criado e o conteúdo exportado, não apenas uma imagem do desenho.

Para baixar um arquivo, registre `page.waitForEvent('download')` antes de confirmar Exportar. Use `download.saveAs(testInfo.outputPath('mapa.geojson'))`, leia o JSON e valide tipo, quantidade, nomes e cores. Não compare o texto inteiro, a data ou a ordem das propriedades.

Crie um exercício específico para buracos: importe uma área com anel interno, exporte e confira que o buraco foi preenchido. Um screenshot de satélite não comprova essa regra.

**Resultado esperado:** há cobertura da interação de desenho e do resultado geográfico, com responsabilidades separadas.

**Prompt opcional**

```text
Me ajude a desenhar um único caso E2E de criação real de ponto no mapa, sem implementá-lo ainda. Proponha viewport, preparação, cliques relativos ao elemento #map e verificações pelo card e exportação. Explique as fontes de instabilidade. Não acesse o controller e não use coordenadas absolutas da minha tela.
```

Referências: [downloads](https://playwright.dev/docs/downloads), [cliques e mouse](https://playwright.dev/docs/input).

## 13. Isolar estado, rede e persistência

**Faça à mão**

Cada teste com a fixture `page` recebe um contexto limpo. Não compartilhe uma página global, perfil pessoal ou `storageState` com projetos reais. Para testar persistência, crie ou importe dados e recarregue **no mesmo teste e contexto**; outro teste deve começar independente.

A busca por endereço usa Photon. Para testar a UI sem consultar o serviço público, registre uma rota antes de abrir a página:

```ts
await page.route('https://photon.komoot.io/api/**', async route => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [-46.6333, -23.5505] },
        properties: { name: 'Praça de teste', city: 'São Paulo' },
      }],
    }),
  });
});
```

Escreva depois um caso de resposta vazia e outro de falha HTTP. Mantenha o teste real do provedor separado e eventual, sem fazê-lo requisito de todos os commits. Na busca por coordenadas, verifique também que nenhuma chamada ao Photon foi feita.

Para o ArcGIS, começar com recursos externos reais é possível, mas o CI continuará sujeito à rede. Não responda JSON genérico a todas as URLs da Esri: o SDK espera formatos específicos. Se os testes precisarem ficar offline, prepare recursos válidos ou um ambiente próprio; isso é uma tarefa separada. A suíte não deve exigir sucesso de todas as imagens de satélite para conferir um modal.

Quando persistir estado com `storageState`, observe que IndexedDB exige inclusão explícita nas APIs que o suportam; um arquivo só de cookies/localStorage não representa todo o Mapa.

**Resultado esperado:** os testes não dependem da ordem de execução nem consultam o geocoder em cada repetição.

**Prompt opcional**

```text
Revise o isolamento dos meus testes. O Mapa usa IndexedDB e localStorage, PWA e ArcGIS; a busca usa Photon. Proponha somente os mocks necessários ao cenário e uma forma de testar persistência no mesmo contexto. Não desative WebGL nem substitua todas as respostas da Esri por dados genéricos.
```

Referências: [isolamento](https://playwright.dev/docs/browser-contexts), [rede](https://playwright.dev/docs/network), [estado de navegador](https://playwright.dev/docs/auth).

## 14. Adicionar viewport móvel e outros navegadores depois

**Faça à mão**

Primeiro estabilize Chromium desktop. Depois adicione um projeto chamado `mobile-chromium`, com `browserName: 'chromium'`, viewport `390 × 844`, `isMobile: true` e `hasTouch: true`. Acrescente outro de largura 320 quando quiser verificar o limite menor.

Não execute o mesmo smoke desktop sem adaptação: no mobile as abas ficam dentro do drawer fechado. Abra primeiro o botão **Abrir lista de áreas, pontos e avisos**. Atalhos de teclado devem ficar indisponíveis em larguras de até 720 px, inclusive se a preferência salva estiver ligada.

Separe os arquivos com `testMatch`/`testIgnore` ou pastas para que casos exclusivos de desktop não rodem no projeto móvel. Para ampliar navegadores:

```sh
yarn playwright install firefox webkit
```

Adicione projetos `firefox` e `webkit` à configuração e execute explicitamente o desejado. Viewport/emulação não substitui um aparelho físico nem testa o APK Android.

Para testes visuais, prefira screenshots do menu ou diálogo. O satélite muda com rede, tiles e renderização de GPU; não use a tela inteira como primeira referência. Gere e revise baselines no mesmo ambiente do CI antes de usar `--update-snapshots`.

**Resultado esperado:** cada projeto executa cenários compatíveis com seu layout, sem triplicar todo o trabalho logo no início.

**Prompt opcional**

```text
Proponha a separação dos meus testes Playwright entre desktop e mobile Chromium, preservando o desktop atual. Considere drawer fechado, abas no rodapé e ausência de atalhos em até 720 px. Mostre quais cenários podem ser compartilhados e quais precisam de arquivos próprios. Não altere baselines visuais automaticamente.
```

Referências: [projetos](https://playwright.dev/docs/test-projects), [emulação](https://playwright.dev/docs/emulation), [comparação visual](https://playwright.dev/docs/test-snapshots).

## 15. Usar MCP para a IA explorar a interface

**Faça à mão**

MCP é opcional. O Playwright MCP permite a um cliente de IA explorar o navegador; `@playwright/test` executa os arquivos de teste. Uma exploração por MCP não vira automaticamente um teste, e o MCP não lê sua configuração de testes como se fosse o runner.

Para o exemplo abaixo, tenha o Google Chrome instalado. Ele usa um perfil isolado; os testes anteriores continuam usando o Chromium baixado pelo Playwright. Inicie o Vite na porta 5174 como no passo do codegen e pare o runner enquanto explorar.

Em clientes que aceitam `mcpServers`, a configuração básica é:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": [
        "-y", "@playwright/mcp@latest",
        "--browser", "chrome",
        "--isolated",
        "--viewport-size", "1280x720",
        "--block-service-workers"
      ]
    }
  }
}
```

No Codex CLI, uma alternativa é:

```sh
codex mcp add playwright -- npx -y @playwright/mcp@latest --browser chrome --isolated --viewport-size 1280x720 --block-service-workers
codex mcp list
```

Isso configura o **cliente de IA**, não uma dependência do app. Não configure o mesmo servidor duas vezes. O arquivo/formato depende do cliente; para configuração manual do Codex, o equivalente é uma tabela `[mcp_servers.playwright]` em seu `config.toml`. Se o app oferecer uma tela de MCP, informe o mesmo comando e os argumentos nela.

`@latest` facilita experimentar; para repetir exatamente o ambiente, escolha e fixe uma versão do MCP após conferir o pacote. Ela é independente da versão de `@playwright/test`.

**Prompt para explorar sem gerar testes**

```text
Use o Playwright MCP com perfil isolado em http://127.0.0.1:5174. Explore somente a criação de um projeto vazio chamado Projeto MCP. Identifique os nomes acessíveis dos controles, as condições de espera e o resultado observado. Use dados fictícios. Não edite arquivos, não gere testes e não conecte meu perfil pessoal do navegador. Feche a sessão ao concluir.
```

**Prompt para acelerar uma implementação depois da revisão**

```text
Com base no cenário e nos locators que aprovei, escreva somente um teste Playwright de criação de projeto. Use a configuração existente, expectativas observáveis e isolamento por contexto. Execute apenas esse teste e mostre a evidência da execução. Não altere o comportamento do app, não enfraqueça assertions e não avance para outros cenários.
```

**Resultado esperado:** você diferencia exploração assistida, gravação por codegen e teste determinístico versionado. O CI continuará rodando testes sem IA e sem MCP.

Referências: [Playwright MCP da Microsoft](https://github.com/microsoft/playwright-mcp), [configuração MCP no Codex — documentação oficial OpenAI](https://learn.chatgpt.com/docs/extend/mcp).

## 16. Configurar GitHub Actions para PR, push e merge

**Faça à mão**

Depois de ter ao menos o smoke passando, crie `.github/workflows/playwright.yml`:

```yaml
name: Playwright web

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
  chromium:
    name: Playwright Chromium
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
      - name: Instalar Chromium e dependências Linux
        run: yarn playwright install --with-deps chromium
      - name: Conferir tipos dos testes
        run: yarn test:pw:types
      - name: Compilar aplicativo
        run: yarn build
      - name: Executar testes
        run: yarn test:pw --project=chromium
      - name: Publicar relatório e evidências
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v7
        with:
          name: playwright-chromium
          path: |
            playwright-report/
            test-results/playwright/
          retention-days: 7
          if-no-files-found: ignore
```

O runner hospedado define `CI`, portanto a configuração usa preview, um worker e um retry. Publique o `yarn.lock` junto da instalação; o `--frozen-lockfile` deve falhar se o arquivo estiver incoerente, em vez de atualizar versões no CI. As versões de Actions acima foram consultadas nos repositórios oficiais na preparação deste guia; se usar runner próprio, confira seus requisitos também.

Entenda os gatilhos:

| Evento | O que este workflow faz |
|---|---|
| Commit apenas local | Nada no GitHub; ainda não houve push |
| Push para uma branch | Testa o estado enviado na ponta da branch |
| Abrir/atualizar PR para `main` | Executa os testes para o PR |
| Merge em `main` | O push resultante dispara outra execução |
| Merge queue | `merge_group` testa o grupo preparado pela fila |

Um push contendo vários commits não garante uma execução separada de cada commit intermediário. Push e PR podem produzir execuções duplicadas da mesma alteração. Se preferir reduzir duplicidade, limite `push.branches` a `[main]` e mantenha `pull_request`; branches sem PR deixarão de ser testadas a cada push.

Para simular o caminho do CI localmente, com a porta livre:

```sh
yarn build
CI=1 yarn test:pw --project=chromium
```

Depois abra a execução na aba Actions do repositório, confira logs e baixe o artefato. Descompacte-o e sirva a pasta do relatório pela CLI, em vez de depender de abrir o HTML diretamente:

```sh
yarn playwright show-report caminho/do/artefato/playwright-report
```

Troque o caminho pela pasta extraída; os traces podem ser abertos pelo relatório ou pelo comando do passo 9. O CI inicialmente ainda acessa recursos ArcGIS reais; trate indisponibilidade de rede como uma causa possível, separada de regressões da UI.

**Resultado esperado:** o teste roda sem servidor manual e uma falha produz evidências acessíveis.

**Prompt opcional**

```text
Crie apenas o workflow Playwright do passo 16 usando os scripts existentes e Yarn 1.22.22. Preserve frozen-lockfile, build antes do preview, um worker, Chromium e upload de relatório/traces mesmo em falha. Explique push, pull_request e merge_group, inclusive duplicidade e commits intermediários. Não publique nem altere regras do GitHub por mim.
```

Referências: [CI Playwright](https://playwright.dev/docs/ci-intro), [eventos GitHub](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows), [checkout](https://github.com/actions/checkout), [setup-node](https://github.com/actions/setup-node), [artefatos](https://github.com/actions/upload-artifact).

## 17. Bloquear merge quando os testes falharem

**Faça à mão**

Rodar depois do merge detecta problemas, mas não impede que eles entrem. Após a primeira execução, configure uma regra para `main` em **Settings → Rules → Rulesets** ou em **Branches**, conforme as opções disponíveis no repositório:

1. Exija pull request para merge.
2. Exija status checks bem-sucedidos.
3. Selecione o check **Playwright Chromium** exibido pela execução real.
4. Defina se a branch precisa estar atualizada com `main` ou se usará merge queue.
5. Confira a aplicação das regras e eventuais permissões de bypass.

A disponibilidade dessas opções depende do plano e da visibilidade do repositório. Faça um PR com uma expectativa propositalmente errada para verificar que a regra bloqueia o merge; corrija a expectativa antes de integrar. Falha no teste não deve ser ignorada com `continue-on-error: true`.

**Resultado esperado:** o PR não pode ser integrado com o check exigido vermelho, dentro das regras que você configurou.

**Prompt opcional**

```text
Me guie para exigir o check Playwright Chromium antes do merge em main. Explique quais opções devo marcar e como verificar o bloqueio com um PR de teste. Não altere permissões nem regras remotas. Diferencie executar um workflow de tornar o resultado obrigatório.
```

Referência: [proteção de branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## 18. Rodar antes de commits locais, se fizer sentido

**Faça à mão**

Para rodar no seu computador antes de cada commit, crie opcionalmente `.githooks/pre-commit`:

```sh
#!/bin/sh
set -eu
yarn test:pw --project=chromium --grep '@smoke'
```

Ative no clone local:

```sh
chmod +x .githooks/pre-commit
git config core.hooksPath .githooks
```

Antes, confira `git config --get core.hooksPath` para não substituir sem perceber outro conjunto de hooks. Rodar navegador e mapa em todo commit pode ser lento; uma alternativa é colocar o smoke em `pre-push` e manter os testes completos no CI. Escolha uma política; não rode a mesma suíte em ambos sem necessidade.

Hooks são locais, podem ser desativados e não substituem checks obrigatórios no servidor. Para desfazer esta configuração, restaure o valor anterior de `core.hooksPath`; se não existia, use `git config --unset core.hooksPath`.

**Resultado esperado:** você entende a diferença entre feedback local rápido e a garantia do check remoto.

**Prompt opcional**

```text
Proponha um hook local para rodar só @smoke do Playwright, conferindo antes se já existe core.hooksPath. Quero comparar pre-commit e pre-push pelo tempo de execução. Não ative os dois e não altere minha configuração Git sem eu escolher a opção.
```

Referência: [hooks do Git](https://git-scm.com/docs/githooks).

## 19. Organizar a evolução da suíte

**Faça à mão**

Implemente um cenário por vez nesta ordem sugerida:

1. Inicialização e modal de criação.
2. Criar projeto, trocar, renomear e confirmar isolamento.
3. Importar área/ponto, verificar alerta e erro, exportar selecionados.
4. Criar ponto e área desenhando pela interface.
5. Editar nome/cor; cancelar; trocar sem alterações e trocar com alterações.
6. Clonar e conferir os nomes numerados; travar e conferir a mensagem.
7. Seleção múltipla, mudança de cor, bloqueio e confirmação de exclusão.
8. Persistência após reload e recuperação de falhas de salvamento.
9. Drawer, temas, contraste e atalhos nos contextos corretos.
10. Busca com resposta controlada, buracos preenchidos e áreas multipartes.

Não faça um único teste depender de todos os anteriores. Extraia helpers ou Page Objects quando surgir repetição concreta; mantenha as expectativas visíveis no teste. Separe os smoke rápidos das regressões mais caras. Um retry verde deve ser investigado como possível instabilidade, não celebrado como correção.

Para repetir um caso durante uma investigação:

```sh
yarn test:pw tests/playwright/importacao.spec.ts --project=chromium --repeat-each=3
```

**Resultado esperado:** cada falha aponta um comportamento e pode ser reproduzida sozinha.

**Prompt opcional**

```text
Revise a suíte que eu já escrevi. Aponte dependências entre casos, estado compartilhado, duplicação real e asserts fracos. Proponha a próxima melhoria por prioridade, sem gerar testes de funcionalidades que eu ainda quero implementar à mão. Não transforme vários fluxos independentes em um teste gigante.
```

## 20. Resolver os problemas mais comuns

| Sintoma | Primeiro diagnóstico |
|---|---|
| Executável do navegador ausente | Rode `yarn playwright install chromium` após instalar/atualizar o pacote |
| Porta 5174 ocupada | Encerre seu servidor manual de codegen/MCP ou escolha uma porta exclusiva em toda a configuração |
| “No tests found” | Confira `testDir`, extensão `.spec.ts`, caminho do comando e projeto selecionado |
| Locator encontra mais de um elemento | Confira nome exato e escopo do diálogo/card; não esconda a ambiguidade com `first()` |
| Título aparece, mas Criar está desabilitado | Investigue inicialização do mapa e leitura dos projetos, não apenas o carregamento do HTML |
| Reload trouxe dados inesperados | Confira contexto, origem/porta e os dois armazenamentos; não reutilize perfil pessoal |
| Trace não foi gerado localmente | `on-first-retry` com zero retries não grava; use `--trace on` |
| Falha só na CI | Compare navegador, viewport, rede externa, WebGL, prontidão e o trace do job |
| Móvel não encontra as abas | Abra o drawer primeiro e confira o projeto/viewport usado |
| Mock não intercepta a chamada | Confira URL, momento de registrar a rota, cache em memória e service worker |

**Prompt opcional**

```text
Estou no passo [número] do guia Playwright. Este foi o comando: [comando]. Este é o erro completo: [erro]. Analise a configuração e o teste relacionados, proponha primeiro uma verificação que confirme a causa e só depois uma correção pequena. Não instale outro runner nem altere o app apenas para fazer o teste passar.
```

## Checklist de conclusão

- [ ] Instalei a dependência e o navegador conscientemente.
- [ ] Escrevi e fiz falhar de propósito meu primeiro teste.
- [ ] Sei executar pelo terminal, UI Mode e Inspector.
- [ ] Sei gerar um trace e revisar uma gravação do codegen.
- [ ] Os testes usam dados fictícios e começam independentes.
- [ ] Sei distinguir teste por importação e teste de desenho real.
- [ ] MCP é opcional e não é uma dependência da execução do CI.
- [ ] O workflow roda no GitHub e publica evidências.
- [ ] Verifiquei a regra que impede merge com check vermelho.
- [ ] Mantive pequenas as etapas delegadas à IA e revisei os resultados.

Ao concluir, use [passo-a-passo-selenium.md](passo-a-passo-selenium.md) para reproduzir os primeiros cenários com outra ferramenta.
