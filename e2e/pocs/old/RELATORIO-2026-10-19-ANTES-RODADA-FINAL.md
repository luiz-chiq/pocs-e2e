# Histórico — Relatório completo das POCs E2E

> **RELATÓRIO HISTÓRICO — RESULTADOS SUBSTITUÍDOS.** Os números abaixo descrevem a rodada indicada neste arquivo. Para a situação vigente, consulte o [relatório completo atual](../RELATORIO.md), a [versão direta atual](../RELATORIO-DIRETO.md) ou o [status atual](../STATUS.md).

Atualizado em 19/10/2026, 06:53:58 (São Paulo). [Versão direta](RELATORIO-DIRETO-2026-10-19-ANTES-RODADA-FINAL.md).

## Sumário

- [Revalidação após correções](#revalidação-após-correções)
- [Resumo da rodada original](#resumo-da-rodada-original)
- [Tempos por plataforma](#tempos-por-plataforma)
- [Como interpretar os tempos](#como-interpretar-os-tempos)
- [Falhas desta rodada](#falhas-desta-rodada)
- [Portabilidade](#portabilidade)
- [Limites e aprendizados](#limites-e-aprendizados)
- [Etapas, builds e ambiente](#etapas-builds-e-ambiente)
- [Playwright: testes individuais](#playwright)
- [Selenium: testes individuais](#selenium)
- [WebdriverIO: testes individuais](#webdriverio)

## Revalidação após correções

Revalidação em 19/10/2026. **Resultado mais recente consolidado: 131 aprovações, 6 falhas e 13 sem validação concluída**, de 150 casos. Combina as suítes reexecutadas abaixo com os resultados originais das demais combinações; não é uma nova rodada das 12 combinações.

**Reexecutado após as alterações:** 57 aprovações, 2 falhas e 0 sem validação concluída. Cada linha é uma suíte completa, com os testes de duas janelas integrados quando aplicáveis.

Duas janelas: 12 aprovações e 0 falhas nas suítes reexecutadas; consolidado mais recente de 30 aprovações, 2 falhas e 4 sem validação, de 36 previstos.

| Ferramenta | Plataforma | Resultado atual | Tempo da nova suíte | Aumento na revalidação | Evidências |
| --- | --- | --- | --- | --- | --- |
| Playwright | APK Android | 9 passaram; 0 falharam; 0 sem validação | 5 min 56,29 s | 0,00% | [JSON](../../../test-results/pocs/fixes-2026-10-19/playwright-verified/android/playwright/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/playwright-verified/android/playwright.log) |
| Selenium | Web | 13 passaram; 2 falharam; 0 sem validação | 1 min 57,57 s | — | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-web-final/web/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-web-final/web/selenium.log) |
| Selenium | PWA instalado | 13 passaram; 0 falharam; 0 sem validação | 1 min 43,87 s | — | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-pwa-final/pwa/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-pwa-final/pwa/selenium.log) |
| Selenium | Electron | 13 passaram; 0 falharam; 0 sem validação | 1 min 21,97 s | — | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-electron-final/electron/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-electron-final/electron/selenium.log) |
| Selenium | APK Android | 9 passaram; 0 falharam; 0 sem validação | 7 min 53,78 s | 32,98% | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-verified/android/selenium/results.json) · [Log](../../../test-results/pocs/fixes-2026-10-19/selenium-verified/android/selenium.log) |

**Comparação de tempos:** o aumento na tabela acima usa somente as ferramentas reexecutadas na mesma plataforma; “—” indica que só uma ferramenta foi reexecutada ou não há medição elegível. Os percentuais da matriz original abaixo usam somente a rodada contínua das três ferramentas. Os novos tempos acima pertencem à revalidação; não foram misturados ao total original de 33 min 43,36 s nem usados para recalcular seus percentuais. Os dois grupos aplicam (tempo ÷ menor tempo elegível − 1) × 100.

**Ajustes e diagnóstico:**

- **Selenium, DOM atualizado:** reconsultar a lista de coordenadas e repetir somente a leitura que recebe `StaleElementReferenceError`. Outras exceções continuam abortando; o texto precisa mudar de verdade.
- **Selenium, confirmação no Android:** consultar o IME e enviar Back nativo somente quando o teclado está visível, sem Escape nem recriação do contexto WebView; reposicionar e aguardar geometria estável/visível do botão; esperar a entrega de um clique confiável de confirmação antes do próximo nome. A mensagem de validação também passa a ter uma espera condicional.
- **Playwright/Selenium, desenho no Android:** retirar a retenção artificial de 100 ms do toque. No Playwright, início/fim são enviados consecutivamente por CDP, como na implementação de tap do Chromium do próprio Playwright; Selenium mantém ações W3C via Appium. Permanecem a confirmação de cada vértice e o intervalo entre toques, sem repetir o gesto até passar. Eventos/tempos reais são registrados.
- **Selenium, mouse:** acrescentar 150 ms entre posicionar o cursor no mapa e pressionar para clicar/arrastar, para permitir processamento do hover. As últimas suítes desktop abaixo avaliam essa alteração; falhas remanescentes continuam contadas.

As expectativas e o aplicativo não foram alterados; o bug intencional do mouse na instalação continua falhando. **Intermitência:** antes de alterar o toque, a reprodução isolada C02/C03/C08 do Playwright já passou 3/3. O 9/9 posterior no Android confirma esta execução, sem provar a causa dos descartes anteriores ou estabilidade estatística. WDIO e Playwright nas plataformas desktop não foram reexecutados nesta etapa. **Pendência desta etapa:** Selenium/web C06 não confirmou a mudança de coordenadas após arrastar, antes de testar o cancelamento; causa inconclusiva. PWA e Electron terminaram 13/13; Android terminou 9/9 nas duas ferramentas revalidadas. A tentativa anterior com falhas adicionais está preservada abaixo.

**Falhas na revalidação:**

- Selenium/Web — C06 cancela alterações de nome e geometria: a lista de coordenadas não confirmou a alteração após o arraste; cenário não concluído, causa inconclusiva.
- Selenium/Web — C10 mouse deve abrir as instruções de instalação: defeito intencional de instalação continua detectado.

### Tentativas anteriores preservadas

Estes registros pertencem à investigação e às execuções anteriores ao último ajuste. Não entram de novo na contagem consolidada e não foram usados para escolher o melhor tempo.

| Tentativa | Resultado registrado | Soma dos testes | Evidência |
| --- | --- | --- | --- |
| Playwright Android antes de mudar o toque: C02/C03/C08 isolados | 3 passaram; 0 falharam | 125,34 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/diagnostic/playwright/results.json) |
| Selenium Android C05 — diagnostic-name | 0 passaram; 1 falharam | 34,56 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/diagnostic-name/selenium/results.json) |
| Selenium Android C05 — diagnostic-name-fixed | 0 passaram; 1 falharam | 36,60 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/diagnostic-name-fixed/selenium/results.json) |
| Selenium Android C05 — diagnostic-name-geometry | 0 passaram; 1 falharam | 71,66 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/diagnostic-name-geometry/selenium/results.json) |
| Selenium Android C05 — diagnostic-name-no-context | 0 passaram; 1 falharam | 68,41 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/diagnostic-name-no-context/selenium/results.json) |
| Selenium Android C05 — diagnostic-name-keys | 0 passaram; 1 falharam | 50,61 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/diagnostic-name-keys/selenium/results.json) |
| Selenium Android C05 — diagnostic-name-ack | 1 passaram; 0 falharam | 93,33 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/diagnostic-name-ack/selenium/results.json) |
| Selenium web antes do ajuste de hover | 14 passaram; 1 falharam | 93,37 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-verified/web/selenium/results.json) |
| Selenium pwa antes do ajuste de hover | 12 passaram; 1 falharam | 129,97 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-verified/pwa/selenium/results.json) |
| Selenium electron antes do ajuste de hover | 10 passaram; 3 falharam | 92,11 s | [JSON](../../../test-results/pocs/fixes-2026-10-19/selenium-verified/electron/selenium/results.json) |

