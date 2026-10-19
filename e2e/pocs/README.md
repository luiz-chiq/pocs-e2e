# POCs de automação E2E

Veja a [validação inicial realizada no deploy](old/RESULTADOS-WEB.md) e o
[relatório atual por ferramenta e plataforma](RELATORIO.md).
Há também uma [versão direta](RELATORIO-DIRETO.md), com sumário, matriz,
tempos por plataforma, aumento percentual em relação ao menor tempo de cada
plataforma, falhas, portabilidade e limites. O percentual usa o tempo da suíte:
`(tempo / menor tempo elegível - 1) × 100`. Sessões que não executaram todos os
casos previstos não entram na referência; casos com falhas continuam incluídos
e podem encurtar/alongar a medição. Não é um ranking de desempenho.

Quando há revalidação parcial, os relatórios atuais usam a última suíte completa
de cada combinação em todas as tabelas e nos testes individuais. A origem fica
indicada; resultados substituídos são apresentados somente nos arquivos históricos.
Percentuais exigem as três ferramentas da plataforma na mesma rodada.

Depois dessas rodadas, o fundo foi trocado para Esri World Imagery. A
[verificação posterior do satélite](MAPA-SATELITE.md) usa Chrome e Electron,
com imagens reais e duas janelas. Ela não representa uma nova execução completa
do catálogo comparativo nem uma atualização do deploy.

A funcionalidade de importar/exportar arquivos pelo processo principal do
Electron tem [relatório adicional](ELECTRON-ARQUIVOS.md), com cinco cenários por
ferramenta, tempos e limites. Para executar no app empacotado:

```bash
npm run electron:build:poc
npm run test:poc:electron:files
npm run test:electron:files
```

O segundo comando usa Playwright, Selenium e WebdriverIO sequencialmente. A
seleção do caminho no diálogo é simulada; IPC, validação e operações de disco são
reais. A build normal usa os diálogos nativos. Essa suíte adicional não está
incluída no comando original `test:poc:electron`, que executa o catálogo C/D.

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

O comando conjunto cria `test-results/pocs/<ambiente>-<data-hora>/`, com:

- `summary.json`: resultados e códigos de saída das três ferramentas.
- `timing.json`: início/fim e duração da rodada, de cada plataforma e das etapas
  build, preparação externa, suíte e limpeza.
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
As três ferramentas possuem adaptadores para os quatro ambientes. Consulte
o [relatório](RELATORIO.md) para distinguir implementação de execução comprovada.

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

Electron usa um diretório de dados de teste. O comando conjunto gera o aplicativo
empacotado para o sistema local e testa esse binário. O comando individual usa o
runtime local por padrão; informe `ELECTRON_APP_PATH` para testar um binário específico.
Selenium e WebdriverIO usam o ChromeDriver oficial correspondente à versão
Electron, ou `CHROMEDRIVER_PATH` quando informado. Na suíte POC, WDIO conecta
diretamente ao binário Electron por WebDriver clássico, com perfil explícito e
versão obtida do driver; não usa os hooks do serviço Electron. Isso mantém
reinício e troca de janelas sob controle da suíte. A principal e o mapa separado
usam os tamanhos definidos pelo app, pois este Electron não implementa o
redimensionamento `Browser.getWindowForTarget`. O `browserName: 'chrome'` é a
capability do protocolo; o executável aberto continua sendo o Electron.

O orquestrador `node scripts/run-pocs.mjs <ambiente>` executa as três
ferramentas; `all` solicita a matriz inteira e `POC_FRAMEWORKS` permite escolher
ferramentas separadas por vírgula. O adaptador Android do Playwright usa a API
experimental Android; Selenium e WebdriverIO usam Appium/UiAutomator2.

Os atalhos npm são `test:poc:web`, `test:poc:pwa`, `test:poc:electron`,
`test:poc:android` e `test:poc:all`.

Para preservar todas as plataformas em um único diretório e atualizar o relatório:

```bash
POC_RESULTS_DIR=test-results/pocs/minha-execucao npm run test:poc:all
```

O relatório Markdown é atualizado após cada ferramenta. Para reconstruí-lo:

```bash
node scripts/report-pocs.mjs test-results/pocs/minha-execucao
```

Para regenerar os relatórios da rodada final de 19/10/2026:

```bash
node scripts/report-pocs.mjs test-results/pocs/final-2026-10-19
```

A [versão completa anterior](old/RELATORIO-2026-10-19-ANTES-RODADA-FINAL.md) e a
[versão direta anterior](old/RELATORIO-DIRETO-2026-10-19-ANTES-RODADA-FINAL.md) foram
preservadas. A rodada final não importa seus resultados.

A correção posterior de WDIO/Electron é aplicada ao resumo, à tabela de tempos
e aos 13 testes individuais dos dois relatórios atuais. Os dados estão em
`test-results/pocs/wdio-electron-fix-2026-10-19/`; o comando de regeneração acima
inclui essa revalidação pelo manifesto `followup.json`. A rodada de 12
combinações permanece separada, com seus tempos originais. Os relatórios de antes
dessa correção também foram preservados em
[completo](old/RELATORIO-2026-10-19-ANTES-CORRECAO-WDIO-ELECTRON.md) e
[direto](old/RELATORIO-DIRETO-2026-10-19-ANTES-CORRECAO-WDIO-ELECTRON.md).

