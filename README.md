# Polígonos no mapa — POCs E2E

Editor de polígonos usando o ArcGIS Maps SDK for JavaScript, com versões web/PWA, Electron e Android via Capacitor. O projeto compara automação E2E com Playwright e Selenium. A versão com as três ferramentas está preservada na branch `codex/poc-tres-ferramentas` (commit `98f49f5`).

A interface usa verde profundo, superfícies claras e âmbar no card selecionado.
No mapa, a seleção recebe brilho branco e a edição usa contorno branco, preservando
a cor do preenchimento. Ao salvar ou cancelar, o contorno da cor original é restaurado.
Os cards mostram a quantidade de vértices e o estado de seleção ou edição.
No computador, a lista tem rolagem própria e mantém as ações no rodapé; no celular,
o mapa aparece acima da coleção. As duas janelas compartilham o mesmo visual.
O cabeçalho contém apenas **Polígonos**, o contador e o botão de instalação.
Durante a criação ou edição, o menu lateral mostra apenas o polígono atual e
seus controles em um formulário que ocupa o painel, sem aparência de card.
As outras áreas e ações gerais voltam ao concluir ou cancelar. A barra de rolagem
do conteúdo fica sempre visível, com cabeçalho e ações fixos. A contagem de
vértices aparece em um badge redondo, como uma notificação, ao lado do nome.

## Execução

```bash
npm ci
npm run dev
```

Abra a URL indicada pelo Vite, normalmente `http://localhost:5173`. Navegadores consideram `localhost` um contexto seguro para desenvolvimento, portanto o service worker funciona sem certificado local.

Use Node.js 22.18 ou superior. O fundo de satélite atual não exige configurar
API key ou arquivo `.env.local`. Variáveis `VITE_*` são públicas na build;
não coloque segredos nelas.

## PWA

```bash
npm run build
npm run preview
```

Abra a URL do preview e toque no ícone de **Instalar aplicativo**, à direita do título no cabeçalho da lista de polígonos.
Para simular um bug de interação, esse botão responde **somente a toques touch**.
Cliques de mouse, teclado e caneta são ignorados, mesmo em dispositivos com tela touch.
Na automação, use um toque real/emulado (como `tap()` no Playwright com `hasTouch: true`),
em vez de `click()`.
No Chrome/Edge, o botão abre a instalação quando o navegador a disponibiliza.
No iPhone/iPad, ele explica como instalar pelo Safari: **Compartilhar → Adicionar à Tela de Início**.
O botão fica oculto quando o aplicativo está aberto em modo instalado ou nas versões nativas Electron/Android.

O manifest, os ícones e o service worker são gerados em `npm run build`.
Para validar a instalação local, use `npm run preview` em `localhost`; `npm run dev` não ativa o service worker.
Em produção, publique o conteúdo de `dist/` atrás de HTTPS. Os caminhos do PWA também permitem publicação em um subdiretório.
O service worker mantém os arquivos da aplicação em cache; o mapa-base e recursos externos do ArcGIS ainda dependem de internet.

## Duas telas

Os controles de navegação ficam no canto superior esquerdo. Arraste a agulha
da bússola para girar o mapa; clique nela para retornar o norte para cima.
Com a bússola em foco, use **← / →** para girar e **Enter** ou **Home** para
retornar ao norte. O gesto de arrastar o mapa com o botão direito continua disponível.