### Evidências e limites do diagnóstico

A telemetria de Android registrou 35 pares de toque sem deslocamento no mapa em cada ferramenta. Duração máxima observada: Playwright 46,3 ms; Selenium 178,7 ms. Os dados anteriores não registravam pointerdown/timestamps suficientes para comprovar que um toque longo causou cada falha antiga. [Consolidação da telemetria](../../../test-results/pocs/fixes-2026-10-19/tap-summary.json). Nas capturas da primeira revalidação Electron, o fundo OpenStreetMap mostrou HTTP 403/Access blocked. Isso comprova uma dependência externa afetada, sem demonstrar causa das falhas de hitTest/arraste; a suíte não valida a disponibilidade visual de todos os tiles. Não houve mudança de provedor nem tentativa de contornar o bloqueio.

### Testes individuais reexecutados

**Playwright/APK Android** — encerrada em 2026-10-19T09:45:51.079Z.

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 21,59 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 35,60 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 35,85 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 38,72 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 46,55 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 32,57 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 39,06 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 67,30 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 37,36 s | Verificações concluídas. |

**Selenium/Web** — encerrada em 2026-10-19T09:48:43.279Z.

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 6,45 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 5,98 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,82 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,36 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,85 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ❌ Falhou | 15,87 s | .vertex-list: aguardando alteração do texto Wait timed out after 10156ms |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,57 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 9,47 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,64 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,87 s | O botão deve responder à interação e abrir as instruções. Wait timed out after 10149ms |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 1,77 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 12,90 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 7,37 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 6,67 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,98 s | Verificações concluídas. |

**Selenium/PWA instalado** — encerrada em 2026-10-19T09:50:27.421Z.

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 4,17 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 6,56 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 5,22 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 7,21 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 5,42 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 6,43 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 7,40 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 9,82 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 7,13 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 16,18 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 8,55 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 8,69 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 9,11 s | Verificações concluídas. |

**Selenium/Electron** — encerrada em 2026-10-19T09:51:56.207Z.

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 4,11 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,91 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,91 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,13 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,07 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,90 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 5,20 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 8,42 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,78 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 13,17 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 6,95 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 6,38 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,67 s | Verificações concluídas. |

**Selenium/APK Android** — encerrada em 2026-10-19T09:39:15.437Z.

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 28,34 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 43,10 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 34,63 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 54,84 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 86,41 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 37,03 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 55,57 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 86,21 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 47,17 s | Verificações concluídas. |

### Dados originais preservados

As seções seguintes descrevem a rodada comparativa anterior às correções. Seus resultados, tempos individuais, total contínuo e evidências foram preservados para comparação. A situação atual das combinações reexecutadas está acima.


## Resumo da rodada original

Nova rodada das 12 combinações, sem importar resultados anteriores. Execução encerrada.