Quando existe `followup.json` no diretório informado, o gerador lê as raízes de
resultados/timing listadas em `suites`, consolida a situação mais recente em todas as seções e mantém
a rodada original em arquivos históricos separados. O manifesto desta etapa também está em
`test-results/pocs/fixes-2026-10-19/followup.json`; as tentativas de diagnóstico
referenciadas ficam no relatório completo, sem substituir os testes da última
suíte completa pelo melhor resultado anterior.

O relatório começa com uma tabela por ferramenta e plataforma, distinguindo
aprovações, falhas, preparação bloqueada e execução parcial. Cada teste tem
sua duração em segundos; os totais são a soma dos tempos individuais e não
incluem build/boot externos. A coluna de tempo da suíte/comando acrescenta
inicialização, sessões e encerramento dentro do comando da ferramenta. Um tempo
inconsistente é descartado; quando possível, o total do runner no log é usado
e identificado. Preparação por teste e sessão compartilhada têm custos diferentes,
portanto esses tempos não são um benchmark entre ferramentas.

O gerador incorpora [LIMITACOES.md](LIMITACOES.md) ao relatório, com a análise
das divergências e as limitações documentadas/observadas em Electron e Android.
Atualize esse arquivo ao mudar os adaptadores ou investigar novas causas.
Também incorpora [PORTABILIDADE.md](PORTABILIDADE.md), que explica quais camadas
foram compartilhadas e quais implementações foram escritas por ferramenta.
O mesmo comando produz `RELATORIO.md` e `RELATORIO-DIRETO.md`, ambos com sumário.
O total por plataforma inclui build/preparação/limpeza externos e geração dos
relatórios. Preparação Android agrupa boot, instalação inicial do APK e Appium.

O preparador Android pode iniciar um AVD, instalar o APK e iniciar Appium.
Use somente dispositivo/perfil de testes: os testes limpam os dados do pacote
`com.example.tasks.poc`. Configure SDK, JDK 21 e UiAutomator2 antes; o APK
gerado é de debug. Consulte o relatório para o resultado efetivamente obtido.

D01–D03 abrangem navegador, PWA instalado desktop e Electron; Android não
oferece separar mapa. São quatro execuções de duas janelas por ferramenta,
pois D02 tem duas variações. O planejamento resulta em 15 testes web,
13 PWA, 13 Electron e 9 Android por ferramenta. As suítes anteriores de
regressão continuam disponíveis separadamente.

## Revalidação web posterior

A etapa de 19/10/2026 em `test-results/pocs/web-fix-2026-10-19/` reexecutou
web nas três ferramentas e WDIO/PWA. Os dois relatórios mostram a matriz
atualizada e os novos tempos, incluindo o preparo explícito do Delete e a
validação de D01 no PWA. O manifesto da rodada final original referencia essas
novas suítes e preserva a revalidação anterior WDIO/Electron. O comando de
regeneração continua sendo:

```bash
node scripts/report-pocs.mjs test-results/pocs/final-2026-10-19
```

Os resultados de antes desta etapa estão preservados em
[completo anterior](old/RELATORIO-2026-10-19-ANTES-REVALIDACAO-WEB.md) e
[direto anterior](old/RELATORIO-DIRETO-2026-10-19-ANTES-REVALIDACAO-WEB.md).

## Leitura dos relatórios atuais

As tabelas principais e os 150 testes individuais mostram somente a suíte vigente
de cada combinação. A tabela de tempo de execução tem uma linha por plataforma e
colunas Playwright, Selenium e WebdriverIO; cada célula mede o comando da suíte,
sem build ou preparação externa. Os dados brutos usados estão vinculados no
relatório. Resultados substituídos ficam no
[histórico completo](old/RELATORIO-HISTORICO-2026-10-19.md) e no
[histórico direto](old/RELATORIO-DIRETO-HISTORICO-2026-10-19.md).

## Organização e auditoria dos relatórios

Na pasta principal ficam somente os relatórios vigentes: `RELATORIO.md`,
`RELATORIO-DIRETO.md` e `STATUS.md`. Os 11 arquivos anteriores ficam em
[old/](old/README.md), identificados como históricos e com links para a situação
atual. Os números antigos foram preservados para descrever suas próprias rodadas.

As três versões atuais são geradas a partir do mesmo consolidado. Para regenerar
e auditar os documentos, sem executar testes E2E:

```bash
npm run report:poc
```

Para somente conferir os arquivos existentes contra os resultados brutos:

```bash
npm run report:poc:check
```

A checagem valida as 12 combinações, o catálogo e os 150 resultados individuais,
contagens, durações, percentuais, origens dos JSONs, links locais e sumários.
Também confirma que os arquivos antigos estão em `old/` e que suas linhas
individuais numéricas têm correspondência nos registros históricos. Se alguma
verificação falhar, o comando retorna erro; a geração atual também executa essa
auditoria automaticamente.
