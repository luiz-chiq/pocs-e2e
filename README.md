# Polígonos no mapa

Aplicação em React e TypeScript para desenhar e organizar polígonos sobre mapas
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
O botão de instalação responde apenas a toques e fica oculto no app instalado
ou nas versões nativas.

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
polígonos passam pelo preload e pelo processo principal, usando diálogos nativos.

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

- Criar, editar, clonar, excluir e nomear polígonos.
- Selecionar pela lista ou tocar em uma área destravada para editar.
- Travar áreas, escolher entre seis cores e fundir sobreposições da mesma cor.
- Salvar os polígonos localmente e importar/exportar nas versões nativas.
- Separar o mapa em outra janela e sincronizar as ações nas duas telas.
- Navegar com teclado e consultar os atalhos pelo botão de informações.

No modo de duas telas, a janela de controles mostra a lista de polígonos à
direita e as mensagens, os atalhos e o gerenciamento das janelas à esquerda.
Na janela do mapa, **Reunir telas** fica ao lado de **Criar/Editar**; durante
uma ação, essa linha mostra somente **Confirmar** e **Cancelar**.

Os nomes aceitam letras, números e espaços, até 30 caracteres. Um desenho precisa
ter pelo menos três pontos distintos formando uma área. Excluir uma área pede
confirmação; Delete remove diretamente os vértices selecionados durante a edição.
Esc permite salvar ou descartar alterações pendentes antes de sair da edição.

## Estrutura

- `src/App.tsx`: composição da aplicação React.
- `src/components/`: lista, formulário, barra lateral, mapa, ações e modais.
- `src/hooks/`: integração do React com o controlador e instalação do PWA.
- `src/editor/`: controle do ArcGIS, estado tipado e persistência local.
- `electron/`: processo principal, preload e operações nativas de arquivos.
- `android/`: projeto Android e plugin nativo de documentos.

O SDK controla o conteúdo do mapa. O React renderiza a interface e consome o
estado do controlador com `useSyncExternalStore`. As instâncias, observadores
e eventos são descartados ao desmontar os componentes.