| Ferramenta | Plataforma | O que foi executado/previsto | Resultado | Soma dos testes | Tempo da suíte/comando | Aumento sobre o menor tempo da plataforma |
| --- | --- | --- | --- | --- | --- | --- |
| Playwright | Web | 15 registros / 15 previstos; 4 de duas janelas | 14 passaram; 1 falhou | 76,73 s | 1 min 19,55 s | 0,00% |
| Playwright | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas | ✅ Funcionou: 13/13 | 78,76 s | 1 min 19,73 s | 0,00% |
| Playwright | Electron | 13 registros / 13 previstos; 4 de duas janelas | ✅ Funcionou: 13/13 | 61,27 s | 1 min 1,97 s | 0,00% |
| Playwright | APK Android | 9 registros / 9 previstos | 6 passaram; 3 falharam | 293,85 s | 4 min 56,37 s | 0,00% |
| Selenium | Web | 15 registros / 15 previstos; 4 de duas janelas | 14 passaram; 1 falhou | 91,00 s | 1 min 32,81 s | 16,67% |
| Selenium | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas | 12 passaram; 1 falhou | 88,31 s | 1 min 30,05 s | 12,94% |
| Selenium | Electron | 13 registros / 13 previstos; 4 de duas janelas | 12 passaram; 1 falhou | 68,85 s | 1 min 9,28 s | 11,80% |
| Selenium | APK Android | 9 registros / 9 previstos | 7 passaram; 2 falharam | 401,37 s | 6 min 41,87 s | 35,60% |
| WebdriverIO | Web | 15 registros / 15 previstos; 4 de duas janelas | 13 passaram; 2 falharam | 135,70 s | 2 min 20,00 s | 76,00% |
| WebdriverIO | PWA instalado | 13 registros / 13 previstos; 4 de duas janelas | 12 passaram; 1 falhou | 90,85 s | 1 min 39,42 s | 24,69% |
| WebdriverIO | Electron | 0 registros / 13 previstos; 4 de duas janelas | ⛔ Não foi possível criar/concluir a sessão | — | 2 min 5,37 s | — |
| WebdriverIO | APK Android | 9 registros / 9 previstos | ✅ Funcionou: 9/9 | 433,39 s | 7 min 24,22 s | 49,89% |

**Aumento sobre o menor tempo da plataforma:** (tempo da suíte ÷ menor tempo elegível − 1) × 100; 0% identifica a referência desta rodada. A comparação usa suítes com todos os casos registrados, mesmo com falhas; sessões sem execução completa ficam com “—”. Falhas podem abreviar cenários ou adicionar timeouts, e o isolamento difere entre ferramentas: o percentual é descritivo, não um benchmark de desempenho.

**125 aprovados, 12 falhas e 13 sem validação concluída**, de 150 casos previstos.

3 falhas detectam o defeito intencional de C10 mouse; 9 são outras falhas de execução/asserção, detalhadas abaixo. Não significam automaticamente defeitos no aplicativo.

Duas janelas: **28 aprovados, 4 falhas e 4 sem validação concluída**, de 36 casos previstos em web/PWA/Electron. Android não participa dessa contagem.

Os testes de duas janelas fazem parte das suítes completas web, PWA e Electron. O APK usa C01–C09 com controles de toque; separar mapa e instalar o PWA não se aplicam ao app Android. C10 mouse continua detectando o defeito intencional de instalação na web, e C10 touch exige um toque confiável.

No Android, C03 inicia edição pelo botão e C08 usa os controles de exclusão; os atalhos físicos Enter/Delete não são exercitados. Falhas antes da última etapa não validam o restante do cenário.

## Tempos por plataforma

| Plataforma | Build | Preparação externa | Suítes/comandos | Limpeza externa | Total da plataforma |
| --- | --- | --- | --- | --- | --- |
| Web | — | — | 5 min 12,36 s | — | 5 min 12,69 s |
| PWA instalado | — | — | 4 min 29,19 s | — | 4 min 29,53 s |
| Electron | 6,06 s | — | 4 min 16,62 s | — | 4 min 23,09 s |
| APK Android | 4,17 s | 29,37 s | 19 min 2,47 s | 1,34 s | 19 min 38,05 s |

**Tempo total medido da rodada:** 33 min 43,36 s. **Início:** 2026-10-19T08:24:36.564Z. **Fim:** 2026-10-19T08:58:19.901Z.

O total da plataforma inclui build, preparação, suítes, limpeza e geração intermediária dos relatórios. No Android, preparação externa agrupa boot/estabilização do emulador, instalação inicial do APK e início/espera do Appium. Preparação feita pela própria ferramenta, inclusive novas sessões e instalação/lançamento do PWA, fica dentro de suíte/comando. “—” indica etapa não aplicável ou medição indisponível, não zero. O total contínuo da rodada não inclui as investigações anteriores. [Medição por etapa](../../../test-results/pocs/metrics-2026-10-19-run2/timing.json).

## Como interpretar os tempos

**Soma dos testes** soma as durações individuais, incluindo casos que falharam. **Tempo da suíte/comando** mede o intervalo observado pelo orquestrador ao executar a ferramenta: inclui inicialização do processo, sessões, testes e encerramento dentro desse comando. Quando a sessão falha antes dos testes, mede somente essa tentativa de preparação. Essas duas colunas excluem as etapas externas, medidas separadamente na tabela por plataforma quando disponíveis.

Somando os comandos das suítes Android: **19 min 2,47 s**, sem build, preparação e limpeza externos. Os resultados vêm desta nova rodada sequencial.

Playwright abre uma sessão/app por teste; Selenium também cria sessões por teste, incluindo Appium no Android; WebdriverIO compartilha a sessão entre casos e limpa dados pela interface. Há esperas fixas, esperas condicionais, gestos e custos de conexão diferentes. Falhas podem encurtar um cenário antes de suas últimas etapas ou alongá-lo até um timeout. Portanto, as durações descrevem estas implementações e **não permitem concluir qual ferramenta é mais rápida**. “—” indica ausência de medição, não duração zero. Uma falha na preparação ou em uma pré-condição não comprova defeito na funcionalidade do título.

Uma execução por suíte, em sequência e com um worker; sem repetição manual para escolher o melhor resultado. Retentativas internas de conexão dos drivers podem integrar o tempo. Os testes e as expectativas foram mantidos durante a rodada; foram acrescentadas medições externas e documentação. Build local pode aproveitar cache. Recursos do mapa, rede, perfil, teclado e emulador podem influenciar. Uma rodada não mede dispersão ou frequência de intermitência e não é benchmark do tempo de resposta do app.

C10 usa o caminho de instruções de instalação: a fixture impede que uma oferta nativa beforeinstallprompt chegue ao app e verifica o clique/toque confiável no diálogo de fallback. Não automatiza o prompt nativo de instalação. A instalação real e o modo standalone são verificados nas suítes da plataforma PWA, em perfis isolados.

