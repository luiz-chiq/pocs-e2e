# Estado das POCs

Revalidação web de 19/10/2026 concluída: **14/15 em cada ferramenta**, com
apenas C10 mouse falhando por causa do bug intencional. WDIO/PWA terminou
**13/13**, incluindo os quatro testes de duas janelas.

- [Relatório completo](RELATORIO.md): matriz atual, tempos individuais, evidências,
  tentativas anteriores, portabilidade e limitações.
- [Relatório direto](RELATORIO-DIRETO.md): resultados, tempos e falhas principais.
- Nova rodada web: `test-results/pocs/web-fix-2026-10-19/verified/`.
- Nova suíte WDIO/PWA: `test-results/pocs/web-fix-2026-10-19/pwa-verified/`.
- Rodada comparativa original: `test-results/pocs/final-2026-10-19/`.

| Ferramenta | Web | PWA instalado | Electron | Android |
| --- | --- | --- | --- | --- |
| Playwright | 14/15 (revalidado) | 13/13 | 13/13 | 9/9 |
| Selenium | 14/15 (revalidado) | 13/13 | 13/13 | 9/9 |
| WebdriverIO | 14/15 (revalidado) | 13/13 (revalidado) | 13/13 (etapa anterior) | 9/9 |

**Consolidado mais recente: 147 aprovações, três falhas intencionais e nenhum
caso sem execução**, de 150 previstos. Combina estas quatro suítes reexecutadas
com os resultados anteriores dos demais ambientes; não é uma nova rodada das
12 combinações. **Duas janelas: 36/36 aprovados.** Electron mantém 39/39;
Android mantém 27/27, sem reexecução nesta etapa.

As únicas falhas atuais são C10 mouse/web nas três ferramentas. As mesmas
instruções abriram por touch confiável nos três testes C10 touch. O defeito do
app foi preservado; nenhum skip, expectedFailure ou inversão de expectativa.

O D01 WDIO usa consulta renovada do rótulo selecionado, agora validada em web
e PWA. O C08 Playwright passou antes do ajuste, por isso não há causa confirmada
para a intermitência anterior. O preparo foi reforçado com clique real no centro
do polígono e foco confirmado no mapa antes de Delete, sem repetir a tecla.
Passou 3/3 em verificações isoladas e novamente na suíte completa. Isso não é
prova estatística de estabilidade. As asserções de exclusão/restauração continuam.

| Plataforma | Playwright | Selenium | WebdriverIO |
| --- | --- | --- | --- |
| Web | 1 min 18,49 s | 1 min 48,04 s | 2 min 16,55 s |
| PWA instalado | 1 min 19,55 s | 1 min 41,03 s | 1 min 35,74 s |
| Electron | 1 min 2,55 s | 1 min 20,58 s | 1 min 5,99 s |
| APK Android | 5 min 26,90 s | 8 min 14,45 s | 7 min 29,93 s |

Tempo por suíte/comando; build e preparação externas estão excluídos.
PWA/Electron usam as últimas suítes de rodadas distintas; origens nos relatórios.

Total da nova rodada web: **5 min 23,41 s**. WDIO/PWA: comando de
**1 min 35,74 s** e total de **1 min 35,94 s**,
em execução separada. A revalidação anterior WDIO/Electron foi 13/13 em
1 min 5,99 s. A rodada original das 12 combinações levou 36 min 46,72 s;
seus tempos e percentuais continuam separados. Casos com falhas/timeouts e
políticas diferentes de isolamento limitam a comparação de velocidade.

A primeira rodada web desta etapa (42/45, só falhas intencionais) e os três
C08 isolados estão preservados como diagnóstico; não substituem os testes ou
tempos da última suíte completa. Os relatórios de antes desta etapa foram
arquivados como [completo](RELATORIO-2026-10-19-ANTES-REVALIDACAO-WEB.md) e
[direto](RELATORIO-DIRETO-2026-10-19-ANTES-REVALIDACAO-WEB.md).

PWA instalado em perfil de automação isolado, standalone verificado. Nenhum
deploy ou build Electron/APK foi feito; o emulador Android não foi iniciado.
O bloqueio 403 do fundo OpenStreetMap observado na investigação Electron está
registrado nos relatórios; a disponibilidade de todos os tiles não é critério
funcional desta suíte. Não foi alterado aplicativo/provedor de mapas.

Os relatórios principais agora exibem somente resultados atuais em todas as
seções. As tabelas antigas, inclusive o impedimento já resolvido WDIO/Electron,
foram movidas para o [histórico](RELATORIO-HISTORICO-2026-10-19.md).
