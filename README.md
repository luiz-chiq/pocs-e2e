# Mapa

Aplicação em React e TypeScript para desenhar e organizar áreas sobre mapas
de satélite, disponível na web, como PWA, no Electron e no Android com Capacitor.

## Executar

Use Node.js 22.18 ou superior e Yarn.

```bash
yarn install --frozen-lockfile
yarn dev
```

O Vite informa a URL local. O mapa usa Esri World Imagery e não exige configurar
uma API key. As imagens de satélite dependem de conexão com a internet.

## Build web e PWA

```bash
yarn build
yarn preview
```

O preview utiliza `http://localhost:4173`. Publique o conteúdo de `dist/` em um
servidor HTTPS. O manifest, os ícones e o service worker são gerados na build.
O PWA pode ser instalado pelo menu do navegador.

## Electron

```bash
yarn build
yarn electron:dev
```

Para empacotar o aplicativo para o sistema operacional atual:

```bash
yarn electron:build
```

Os arquivos são gerados em `release/electron/`. A importação e a exportação de
áreas passam pelo preload e pelo processo principal, usando diálogos nativos.

## Android

Com Android SDK, JDK e Gradle configurados:

```bash
yarn android:sync
yarn android:open
```

Para gerar um APK de depuração no macOS ou Linux:

```bash
yarn android:build
```

O APK fica em `android/app/build/outputs/apk/debug/app-debug.apk`.
No Windows, após `yarn android:sync`, use `gradlew.bat assembleDebug` na pasta
`android`, ou gere a build pelo Android Studio. A importação e exportação usam
a ponte nativa do Capacitor e o seletor de documentos do Android.

## Funcionalidades

