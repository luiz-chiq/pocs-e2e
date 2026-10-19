# POCs de automação E2E

Veja a [validação inicial realizada no deploy](RESULTADOS-WEB.md) e o
[estado atual da expansão para quatro ambientes](STATUS.md).

## Suítes web implementadas

Três implementações independentes: WebdriverIO, Selenium e Playwright.
As suítes usam o Chrome instalado na máquina e acessam, por padrão,
`https://poc-e2e.chiquetano.com.br/`.

| Caso | Critério |
| --- | --- |
| C01 | Criar pelo mapa, salvar, selecionar e conferir três vértices, contagem e rótulo. |
| C02 | Bloquear desenhos com zero, um ou dois pontos e pontos colineares; conferir alerta e ausência de dados salvos. |
| C03 | Selecionar pelo card e mapa sem edição automática; editar por Enter e pelo botão. |
| C04 | Mover a área, arrastar um vértice, inserir outro pela aresta, salvar e conferir quatro vértices e coordenadas. |
| C05 | Rejeitar nomes vazios/símbolos, normalizar espaços, aceitar acentos e limitar a trinta caracteres. |
| C06 | Alterar nome e geometria, cancelar e conferir a restauração de ambos. |
| C07 | Salvar nome e geometria alterados, fechar o processo do navegador e reabrir usando o mesmo perfil; conferir os dados persistidos. |
| C08 | Cancelar e confirmar exclusão durante edição com Delete, individual e de todos; conferir cards e rótulos removidos. |
| C09 | Conferir zoom, rotação pelo arraste da bússola e retorno ao norte por clique/teclado. |
| C10 mouse | Clicar no botão de instalação e exigir a abertura das instruções. |
| C10 touch | Tocar no mesmo botão e exigir a abertura das mesmas instruções. |

São dez cenários do plano, com duas entradas para C10, mais D01, D02 em duas
variações e D03: quinze testes por ferramenta na suíte web atual. O relatório
inicial de 33 execuções foi produzido antes da inclusão das quatro verificações
de duas janelas por ferramenta.

O defeito intencional continua no app: mouse é ignorado e touch funciona.
Por isso, C10 mouse deve falhar hoje nas três ferramentas. Não usamos skip,
expectedFailure, retries nem inversão da expectativa para deixar o resultado
verde. Uma falha mantém o código de saída diferente de zero; confira o caso
e sua evidência antes de atribuí-la ao defeito conhecido.

## Executar

Pré-requisitos: Node.js 22.18 ou superior, Chrome instalado, dependências do
projeto (`npm ci`) e acesso à internet para o deploy e recursos do mapa.
O deploy precisa ter sido gerado com `VITE_E2E=true` para disponibilizar a API
de leitura de coordenadas; a build E2E atual tem essa configuração.

```bash
npm run test:poc:web
```

O comando executa as três ferramentas sequencialmente, mesmo se uma falhar.
Não inicia Vite nem requer reconstruir ou republicar o app. Para outro endereço:

```bash
BASE_URL=https://outro-endereco.exemplo/ npm run test:poc:web
```

Execução individual:

```bash
npm run test:poc:playwright
npm run test:poc:webdriverio
npm run test:poc:selenium
```

Para acompanhar as janelas no macOS/Linux, prefixe o comando com
`HEADLESS=false`. No PowerShell, configure `$env:HEADLESS="false"` antes.
Os testes usam perfis/contextos de automação, sem abrir o perfil pessoal.

## Evidências

O comando conjunto cria `test-results/pocs/<data-hora>/`, com:

- `summary.json`: resultados e códigos de saída das três ferramentas.
- `<ferramenta>.log`: saída completa de cada execução.
- `<ferramenta>/results.json`: resultado individual, duração e erro.
- Screenshots nas falhas; Playwright também mantém trace das falhas.
- Eventos do botão em C10, com `pointerType` e `isTrusted`.