No rodapé da barra lateral, **Adicionar polígono** fica à direita de **Apagar todos**.
Os dois botões têm o mesmo tamanho. Clicar em um card abre seus vértices e
destaca o polígono com um brilho branco no mapa; a seta à esquerda do nome permite recolher os detalhes.
Selecionar um card não inicia a edição: o botão de criar passa a **Editar polígono selecionado**.
Toque ou clique diretamente no polígono no mapa para entrar na edição imediatamente.
Se outro polígono estiver em edição, escolha **Salvar e trocar**, **Cancelar edição e trocar**
ou **Continuar editando**. Nomes e desenhos inválidos impedem salvar a edição.
Também é possível usar o botão Editar. Clique no mapa vazio, recolha o card ou use **Esc**
para limpar a seleção e voltar a criar polígonos.
Com um polígono selecionado, **Enter** inicia a edição; durante a edição,
**Enter** conclui. O atalho mantém a ação normal dos botões de navegação e diálogos.
O nome aparece no centro de cada área, acompanha os movimentos do mapa e a edição
do desenho, e fica sincronizado entre as janelas. Em áreas côncavas, o nome é
posicionado dentro do polígono. Os rótulos não bloqueiam os cliques no mapa.
Durante a edição, o nome do card vira um campo de texto. O nome é obrigatório,
aceita de 1 a 30 caracteres e permite apenas letras (incluindo acentos), números
e espaços. Espaços nas extremidades e espaços repetidos são removidos ao salvar.
O campo não mostra rótulo nem instruções fixas. Um tooltip avisa sobre nomes
inválidos ou ao atingir 24 dos 30 caracteres; desaparece ao corrigir o nome
ou ficar abaixo desse limite.
Durante a criação e edição, escolha a cor na paleta ou no seletor de cor livre.
A prévia aparece no mapa. **Concluir edição** salva nome, desenho e cor;
**Cancelar** restaura os valores anteriores. A cor persiste após recarregar,
fica sincronizada nas duas telas e acompanha os arquivos importados/exportados.
Durante a criação ou edição, **Travar ao salvar** impede novas edições do desenho
e do nome após a confirmação. O ícone de cadeado indica o bloqueio e a borda
do card indica a seleção, sem tags adicionais. Polígonos travados só podem ser
selecionados pela lista lateral; cliques e toques neles no mapa são ignorados.
Enter também não inicia a edição enquanto o polígono estiver travado.
Destrave pelo cadeado no menu lateral para editar novamente. Cancelar descarta
também a mudança de bloqueio. O bloqueio persiste após recarregar e fica
sincronizado nas duas janelas; importação e exportação preservam esse estado.
Os nomes ficam salvos após recarregar. Na janela do mapa separado, o mesmo campo
aparece no menu inferior e fica sincronizado com o card da janela principal.
Durante a criação ou edição, essa mesma linha mostra **Concluir** e **Cancelar**.
Se usar **Delete** para apagar um polígono durante a edição, **Concluir edição**
pergunta se deseja excluir o polígono ou cancelar a edição e restaurar o desenho original.
Essa confirmação fica disponível nas duas janelas quando o mapa está separado.
Desenhos com menos de três pontos diferentes ou sem área são bloqueados com um alerta;
a confirmação por teclado segue a mesma validação.
Os controles continuam sincronizados quando o mapa está em uma janela separada.

Clique em **Separar mapa**, no rodapé da barra lateral, para abrir o mapa em outra janela e arraste essa janela
para o segundo monitor. A janela principal mantém a lista de polígonos e os
controles para criar, concluir, cancelar e excluir. Selecionar um polígono na
lista destaca o desenho e habilita o botão de edição; alterações de coordenadas aparecem na lista
assim que o gesto de edição termina.

**Focar mapa** e **Reunir telas** ficam no rodapé da barra lateral.
Na janela do mapa separado, **Reunir telas** e as ações dos polígonos ficam
em um pequeno menu flutuante no canto inferior esquerdo, acima da atribuição do mapa.
Os controles de zoom e bússola ficam na vertical. As mensagens ficam no topo,
com espaço reservado para não cobrir os controles, também na janela principal quando o mapa está separado.
**Reunir telas**, disponível nas duas janelas, devolve o mapa à aplicação.
Conclua ou cancele a ação atual antes de separar ou reunir. Se fechar a janela
do mapa manualmente, a aplicação restaura a última geometria confirmada;
alterações ainda não confirmadas são canceladas. Recarregar a janela principal
fecha a janela auxiliar. Se o navegador bloquear a abertura, permita pop-ups
para o site e tente novamente. A opção não é exibida no Android nativo.

A comunicação usa `window.postMessage`, com validação da origem, da janela
remetente e de uma sessão exclusiva para cada par. Enquanto separado, o mapa
executa os comandos e salva os dados no IndexedDB; a janela principal recebe
cópias do estado para atualizar a lista. Ao reunir, a janela principal reassume
a edição e a persistência. Não é necessário servidor de sincronização para
duas janelas no mesmo navegador.

## Importação e exportação no Electron

No app Electron, os botões **Importar** e **Exportar** ficam no rodapé do menu
lateral. A importação acrescenta áreas sem apagar as existentes; a exportação
salva todas as áreas confirmadas em JSON. Conclua ou cancele a edição antes de
usar os botões. Os arquivos usam o formato próprio `poligonos`, versão `1`, com
nome, anéis de coordenadas, referência espacial ArcGIS e cor opcional `#RRGGBB`; não são GeoJSON.

Os diálogos nativos, a validação e a leitura/gravação acontecem no processo
principal do Electron. O preload expõe apenas essas duas operações por IPC,
mantendo o renderer sem acesso ao Node. Arquivos inválidos são rejeitados por
inteiro. Limites por arquivo: 10 MB, 1.000 polígonos e 100.000 pontos. As áreas
importadas também são sincronizadas quando o mapa está separado.

