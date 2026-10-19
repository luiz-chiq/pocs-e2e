# Polígonos no mapa — POCs E2E

Editor de polígonos usando o ArcGIS Maps SDK for JavaScript, com versões web/PWA, Electron e Android via Capacitor. O projeto compara automação E2E com WebdriverIO, Selenium e Playwright.

A interface usa verde profundo, superfícies claras e âmbar para a área selecionada.
Os cards mostram a quantidade de vértices e o estado de seleção ou edição.
No computador, a lista tem rolagem própria e mantém as ações no rodapé; no celular,
o mapa aparece acima da coleção. As duas janelas compartilham o mesmo visual.

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
destaca o polígono em amarelo no mapa; a seta à esquerda do nome permite recolher os detalhes.
Selecionar não inicia a edição: o botão de criar passa a **Editar polígono selecionado**.
Clique nesse botão para editar. Clique no mapa vazio, recolha o card ou use **Esc**
para limpar a seleção e voltar a criar polígonos.
Com um polígono selecionado, **Enter** inicia a edição; durante a edição,
**Enter** conclui. O atalho mantém a ação normal dos botões de navegação e diálogos.
O nome aparece no centro de cada área, acompanha os movimentos do mapa e a edição
do desenho, e fica sincronizado entre as janelas. Em áreas côncavas, o nome é
posicionado dentro do polígono. Os rótulos não bloqueiam os cliques no mapa.
Durante a edição, o nome do card vira um campo de texto. O nome é obrigatório,
aceita de 1 a 30 caracteres e permite apenas letras (incluindo acentos), números
e espaços. Espaços nas extremidades e espaços repetidos são removidos ao salvar.
**Concluir edição** salva nome e desenho; **Cancelar** restaura ambos.
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
nome, anéis de coordenadas e referência espacial ArcGIS; não são GeoJSON.

Os diálogos nativos, a validação e a leitura/gravação acontecem no processo
principal do Electron. O preload expõe apenas essas duas operações por IPC,
mantendo o renderer sem acesso ao Node. Arquivos inválidos são rejeitados por
inteiro. Limites por arquivo: 10 MB, 1.000 polígonos e 100.000 pontos. As áreas
importadas também são sincronizadas quando o mapa está separado.

Testes e tempos nas três ferramentas: [Electron — arquivos](e2e/pocs/ELECTRON-ARQUIVOS.md).

## Teste E2E

As três POCs (WebdriverIO, Selenium e Playwright) estão documentadas em
[`e2e/pocs/README.md`](e2e/pocs/README.md). Execute com
`npm run test:poc:web`: C01–C10, com mouse e touch separados em C10,
e quatro verificações de duas janelas (D01, D02 em duas variações e D03).
O teste de mouse do botão de instalação exige que o
controle funcione e deve falhar enquanto o defeito intencional estiver presente.

A expansão para os quatro ambientes está em desenvolvimento; confira
[`e2e/pocs/STATUS.md`](e2e/pocs/STATUS.md) antes de interpretar os resultados.
O plano completo está em [`E2E-POCS.md`](E2E-POCS.md).

Para gerar uma build com a API auxiliar de leitura usada pelos testes:

```bash
npm run build:e2e
npm run preview
```

Esse comando habilita `VITE_E2E=true` sem exigir arquivos de ambiente locais.
A API fornece coordenadas e espera pela persistência; os testes desenham e
editam com gestos reais. `npm run build` gera a versão normal de produção.

Em um terminal, execute `npm run preview`. Em outro:

```bash
npm run test:e2e
```

Para acompanhar a execução no Chrome, em vez do modo headless:

```bash
HEADLESS=false npm run test:e2e
```

## Comparação: WebdriverIO e Playwright

As duas stacks executam os mesmos seis cenários de negócio — criação, edição,
cancelamento, persistência e exclusão — contra a mesma PWA e
os mesmos atributos `data-testid`.

| Stack | Arquivo | Comando |
| --- | --- | --- |
| WebdriverIO | `e2e/cancel-edit.e2e.ts` | `npm run test:e2e` |
| Playwright | `e2e/playwright/cancel-edit.spec.ts` | `npm run test:e2e:playwright` |

O Playwright inicia o Vite automaticamente; a suíte WebdriverIO continua
esperando que `npm run preview` ou `npm run dev` esteja ativo em outro terminal.
Para acompanhar a execução do Playwright no navegador, use:

```bash
npm run test:e2e:playwright:visual
```

As suítes de regressão anteriores continuam disponíveis nesses comandos.
Os atributos `data-testid` são contratos de automação próprios; as POCs
comparativas ficam separadas em `e2e/pocs/`.

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
offline. A exportação de polígonos contém apenas nomes e coordenadas.

A [verificação do satélite](e2e/pocs/MAPA-SATELITE.md) conferiu imagens reais,
atribuição, desenho e edição em duas janelas no Chrome e no Electron. Para
repetir, execute `npm run electron:build:poc` e `npm run check:satellite`.

## A mesma suíte nos três alvos

Os cenários de negócio ficam em um único arquivo: `e2e/cancel-edit.e2e.ts`.
Ele valida criar, mover, editar vértices, inserir vértice, cancelar, persistir,
excluir polígonos. As configurações abaixo só definem em qual
embalagem essa mesma suíte será executada:

| Alvo | Comando |
| --- | --- |
| Site/PWA (Chrome) | `npm run test:e2e` |
| Electron (macOS ou Windows) | `npm run test:e2e:electron` |
| Android (Capacitor WebView) | `npm run test:e2e:android` |

## Electron

Electron para Windows:

```bash
npm run electron:build
```

Teste Electron local (macOS ou Windows):

```bash
npm run test:e2e:electron
```

No macOS, esse comando usa o Electron local. O aplicativo serve `dist/`
na origem estável `poligonos://app/`, preservando IndexedDB entre reinícios.
O instalador Windows e sua suíte ainda precisam de validação própria.

## Android

Para o teste E2E Android, instale Android Studio/SDK, crie ou inicie um
emulador (ou conecte um dispositivo com depuração USB), e instale Appium e o
driver UiAutomator2 uma vez na máquina:

```bash
npm install --global appium
appium driver install uiautomator2
```

Gere e instale a versão atual do app:

```bash
npm run test:e2e:android:build
```

Em um terminal, inicie o servidor Appium. Em outro, execute a mesma suíte:

```bash
appium
npm run test:e2e:android
```

Caso o nome do emulador não seja `Android Emulator`, informe-o com
`ANDROID_DEVICE_NAME="nome exibido pelo adb" npm run test:e2e:android`.
O diretório `android/` é a embalagem nativa; código de negócio, interface e
casos de E2E continuam compartilhados.

## Publicação e arquivos locais

O site é estático e não exige API. Gere `npm run build` (ou `build:e2e` para
o deploy de testes) e publique o conteúdo de `dist/` em HTTPS. O deploy de
testes usa `https://poc-e2e.chiquetano.com.br/`; no servidor, o diretório é
`/opt/projects/poligon/dist`. O Nginx deve servir os arquivos e usar
`try_files $uri $uri/ /index.html` na rota principal.

O Git ignora dependências, builds, APKs, arquivos compactados, relatórios,
perfis de navegador, `.env*` locais e material de chave privada. A exceção
`.env.example` contém somente configuração de exemplo. Ícones, lockfile e o
Gradle Wrapper são fontes necessárias e permanecem versionados.
