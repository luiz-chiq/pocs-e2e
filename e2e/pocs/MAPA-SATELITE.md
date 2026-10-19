# Mapa de satélite — verificação adicional

Executado de 2026-10-19T22:05:50.543Z a 2026-10-19T22:05:59.584Z. Esta verificação posterior não altera os resultados históricos C/D ou N01–N05 das POCs.

## Sumário

- [Escolha](#escolha)
- [Resultados](#resultados)
- [Evidências e repetição](#evidências-e-repetição)
- [Limites](#limites)

## Escolha

Esri World Imagery, via TileLayer do SDK ArcGIS já usado no editor. A escolha considera cobertura global, imagens detalhadas e integração sem trocar a biblioteca de desenho. O [item oficial](https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9) declara acesso público. As requisições testadas responderam sem API key/token. O SDK exibe os créditos conforme região e escala, além da marca Esri. Acesso público continua sujeito aos termos Esri vinculados no item; não significa licença irrestrita. A camada é usada online, sem exportação/prefetch de imagens offline.

## Resultados

| Plataforma | Resultado | Duração |
| --- | --- | --- |
| Chrome / web local | Passou | 4.30 s |
| Electron macOS arm64 empacotado | Passou | 4.35 s |

Verificador Playwright, com contexto/perfil isolado por plataforma. Cada duração inclui lançamento, verificações e encerramento; exclui build e inicialização externa do preview. Não é uma comparação entre ferramentas.

Em ambas as plataformas foram verificados:

- JPEG real decodificado, sem chave e com atribuição na janela principal.
- Desenho e rótulo sobre as imagens de satélite.
- Satélite na janela separada e edição sincronizada.
- Reunião das telas preserva a área; nenhuma requisição ao antigo provedor.

Quatro combinações de plataforma/janela receberam e decodificaram tiles JPEG reais de 256 × 256 pixels, sem chave e sem cabeçalho de bloqueio. Os créditos regionais observados foram Earthstar Geographics. As capturas também foram inspecionadas visualmente.

## Evidências e repetição

- [JSON final](../../test-results/satellite-final/results.json) e [log final](../../test-results/satellite-final.log).
- [Web principal](../../test-results/satellite-final/web-main.png) e [mapa separado web](../../test-results/satellite-final/web-map.png).
- [Electron principal](../../test-results/satellite-final/electron-main.png) e [mapa separado Electron](../../test-results/satellite-final/electron-map.png).
- [Verificador](../../scripts/check-satellite.mjs).

```bash
npm run electron:build:poc
npm run check:satellite
```

O primeiro comando também gera dist com a API de leitura de prontidão/vértices usada pelo verificador. O segundo abre um preview local e usa a build Electron empacotada; ELECTRON_APP_PATH permite escolher outro executável. npm run build gera a versão normal de produção, sem essa API de teste.

## Limites

Esta rodada usa Chrome e Electron em macOS, na região inicial de São Paulo. PWA instalado, APK, Selenium/WDIO e o catálogo completo anterior não foram reexecutados após a troca do fundo. As imagens dependem de internet e do serviço externo; resolução/data variam por local e não são em tempo real. O deploy web não foi atualizado.

Duas tentativas de diagnóstico precederam a rodada final. A primeira esperava incorretamente Esri no campo de fontes regionais e recarregava o Electron antes de terminar a navegação inicial. A segunda confirmou os tiles nas quatro janelas, mas não selecionava o card antes de clicar no botão que alterna Criar/Editar. Os ajustes corrigiram o verificador, sem alterar as regras do app ou simular tiles: [primeira tentativa](../../test-results/satellite/results.json), [segunda tentativa](../../test-results/satellite-verified/results.json). A última rodada completa passou nas duas plataformas.