Testes e tempos nas duas ferramentas: [Electron — arquivos](e2e/pocs/ELECTRON-ARQUIVOS.md).

## ArcGIS

O editor usa o ArcGIS Maps SDK. O fundo é o **Esri World Imagery**, um mosaico
global de imagens de satélite e fotografias aéreas, carregado por `TileLayer`
do serviço público HTTPS. Essa camada responde sem API key e funciona com o
mesmo código na web, PWA, Electron e Capacitor. A resolução e a data das imagens
variam conforme a região; não se trata de imagem em tempo real.

O SDK apresenta os créditos dos fornecedores na atribuição do mapa. O acesso
público não elimina as condições de licença: consulte o
[item oficial e seus termos](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9).
Usamos a camada online, sem exportação ou pré-download de imagens para uso
offline. A exportação de polígonos contém nomes, coordenadas, cor e o bloqueio opcional `locked`.

A [verificação do satélite](e2e/pocs/MAPA-SATELITE.md) conferiu imagens reais,
atribuição, desenho e edição em duas janelas no Chrome e no Electron. Para
repetir, execute `npm run electron:build:poc` e `npm run check:satellite`.


## Testes E2E — Playwright e Selenium

A `main` contém somente Playwright e Selenium. A POC completa das três ferramentas,
incluindo o WebdriverIO e o trabalho Android em andamento, está preservada em
`codex/poc-tres-ferramentas`, commit `98f49f5`.

```bash
npm ci
npx playwright install chromium
npm run test:e2e
```

`test:e2e` executa a suíte Playwright de desenvolvimento e inicia o Vite quando
necessário. Para depurar, use `npm run test:e2e:watch` ou
`npm run test:e2e:visual`.

As POCs comparativas usam uma build E2E, gestos reais e uma API auxiliar somente
de leitura. O plano está em [E2E-POCS.md](E2E-POCS.md) e a execução em
[e2e/pocs/README.md](e2e/pocs/README.md).

| Plataforma | Comando — Playwright e Selenium em sequência |
| --- | --- |
| Web | `npm run test:poc:web` |
| PWA instalado | `npm run test:poc:pwa` |
| Electron empacotado | `npm run test:poc:electron` |
| APK Android | `npm run test:poc:android` |
| Todas | `npm run test:poc:all` |

Para selecionar uma ferramenta, defina `POC_FRAMEWORKS=playwright` ou
`POC_FRAMEWORKS=selenium`. O padrão é `playwright,selenium`. O cenário C10 mouse
continua falhando de propósito para detectar o defeito de instalação; touch deve passar.

Resultados, tempos por ferramenta/plataforma e limites:
[relatório completo](e2e/pocs/RELATORIO.md),
[versão direta](e2e/pocs/RELATORIO-DIRETO.md),
[comparativo para decisão](e2e/pocs/COMPARATIVO-PLAYWRIGHT-SELENIUM.md).

## Electron

```bash
npm run build
npm run electron:dev
```

Para empacotar no sistema local e testar a feature de arquivos:

```bash
npm run electron:build:poc
npm run test:poc:electron:files
```

O segundo comando testa Playwright direto no Electron e tenta o bootstrap nativo
Selenium/Appium Mac2 no macOS. Mac2 exige Xcode completo. Cenários indisponíveis
ficam registrados e o comando retorna código 2; não há fallback para ChromeDriver.
A modalidade explícita com ChromeDriver continua disponível em
`npm run test:poc:electron:files:chromedriver`.

## Android

Instale Android SDK, JDK 21 e configure um emulador de testes ou `ANDROID_SERIAL`.
O orquestrador prepara o APK e inicia o Appium quando necessário.

```bash
npm run test:e2e:android:build
npm run test:poc:android
```

O APK também oferece importar/exportar JSON por código nativo Capacitor.
Na exportação, escolha uma pasta e confirme o acesso solicitado pelo Android;
a autorização é limitada à pasta escolhida, sem permissão ampla de armazenamento.

O protótipo `npm run test:poc:android:hybrid` combina Playwright na WebView e
Appium/UiAutomator2 com cliente Selenium JS nas telas nativas. O cliente tem
verificações de contrato em `npm run test:appium:native`. **A migração do cliente
não significa validação dos fluxos completos no APK**; veja as pendências no relatório.

Builds, perfis, resultados brutos e dependências são ignorados pelo Git e não
fazem parte do snapshot da branch. Use `npm ci` ao trocar de branch para alinhar
as dependências à versão escolhida.