Web/PWA acessam o deploy https://poc-e2e.chiquetano.com.br/; não houve build ou novo deploy web nesta rodada. As builds locais de Electron e APK estão medidas separadamente.

## Falhas desta rodada

- **Playwright/Web — C10 mouse deve abrir as instruções de instalação:** Defeito intencional detectado: clique não abriu as instruções de instalação. A falha continua contada. [Log](../../../test-results/pocs/metrics-2026-10-19-run2/web/playwright.log).
- **Playwright/APK Android — C02 bloqueia desenhos vazios, incompletos e sem área:** O SDK confirmou um vértice quando a suíte aguardava dois; a preparação do desenho falhou e nem todas as validações do cenário foram concluídas. Causa não determinada. Error: expect(received).toBe(expected) // Object.is equality  Expected: 2 Received: 1  Call Log: - Timeout 5000ms exceeded while waiting on the predicate [Log](../../../test-results/pocs/metrics-2026-10-19-run2/android/playwright.log).
- **Playwright/APK Android — C03 seleciona sem editar e permite edição por Enter ou botão:** Falhou durante a criação; o SDK não confirmou um vértice. As etapas posteriores não foram alcançadas; causa não determinada. Error: O SDK não recebeu o vértice 3.  O SDK não recebeu o vértice 3.  expect(received).toBe(expected) // Object.is equality  Expected: 3 Received: 2  Call Log: - Timeout 5000ms exceeded while waiting on the predicate [Log](../../../test-results/pocs/metrics-2026-10-19-run2/android/playwright.log).
- **Playwright/APK Android — C08 confirma e cancela exclusões por Delete, individuais e de todos:** Falhou durante a criação; o SDK não confirmou um vértice. As etapas posteriores não foram alcançadas; causa não determinada. Error: O SDK não recebeu o vértice 2.  O SDK não recebeu o vértice 2.  expect(received).toBe(expected) // Object.is equality  Expected: 2 Received: 1  Call Log: - Timeout 5000ms exceeded while waiting on the predicate [Log](../../../test-results/pocs/metrics-2026-10-19-run2/android/playwright.log).
- **Selenium/Web — C10 mouse deve abrir as instruções de instalação:** Defeito intencional detectado: clique não abriu as instruções de instalação. A falha continua contada. [Log](../../../test-results/pocs/metrics-2026-10-19-run2/web/selenium.log).
- **Selenium/PWA instalado — D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas:** Falha de automação: a referência DOM ficou obsoleta durante a leitura; a espera abortou sem tratar essa atualização transitória. Não é uma asserção demonstrando estado funcional incorreto. As etapas seguintes não foram concluídas. stale element reference: stale element not found in the current frame   (Session info: chrome=155.0.8059.82) [Log](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/selenium.log).
- **Selenium/Electron — D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas:** Falha de automação: a referência DOM ficou obsoleta durante a leitura; a espera abortou sem tratar essa atualização transitória. Não é uma asserção demonstrando estado funcional incorreto. As etapas seguintes não foram concluídas. stale element reference: stale element not found in the current frame   (Session info: chrome=152.0.7977.130) [Log](../../../test-results/pocs/metrics-2026-10-19-run2/electron/selenium.log).
- **Selenium/APK Android — C02 bloqueia desenhos vazios, incompletos e sem área:** Esgotou a espera de contagem de vértices durante a preparação do desenho. A mensagem não registra o valor observado; causa não determinada. Nem todas as validações do cenário foram concluídas. Wait timed out after 5195ms [Log](../../../test-results/pocs/metrics-2026-10-19-run2/android/selenium.log).
- **Selenium/APK Android — C05 valida nomes, acentos e limite de trinta caracteres:** Falha de interação automatizada: o driver rejeitou coordenadas fora da viewport aceita. O gesto e as verificações posteriores não foram concluídos; não comprova erro da regra de negócio. move target out of bounds   (Session info: chrome=133.0.6943.137) [Log](../../../test-results/pocs/metrics-2026-10-19-run2/android/selenium.log).
- **WebdriverIO/Web — D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas:** Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" [Log](../../../test-results/pocs/metrics-2026-10-19-run2/web/webdriverio.log).
- **WebdriverIO/Web — C10 mouse deve abrir as instruções de instalação:** Defeito intencional detectado: clique não abriu as instruções de instalação. A falha continua contada. [Log](../../../test-results/pocs/metrics-2026-10-19-run2/web/webdriverio.log).
- **WebdriverIO/PWA instalado — D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas:** Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" [Log](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/webdriverio.log).
- **WebdriverIO/Electron — Preparação:** A ferramenta encerrou sem produzir relatório. DevToolsActivePort ausente; a sessão Electron não foi criada. Os cenários sem registro não foram executados. [Log](../../../test-results/pocs/metrics-2026-10-19-run2/electron/webdriverio.log).

## Portabilidade

### O que foi reaproveitado nesta POC

As três POCs têm **implementações de testes independentes**. Foram reaproveitados o plano e os critérios funcionais; o código que opera a interface foi escrito para cada ferramenta. Não há um teste de WebdriverIO sendo executado por Playwright ou Selenium, nem conversão automática entre eles.

