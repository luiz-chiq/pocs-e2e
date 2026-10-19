# Estado das POCs — situação atual

Atualizado em 19/10/2026, 10:33:45 (São Paulo). [Relatório completo](RELATORIO.md) · [Versão direta](RELATORIO-DIRETO.md).

## Resumo atual

**147 aprovações, 3 falhas e 0 sem validação concluída**, de 150 casos previstos. 3 falhas são o bug intencional C10 mouse; 0 são outras falhas.

**Duas janelas: 36/36 aprovados**, 0 falhas e 0 sem validação. Android não inclui duas janelas.

| Ferramenta | Web | PWA instalado | Electron | Android |
| --- | --- | --- | --- | --- |
| Playwright | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |
| Selenium | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |
| WebdriverIO | 14/15 aprovados; 1 falha | 13/13 aprovados | 13/13 aprovados | 9/9 aprovados |

Este é o consolidado mais recente das 12 combinações. Cada combinação usa a última suíte completa referenciada, com a origem indicada nas tabelas; não representa uma nova execução simultânea das 12. Resultados substituídos ficam somente nos arquivos históricos.

## Tempo de execução por plataforma

| Plataforma | Playwright | Selenium | WebdriverIO |
| --- | --- | --- | --- |
| Web | 1 min 18,49 s | 1 min 48,04 s | 2 min 16,55 s |
| PWA instalado | 1 min 19,55 s | 1 min 41,03 s | 1 min 35,74 s |
| Electron | 1 min 2,55 s | 1 min 20,58 s | 1 min 5,99 s |
| APK Android | 5 min 26,90 s | 8 min 14,45 s | 7 min 29,93 s |

Cada célula mostra o tempo de execução da suíte/comando daquela ferramenta e plataforma. Inclui inicialização, sessões, testes e encerramento internos ao comando; exclui build, preparação externa e limpeza externa. PWA e Electron usam as últimas execuções de rodadas distintas, identificadas na tabela detalhada.

## Falhas atuais

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/selenium.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** bug intencional: clique não abre as instruções de instalação. Continua contado como falha. [Log](../../test-results/pocs/web-fix-2026-10-19/verified/web/webdriverio.log).

## Escopo e observações

WDIO reconsulta o rótulo selecionado no D01, agora validado em web/PWA. Playwright direciona o Delete ao mapa com clique real no polígono e confirmação de foco. O bug intencional de instalação por mouse permanece.

C08 já passou antes do novo preparo: a causa da intermitência anterior continua inconclusiva. Três verificações isoladas e a suíte completa passaram após o ajuste; isso não mede estabilidade estatística. Nesta etapa foram reexecutados web nas três ferramentas e WDIO/PWA; os demais resultados são anteriores, incluindo a correção WDIO/Electron.

**Resultados desta etapa:** 42/45 na web, com apenas os três C10 mouse intencionais; WDIO/PWA 13/13. Total do orquestrador web: **5 min 23,41 s**; WDIO/PWA: **1 min 35,94 s**, em execução separada. Nenhum teste ficou sem execução. O consolidado passa a ter somente três falhas intencionais; os 36 testes de duas janelas estão aprovados. O WDIO/PWA registrou um aviso de sessão antiga no reinício, sem impedir os 13 testes; a versão completa preserva o log e a limitação.

Alvo web/PWA: [deploy](https://poc-e2e.chiquetano.com.br/). Electron macOS arm64 empacotado; APK debug em emulador Android. PWA instalado em perfil isolado e standalone verificado. Android C03/C08 usam controles da interface, sem Enter/Delete físicos. Não cobre aparelho físico, instaladores, permissões negadas, plugins nativos, criação/exportação de arquivos ou a disponibilidade de todos os tiles do mapa.

Este arquivo é gerado a partir dos mesmos resultados brutos das duas versões do relatório. As origens, as durações individuais e os percentuais estão no relatório completo.

## Histórico separado

[Relatório histórico completo](old/RELATORIO-HISTORICO-2026-10-19.md) · [Histórico direto](old/RELATORIO-DIRETO-HISTORICO-2026-10-19.md). Contêm as tentativas anteriores, as falhas já superadas e os tempos originais. Esses registros não são repetidos como resultados atuais.