- Criar pelo botão único Criar ou pelo atalho N, escolhendo Área ou Ponto no menu. Editar, clonar, excluir e nomear pela lista ou pelo mapa.
- Trocar diretamente entre elementos quando a edição atual não tiver alterações; se houver mudanças pendentes, escolher entre salvar, descartar ou continuar editando.
- Limpar a seleção ao concluir ou cancelar uma criação/edição, inclusive com o mapa em janela separada.
- Criar pontos com nome e cor pelo menu Criar ou atalho P. Clique no mapa para posicionar, arraste para ajustar e confirme para salvar; cancelar descarta o rascunho. Pontos não têm borda permanente; o selecionado recebe um halo e, em edição, o contorno branco tem a mesma espessura da área.
- Editar, clonar, travar e excluir pontos pelos mesmos controles da lista. Áreas e pontos são salvos localmente e sincronizados entre as janelas.
- Consultar Áreas, Pontos e Avisos em abas independentes, cada uma com contador. L foca a listagem aberta; ←/→ trocam de aba no menu e ↑/↓ navegam somente pelos cards da lista aberta. T trava/destrava a seleção. Importar e exportar ficam no header; Apagar tudo fica ao lado de Criar no footer. Ao entrar nas listagens por L, as indicações de ←/→ aparecem na aba selecionada para trocar de aba; voltar de Avisos para Áreas ou Pontos devolve o foco aos cards.
- Manter o espaço da barra de rolagem reservado no menu, exibindo a barra somente quando houver conteúdo para rolar.
- No celular, recolher o drawer pela seta no topo do cabeçalho ou ao tocar no mapa. Durante a criação/edição, o painel se ajusta à altura do conteúdo, com cores em uma linha, coordenadas expansíveis e sem divisórias. Ao selecionar um vértice de uma área, Apagar vértice aparece no mapa, mantendo o histórico para desfazer e o mínimo de três vértices por contorno.
- No celular, usar o mapa em tela cheia, com painel recolhível pela seta no topo do menu, abas na parte inferior e margens simétricas para os cards. O footer mostra Criar ou, quando há seleção, Editar no mesmo lugar; durante a edição, Confirmar e Cancelar. Os cards usam botões compactos para manter nome, detalhes e ações na mesma linha. Importar/exportar ficam ao lado do título Mapa. Com o drawer fechado, Configurações fica à esquerda do botão Lista/Detalhes, e a bússola à direita. Todos os botões do footer têm largura mínima igual à altura. Celulares e tablets usam gestos de zoom, sem os botões +/−. O status de mapa ativo aparece nas Configurações.
- Desselecionar um card ao clicar no espaço vazio fora dele, preservando a seleção ao usar botões e mantendo a edição ativa até confirmar ou cancelar.
- Validar automaticamente os pontos dentro de áreas ao criar, mover, editar, recolorir, excluir ou importar áreas. A mesma cor gera alerta; cores diferentes geram erro. As mensagens identificam o ponto e a área e não bloqueiam o salvamento. Pontos sobre a borda não contam como estando dentro.
- Selecionar pela lista ou tocar em uma área destravada para editar.
- Travar áreas, escolher entre dez cores e fundir sobreposições da mesma cor.
- Mostrar um aviso ao tentar editar uma área ou ponto travado, orientando a destravar pelo cadeado da lista.
- Salvar as áreas localmente e importar/exportar arquivos JSON no navegador, no Electron e no Android.
- Exportar áreas, pontos ou ambos, com grupos expansíveis de Áreas e Pontos, inicialmente recolhidos e com todos os itens selecionados. A seleção pode ser por grupo ou por item, preservando nomes, cores e bloqueios. Arquivos com pontos usam a versão 2; arquivos antigos de áreas continuam aceitos.
- Importar acrescentando itens à coleção ou substituindo os tipos presentes no arquivo, após validar o conteúdo. Tipos ausentes no arquivo são preservados.
- Apagar todos pelo controle ao lado de Criar no footer, escolhendo somente áreas, somente pontos ou ambos e conferindo as quantidades antes de confirmar.
- Preencher automaticamente buracos de áreas importadas, criadas, editadas ou fundidas, inclusive vazios cercados por partes que se tocam apenas pelos vértices. Durante a edição, o preenchimento ocorre ao finalizar cada alteração da geometria.
- Separar o mapa em outra janela e sincronizar as ações nas duas telas.
- Abrir Configurações pela engrenagem para ativar/desativar atalhos e consultar a lista de teclas. Com atalhos ativos, os botões correspondentes exibem badges com as teclas.
- No mobile, os atalhos ficam desativados e suas badges não aparecem; a preferência do desktop é preservada. As Configurações usam uma tela própria para aparência e contraste, com temas em linhas e controles de toque maiores.
- Escolher os temas Preto profundo, Claro e Sistema nas Configurações, com preferência salva e sincronizada entre as janelas do menu e do mapa.
- Ativar alto contraste nos temas claro e escuro pela página Aparência. As Configurações têm duas páginas: Aparência e Atalhos. O switch de atalhos fica ao lado do título, e a referência de teclas aparece em duas colunas no desktop.

No modo de duas telas, a janela de controles mostra a lista de áreas à
direita e as mensagens, os atalhos e o gerenciamento das janelas à esquerda.
No mapa, zoom +, zoom −, bússola e **Separar mapa** ficam em uma grade 2×2.
Na janela separada, o quarto controle passa a ser **Focar menu**, também pelo
atalho **M**. Configurações e **Reunir telas** ficam somente na janela do menu.

Os nomes aceitam letras, números e espaços, até 30 caracteres. Clones recebem
nomes como `campo (1)`, `campo (2)`, inclusive ao clonar outra cópia; o sufixo
numérico entre parênteses é aceito na edição e nos arquivos exportados. Um desenho precisa
ter pelo menos três pontos distintos formando uma área. Excluir uma área pede
confirmação; Delete remove diretamente os vértices selecionados durante a edição.
Cancelar ou Esc descarta as alterações e encerra a edição diretamente. A confirmação
de alterações pendentes aparece somente ao tentar editar outro elemento.

## Estrutura

- `src/App.tsx`: composição da aplicação React.
- `src/components/`: lista, formulário, barra lateral, mapa, ações e modais.
- `src/hooks/`: integração do React com o controlador.
- `src/editor/`: controle do ArcGIS, estado tipado e persistência local.
- `electron/`: processo principal, preload e operações nativas de arquivos.
- `android/`: projeto Android e plugin nativo de documentos.

O SDK controla o conteúdo do mapa. O React renderiza a interface e consome o
estado do controlador com `useSyncExternalStore`. As instâncias, observadores
e eventos são descartados ao desmontar os componentes.