| Camada | Como ficou nesta POC | Evidência no projeto |
| --- | --- | --- |
| Catálogo e critérios | Mesmos IDs C01–C10 e D01–D03, títulos e expectativas de negócio. C10 tem duas entradas e D02 duas variações. | [Catálogo e contratos](../shared/fixtures.ts), [plano](../README.md). |
| Seletores e dados comuns | Seletores `data-testid`/CSS, triângulo inicial, viewport, tipos de coordenadas e configuração de ambiente compartilhados. Alguns dados, como listas de nomes inválidos, continuam escritos em cada suíte. | [Fixtures compartilhadas](../shared/fixtures.ts). |
| Infraestrutura | Instalação/lançamento do PWA, conexão CDP, obtenção de ChromeDriver do Electron, capabilities Android e orquestração têm módulos compartilhados. Isso não substitui os gestos de cada ferramenta. | [PWA](../shared/pwa.ts), [conexão Chrome](../shared/chrome-pipe.ts), [Electron](../shared/electron.ts), [Android](../shared/android.ts), [orquestrador](../../../scripts/run-pocs.mjs). |
| Leitura do app | Mesmo contrato auxiliar de coordenadas, persistência, prontidão e contagem de vértices. Não injeta polígonos nem altera resultados para aprovar testes. | `polygonTestApi`, disponível na build E2E. |
| Execução da interface | Cliques, preenchimento, desenho, arraste, esperas, asserções e troca entre janelas implementados separadamente. Helpers como `create`, `deselect` e `confirmName` existem em cada suíte, com assinaturas/implementações próprias. | [Playwright](../playwright/web.spec.ts), [Selenium](../selenium/web.test.ts), [WebdriverIO](../webdriverio/web.e2e.ts). |
| Sessões e evidências | Hooks, reinício/persistência, captura de screenshots, trace e gravação do resultado adaptados ao runner. As durações individuais vêm de pontos de medição diferentes. | [Fixtures Playwright](../playwright/fixtures.ts), [reporter](../playwright/reporter.ts), [Selenium](../selenium/web.test.ts), [configuração WDIO](../../../wdio.poc.conf.ts). |

Compartilhado não significa utilizado pelas três ferramentas em todos os ambientes: as capabilities Appium e parte da conexão Chrome atendem Selenium/WebdriverIO; Playwright usa seus próprios adaptadores de sessão para Android/Electron. Os helpers comuns de instalação do PWA são usados pelas três integrações.

Exemplo do mesmo passo de negócio, usando o seletor compartilhado `s.draw`:

```ts
// Playwright
await page.locator(s.draw).click()

// Selenium
await (await driver.findElement(By.css(s.draw))).click()

// WebdriverIO
await $(s.draw).click()
```

O clique simples muda pouco. Esperar a criação de três vértices, arrastar geometria, coordenar duas janelas e reiniciar um APK exigem adaptação maior. Por exemplo, o Playwright Android desta POC envia gestos por CDP; Selenium e WebdriverIO usam ações W3C via Appium. A espera do `hitTest` e as confirmações com teclado aberto também precisaram de ajustes próprios. Ter os mesmos nomes de cenário não garante que os eventos e seus intervalos sejam idênticos.

### Reutilização entre plataformas e custo de isolamento

| Plataforma | Playwright | Selenium | WebdriverIO |
| --- | --- | --- | --- |
| Web | Contexto isolado por teste; navegador do worker é compartilhado. | Processo/perfil de Chrome por teste. | Sessão/perfil compartilhados; limpa dados pela interface. |
| PWA | Perfil novo e instalação real por teste; C07 reabre preservando o perfil daquele caso. | Perfil novo e instalação real por teste; C07 reabre com o PWA já instalado naquele perfil. | Instala no início da suíte; C07 relança usando o perfil existente. |
| Electron | Lança app/perfil por teste; C07 fecha e reabre o mesmo perfil. | Inicia ChromeDriver/app/perfil por teste; C07 reinicia. | Configurado para sessão compartilhada; a tentativa de inicialização pode impedir os corpos dos cenários de rodar. |
| Android | Force-stop, limpeza do pacote e lançamento por teste; conecta à WebView do PID atual. | Sessão Appium por teste, com instalação/reset conforme as capabilities; contexto WebView. | Sessão Appium compartilhada; refresh e limpeza pela interface entre casos; C07 encerra/reativa o app. |

Essas decisões pertencem à implementação desta POC, não são imposições universais das ferramentas. Explicam por que reaproveitar o roteiro não produz custos de execução equivalentes. Normalizar o isolamento seria uma alteração adicional nos adaptadores; não foi feita durante a rodada de métricas.

### Como migrar testes existentes para outra ferramenta

1. Preservar o comportamento esperado: pré-condições, ações, resultados e dados. Identificar o que realmente é regra de negócio e o que é detalhe do runner antigo.
2. Reaproveitar seletores, dados e componentes de domínio que não importem APIs da ferramenta. Page Objects que chamam diretamente `browser`, `page` ou `driver` precisam ter essa parte adaptada.
3. Reescrever a camada de execução: locators, preenchimento, gestos, asserções, esperas, hooks, perfis, janelas e evidências. Copiar uma espera fixa não garante equivalência entre drivers.
4. Adaptar o lançamento por plataforma: navegador; instalação real e janela standalone do PWA; executável/driver do Electron; APK, ADB, contexto WebView e teclado no Android.
5. Validar paridade antes de comparar métricas: mesma versão do app, dados iniciais, isolamento, critérios de toque e sinais de prontidão. Repetir os casos sensíveis e investigar divergências sem enfraquecer as asserções.

Selenium → WebdriverIO pode reaproveitar parte da configuração conceitual de WebDriver/Appium; as chamadas do cliente, asserções e lifecycle ainda mudam. Playwright → Selenium/WebdriverIO também exige adaptar fixtures/contextos e a integração de protocolo. Dentro de uma mesma ferramenta, esta POC reutiliza boa parte do corpo dos cenários entre plataformas, com branches e adaptadores para lançamento, toque, persistência e janelas.

Para reduzir custo futuro, seria possível definir ações de domínio como `criarPoligono` e implementar um adaptador por ferramenta. Essa abstração **não foi criada para unificar as três suítes nesta POC**: manter execuções independentes permite observar as diferenças, mas duplica parte da manutenção. Não foi medido o tempo de desenvolvimento/migração nem um percentual de reaproveitamento de código; os tempos do relatório são de execução dos testes.

### Exemplo observado na correção dos adaptadores