O comando conjunto organiza cada ambiente em uma subpasta (`web/`, por exemplo).
Os comandos individuais usam `test-results/pocs/<ambiente>/<ferramenta>/` e substituem
seu relatório anterior. Defina `POC_RESULTS_DIR` para preservar uma execução
individual em um diretório separado.

As durações são diagnósticas, não um benchmark: Selenium inicia uma sessão
por teste, Playwright isola contextos e WebdriverIO limpa os dados pela
interface em uma sessão exclusiva. Esses custos devem ser normalizados antes
de comparar desempenho.

## Controle do cenário de instalação

Somente C10 usa o parâmetro `?pocInstall=1`. Antes de carregar o código do app,
a automação impede que uma oferta nativa `beforeinstallprompt` chegue à
aplicação. Assim, as duas entradas percorrem o mesmo caminho determinístico:
abrir o diálogo de instruções quando não existe oferta nativa disponível.

Isso não simula a instalação do PWA e não modifica os handlers do botão.
O clique/toque vem do navegador: Playwright usa `click`/`tap`, WebdriverIO e
Selenium usam clique e ações W3C de ponteiro touch. O registro exige um evento
confiável (`isTrusted: true`) e o tipo de ponteiro correspondente.

Os gestos de desenho e edição também são reais. A API `polygonTestApi` só
informa coordenadas; os testes não injetam polígonos nem alteram sua geometria
por JavaScript.

## Quatro ambientes

`POC_TARGET` seleciona `web` (padrão), `pwa`, `electron` ou `android`.
Os adaptadores nativos estão em desenvolvimento. Não considere a presença de
uma configuração como comprovação de execução: consulte [STATUS.md](STATUS.md).

Exemplos de execução individual no macOS/Linux:

```bash
POC_TARGET=pwa npm run test:poc:playwright
npm run build:e2e
POC_TARGET=electron npm run test:poc:playwright
```

No PowerShell, configure `$env:POC_TARGET="pwa"` antes de executar o comando.
PWA usa Chrome com janela visível, instalação real via CDP e perfil isolado;
confere `display-mode: standalone`, sem simular esse valor. A instalação de
teste é removida ao encerrar. Essa infraestrutura exige Chrome com o domínio
CDP `PWA` disponível; a validação parcial usou Chrome 155 no macOS.

Electron usa o aplicativo local e um diretório de dados de teste. É possível
informar `ELECTRON_APP_PATH` para um binário empacotado, ainda não validado.
Selenium baixa o ChromeDriver oficial correspondente à versão Electron, ou
usa `CHROMEDRIVER_PATH` quando informado.

O orquestrador `node scripts/run-pocs.mjs <ambiente>` executa as três
ferramentas; `all` solicita a matriz inteira e `POC_FRAMEWORKS` permite escolher
ferramentas separadas por vírgula. PWA e Electron ainda precisam da execução
completa. Android está incompleto: os adaptadores WDIO/Selenium faltam e o
adaptador Playwright é experimental. Não use `all` como validação concluída.

Os atalhos npm são `test:poc:web`, `test:poc:pwa`, `test:poc:electron`,
`test:poc:android` e `test:poc:all`; os últimos quatro são parte dessa expansão
ainda em desenvolvimento.

O preparador Android pode iniciar um AVD, instalar o APK e iniciar Appium.
Use somente dispositivo/perfil de testes: os testes limpam os dados do pacote
`com.example.tasks.poc`. Configure SDK, JDK 21 e UiAutomator2 antes; o APK
gerado é de debug. Essa etapa ainda não foi validada nesta matriz.

D01–D03 abrangem navegador, PWA instalado desktop e Electron; Android não
oferece separar mapa. São quatro execuções de duas janelas por ferramenta,
pois D02 tem duas variações. O planejamento resulta em 15 testes web,
13 PWA, 13 Electron e 9 Android por ferramenta. As suítes anteriores de
regressão continuam disponíveis separadamente.