Na revalidação de 19/10/2026, os critérios dos cenários foram preservados. No
Playwright Android, o toque no mapa passou a enviar início/fim consecutivos por
CDP. No Selenium, foram ajustadas as ações W3C de toque, a coordenação com o
teclado/viewport e a espera pela entrega do clique de confirmação. As leituras
de geometria passaram a tolerar somente a referência DOM obsoleta transitória;
o mouse ganhou um intervalo de hover antes de pressionar. São correções nos
adaptadores específicos, sem reescrever o roteiro de negócio ou aplicar uma
conversão automática às três ferramentas. Os resultados e os tempos dessa
revalidação ficam separados da rodada comparativa original.


## Limites e aprendizados

### Aprendizados das rodadas anteriores

Esta seção registra a análise da revalidação anterior. Os resultados da rodada atual estão na matriz e na lista de falhas do relatório; os episódios abaixo não são contados novamente como falhas atuais.

O resultado funcional deveria convergir para o mesmo app, estado e interação. Os cenários têm os mesmos objetivos, mas seus adaptadores não reproduzem exatamente a mesma sequência e duração de eventos. Selenium e WebdriverIO usam Appium no Android; Playwright conecta diretamente à WebView via sua API Android e usa CDP nos gestos do mapa. Os métodos de preenchimento, rolagem, esperas e isolamento também diferem. Isso limita a comparação atual.

| Falha observada | O que a evidência comprova | O que ainda não foi comprovado |
| --- | --- | --- |
| Playwright/Android — C03 | Antes de testar seleção, chegaram três eventos de toque confiáveis ao mapa; a consulta de desenho confirmou dois vértices, mesmo após a espera de 5 s. A criação inicial não terminou. | A causa do vértice ausente: pode envolver entrega/processamento do gesto, estado do SDK ou comportamento do app. Não há evidência suficiente para atribuir a falha exclusivamente ao Playwright ou ao aplicativo. |
| WebdriverIO/Android — C05 | O campo indicou nome vazio/inválido. Após o gesto de concluir, o aviso do topo permaneceu sem `role="alert"`. A suíte parou nessa verificação, antes dos nomes válidos e do limite de caracteres. Esse caso havia passado na tentativa anterior. | Não foi confirmado se o toque acionou o handler de concluir. Mudanças de posição ao rolar/fechar o teclado e uma divergência do app são hipóteses; não houve telemetria suficiente do botão para distinguir essas causas. |

O 9/9 do Selenium confirma que os cenários passaram naquela execução. Não prova que o app esteja livre de problemas intermitentes nem que os outros resultados sejam falsos positivos. **As duas falhas restantes estão inconclusivas quanto à causa**, apesar de suas asserções terem falhado. A falha anterior de C08 no WebdriverIO era uma transição não aguardada pela automação: o mapa faz `hitTest` assíncrono; depois de esperar o botão voltar ao modo de criação, a suíte completa passou por C08.

As diferenças podem ser verificadas nos adaptadores de [Playwright](../playwright/web.spec.ts), [Selenium](../selenium/web.test.ts) e [WebdriverIO](../webdriverio/web.e2e.ts). Para uma comparação de confiabilidade, falta igualar a política de isolamento e os contratos de gestos/esperas, registrar alvo/coordenadas/viewport e acionamento do botão, e repetir os cenários com o mesmo APK e emulador. Isso permitiria medir frequência de falhas, além do resultado de uma execução. A rodada comparativa de métricas repetiu as suítes existentes, sem normalizar essas diferenças entre adaptadores. A revalidação posterior do Selenium/Playwright ajusta alguns gestos e esperas; seus novos tempos são apresentados separadamente.

### Limitações por ferramenta em Electron e Android

“Documentada” indica uma restrição da integração; “observada” descreve esta POC e não uma incapacidade geral da ferramenta.

| Ferramenta | Electron | Android |
| --- | --- | --- |
| Playwright | **Documentada:** integração `_electron` experimental; o lançamento depende de configuração compatível com inspeção Node. Diálogos nativos do sistema não são tratados como elementos da página. **Escopo da POC:** app macOS empacotado e duas janelas; instalador e diálogos nativos não avaliados. [Documentação Electron](https://playwright.dev/docs/api/class-electron). | **Documentada:** API Android experimental, voltada a Chrome/WebView; requer ADB. Há limitações de cobertura e captura exige dispositivo acordado. **Observada:** esta POC exercita a WebView do Capacitor; reconexão após reiniciar o app exigiu esperar o PID correto. C03 ficou inconclusivo na revalidação anterior. [Documentação Android](https://playwright.dev/docs/api/class-android). |
| Selenium | **Integração:** usa ChromeDriver e o executável do Electron, com configuração própria. Controlar a página não fornece automaticamente automação de menus/diálogos do sistema ou das APIs do processo principal. **Observada:** redimensionar por WebDriver falhou em `Browser.getWindowForTarget`; o bootstrap passou a usar o tamanho original. [Guia do Electron](https://www.electronjs.org/docs/latest/tutorial/automated-testing#with-selenium). | **Integração:** nesta POC, Selenium é o cliente de Appium/UiAutomator2; Selenium sozinho não é o driver do APK. Precisa de WebView depurável, contexto correto e ChromeDriver compatível. **Observada:** `browserName` precisou ficar vazio para abrir o app; a rotina genérica de esconder teclado enviava Escape e interrompia a edição. O ajuste atual consulta o teclado e envia somente Back nativo quando o IME está aberto, sem trocar/recriar o contexto WebView; também aguarda geometria estável e entrega do clique confiável. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |
| WebdriverIO | **Documentada:** oferece serviço Electron, com dependência de inicialização/ChromeDriver compatíveis. **Observada anteriormente:** a sessão falhou por ausência de `DevToolsActivePort`. Isso é um impedimento daquela configuração, não ausência de suporte a Electron; consulte o resultado da nova tentativa na matriz atual. [Serviço Electron](https://webdriver.io/docs/desktop-testing/electron/). | **Integração:** também usa Appium/UiAutomator2 e ChromeDriver para a WebView; compartilha essas dependências com Selenium. **Observada:** reutiliza a sessão entre casos; rolagem, teclado e a espera pela desseleção precisam ser coordenados. C08 passou após o ajuste na revalidação anterior; C05 variou entre tentativas. [Appium/UiAutomator2](https://github.com/appium/appium-uiautomator2-driver#hybrid-mode). |

A documentação atual do WebdriverIO apresenta `@wdio/electron-service`; o projeto tem `wdio-electron-service` 9.2.1 instalado. Essa diferença merece verificação na próxima investigação de Electron, mas não foi confirmada como causa do erro de inicialização. Nenhuma atualização de dependências foi feita nesta análise. [Configuração documentada](https://webdriver.io/docs/desktop-testing/electron/).

**Limites comuns desta execução:** Electron foi avaliado apenas no macOS arm64; Android apenas no AVD Pixel_8, com APK de debug e WebView depurável. Não foram avaliados aparelho físico, APK release sem depuração, plugins nativos do Capacitor, permissões do sistema ou outras versões de Android/WebView. Os testes de duas janelas verificam sincronização, sem posicionamento em dois monitores físicos. A ausência de duas janelas e de Enter/Delete no APK corresponde ao escopo deste app/testes, não a uma limitação geral das ferramentas.


## Etapas, builds e ambiente

- **Implementação de duas telas:** D01, D02 pela principal, D02 pelo mapa e D03 incluídos nas suítes web, PWA e Electron das três ferramentas.
- **Web:** Execução concluída: 41 passaram, 4 falharam; 0 com outro status. Consulte os detalhes abaixo.
- **PWA:** Execução concluída: 37 passaram, 2 falharam; 0 com outro status. Consulte os detalhes abaixo.
- **Build Electron:** Aplicativo Electron empacotado para o sistema local em release/electron (sem instalador e sem assinatura).
- **Electron:** Execução concluída: 25 passaram, 1 falharam; 0 com outro status. 1 ferramenta(s) sem relatório por falha de infraestrutura. Consulte os detalhes abaixo.
- **Build APK:** APK de debug gerado com sucesso.
- **Android:** Execução concluída: 22 passaram, 5 falharam; 0 com outro status. Consulte os detalhes abaixo.

**Ambiente:** macOS 15.3 arm64; Node v24.11.0; base Git 5c6cb48 com alterações locais de medição/documentação; versões {"@playwright/test":"1.63.0","selenium-webdriver":"4.51.0","webdriverio":"9.31.9","electron":"44.4.3","appium":"3.8.0","appium-uiautomator2-driver":"8.7.0"}. Web/PWA no deploy https://poc-e2e.chiquetano.com.br/. AVD Pixel_8: API 36, Google Play arm64-v8a, RAM configurada de 2048 MB; Chrome desktop 155.0.8059.82; WebView Android 133.0.6943.137. Versões obtidas dos pacotes/configuração e logs desta execução.

**Ordem:** plataformas web → pwa → electron → android; ferramentas playwright → selenium → webdriverio em cada plataforma. Medições em uma rodada contínua e sequencial.

Comando usado nesta rodada (a partir da raiz do projeto):

```bash
POC_FRAMEWORKS=playwright,selenium,webdriverio POC_RESULTS_DIR=test-results/pocs/metrics-2026-10-19-run2 npm run test:poc:all
```

**Artefatos:** Electron em `release/electron/` e APK em `android/app/build/outputs/apk/debug/app-debug.apk`. Logs das builds: [Electron](../../../test-results/pocs/metrics-2026-10-19-run2/electron/build.log) · [APK](../../../test-results/pocs/metrics-2026-10-19-run2/android/build.log).

O PWA foi instalado em perfil de automação e teve `display-mode: standalone` verificado. O Electron foi empacotado para macOS, sem instalador Windows. Duas janelas simultâneas foram usadas; não foi avaliado o posicionamento em dois monitores físicos. A API auxiliar lê coordenadas, prontidão e quantidade de vértices e aguarda a persistência; os desenhos e edições usam gestos das ferramentas. Ambiente web/PWA: https://poc-e2e.chiquetano.com.br/.

## Playwright

### Web

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/web/playwright/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/web/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 2,73 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,09 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,00 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 4,92 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,51 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,87 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 5,81 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,54 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,72 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,73 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 1,26 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,75 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,32 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,29 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,21 s | Verificações concluídas. |

### PWA instalado

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/playwright/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,73 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 5,67 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,18 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,24 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,58 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,95 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,69 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,85 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,52 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 9,89 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,59 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,59 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,29 s | Verificações concluídas. |

### Electron

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/electron/playwright/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/electron/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,53 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 3,96 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,01 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 4,99 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,33 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 3,75 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,66 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,46 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,36 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 8,65 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 4,18 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 4,01 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 5,36 s | Verificações concluídas. |

### APK Android

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/android/playwright/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/android/playwright.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 21,88 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ❌ Falhou | 23,82 s | O SDK confirmou um vértice quando eram aguardados dois. Preparação do desenho incompleta; nem todas as validações do cenário foram alcançadas. Causa não determinada. Error: expect(received).toBe(expected) // Object.is equality  Expected: 2 Received: 1  Call Log: - Timeout 5000ms exceeded while waiting on the predicate |
| C03 seleciona sem editar e permite edição por Enter ou botão | ❌ Falhou | 17,18 s | Falhou na pré-condição de criação: um toque não foi reconhecido como vértice pelo SDK. A funcionalidade posterior do cenário não foi alcançada; causa ainda não determinada. Error: O SDK não recebeu o vértice 3.  O SDK não recebeu o vértice 3.  expect(received).toBe(expected) // Object.is equality  Expected: 3 Received: 2  Call Log: - Timeout 5000ms exceeded while waiting on the predicate |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 37,92 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 36,85 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 28,06 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 35,18 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ❌ Falhou | 59,45 s | Falhou na pré-condição de criação: um toque não foi reconhecido como vértice pelo SDK. A funcionalidade posterior do cenário não foi alcançada; causa ainda não determinada. Error: O SDK não recebeu o vértice 2.  O SDK não recebeu o vértice 2.  expect(received).toBe(expected) // Object.is equality  Expected: 2 Received: 1  Call Log: - Timeout 5000ms exceeded while waiting on the predicate |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 33,51 s | Verificações concluídas. |

## Selenium

### Web

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/web/selenium/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/web/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,01 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 4,51 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,09 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 5,88 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,35 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,99 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 5,44 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,63 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,86 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 12,23 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 2,24 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ✅ Passou | 11,03 s | Verificações concluídas. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 6,33 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,92 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,51 s | Verificações concluídas. |

### PWA instalado

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/selenium/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 3,71 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 5,56 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 4,43 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 6,28 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 4,77 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,52 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 6,85 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,81 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 6,48 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 12,36 s | Referência DOM obsoleta durante leitura; espera abortou sem tratar a atualização transitória. Falha de automação; etapas posteriores não concluídas. stale element reference: stale element not found in the current frame   (Session info: chrome=155.0.8059.82) |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 8,05 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 7,69 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 8,81 s | Verificações concluídas. |

### Electron

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/electron/selenium/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/electron/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 2,20 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 3,95 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 3,23 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 5,08 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 3,63 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 4,27 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 4,91 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 6,83 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 5,06 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 10,82 s | Referência DOM obsoleta durante leitura; espera abortou sem tratar a atualização transitória. Falha de automação; etapas posteriores não concluídas. stale element reference: stale element not found in the current frame   (Session info: chrome=152.0.7977.130) |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,93 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,87 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 7,08 s | Verificações concluídas. |

### APK Android

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/android/selenium/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/android/selenium.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 26,11 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ❌ Falhou | 23,25 s | Esgotou a espera de contagem de vértices na preparação do desenho; valor observado não registrado. Cenário não concluído; causa não determinada. Wait timed out after 5195ms |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 42,12 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 48,47 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ❌ Falhou | 31,90 s | Driver rejeitou coordenadas fora da viewport aceita. Gesto não exercitado; falha da interação automatizada, sem comprovar erro da regra de negócio. move target out of bounds   (Session info: chrome=133.0.6943.137) |
| C06 cancela alterações de nome e geometria | ✅ Passou | 46,30 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 52,68 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 85,57 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 44,97 s | Verificações concluídas. |

## WebdriverIO

### Web

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/web/webdriverio/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/web/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 7,41 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 10,60 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 6,81 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 7,84 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 6,16 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 5,72 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 8,20 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 11,51 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 7,13 s | Verificações concluídas. |
| C10 mouse deve abrir as instruções de instalação | ❌ Falhou | 11,79 s | Defeito intencional detectado: clique não abre a instalação. |
| C10 touch deve abrir as instruções de instalação | ✅ Passou | 3,30 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 17,11 s | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 11,15 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 9,90 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 11,09 s | Verificações concluídas. |

### PWA instalado

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/webdriverio/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/pwa/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 4,01 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 8,23 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 6,01 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 8,02 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 6,81 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 6,16 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 7,65 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 7,47 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 4,41 s | Verificações concluídas. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ❌ Falhou | 14,27 s | Falhou na seleção inicial entre as janelas; as operações seguintes de D01 não foram alcançadas. Expect $(`[data-testid="polygon-map-label"].is-selected`) to have text  Expected: "Polígono 1" Received: "Polígono 2" |
| D02 reúne pela principal e separa novamente sem duplicar dados | ✅ Passou | 5,48 s | Verificações concluídas. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ✅ Passou | 5,63 s | Verificações concluídas. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ✅ Passou | 6,72 s | Verificações concluídas. |

### Electron

⛔ A ferramenta encerrou sem produzir relatório. ChromeDriver não encontrou DevToolsActivePort; a sessão Electron não foi criada. [Log](../../../test-results/pocs/metrics-2026-10-19-run2/electron/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C04 move a área, arrasta um vértice, insere outro e salva | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C05 valida nomes, acentos e limite de trinta caracteres | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C06 cancela alterações de nome e geometria | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D01 sincroniza seleção, criação, edição, cancelamento e exclusão em duas janelas | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D02 reúne pela principal e separa novamente sem duplicar dados | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D02 reúne pelo mapa e separa novamente sem duplicar dados | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |
| D03 fecha o mapa com edição pendente e recupera o último estado salvo | ⛔ Sem validação concluída | — | Sessão não disponível; cenário não executado. |

### APK Android

[JSON com durações e evidências](../../../test-results/pocs/metrics-2026-10-19-run2/android/webdriverio/results.json) · [Log completo](../../../test-results/pocs/metrics-2026-10-19-run2/android/webdriverio.log)

| Teste | Resultado | Duração | Observação |
| --- | --- | --- | --- |
| C01 cria um polígono válido com três vértices e rótulo | ✅ Passou | 20,24 s | Verificações concluídas. |
| C02 bloqueia desenhos vazios, incompletos e sem área | ✅ Passou | 39,32 s | Verificações concluídas. |
| C03 seleciona sem editar e permite edição por Enter ou botão | ✅ Passou | 34,55 s | Verificações concluídas. |
| C04 move a área, arrasta um vértice, insere outro e salva | ✅ Passou | 45,78 s | Verificações concluídas. |
| C05 valida nomes, acentos e limite de trinta caracteres | ✅ Passou | 84,79 s | Verificações concluídas. |
| C06 cancela alterações de nome e geometria | ✅ Passou | 41,04 s | Verificações concluídas. |
| C07 preserva nome e geometria ao fechar e reabrir a aplicação | ✅ Passou | 50,08 s | Verificações concluídas. |
| C08 confirma e cancela exclusões por Delete, individuais e de todos | ✅ Passou | 79,00 s | Verificações concluídas. |
| C09 aplica zoom, gira a bússola e retorna ao norte | ✅ Passou | 38,60 s | Verificações concluídas. |
