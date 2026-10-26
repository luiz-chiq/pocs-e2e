# Diagnóstico comparado: Playwright e Selenium

Demonstração real em 26/10/2026 às 07:28 (São Paulo), no app web local. As execuções C10 usam a mesma regra de aceitação e o mesmo handler do botão. Nenhuma mudança no aplicativo foi feita para produzir a falha.

## Resultado

| Ferramenta | C10 mouse | C10 touch |
| --- | --- | --- |
| Playwright | Falhou, como esperado pelo defeito intencional | Passou |
| Selenium | Falhou, como esperado pelo defeito intencional | Passou |

As duas suítes encerraram com código 1, pois o cenário mouse exige funcionamento. Ele não foi invertido com expectedFailure. Os registros de entrada confirmam `pointerType: mouse/touch` e `isTrusted: true` nas duas ferramentas. A consulta SHA-256 confirmou que `src/pwa.ts` não mudou entre as execuções.

A tentativa Selenium de uma rodada anterior atravessou uma interrupção e terminou cancelada por tempo limite. Ela permanece separada em `test-results/diagnostics/2026-10-26T060053Z/interrupted-selenium/` e foi excluída desta comparação.

## Abrir as evidências

- [Comparação visual HTML](../../test-results/diagnostics/2026-10-26T102710Z/index.html)
- [Relatório HTML nativo do Playwright](../../test-results/diagnostics/2026-10-26T102710Z/playwright/html/index.html)
- [Trace do caso com falha](../../test-results/diagnostics/2026-10-26T102710Z/playwright/artifacts/web-C10-mouse-deve-abrir-as-instruções-de-instalação/trace.zip)
- [Log Playwright](../../test-results/diagnostics/2026-10-26T102710Z/playwright.log) e [JSON Playwright](../../test-results/diagnostics/2026-10-26T102710Z/playwright/results.json)
- [Screenshot Selenium](../../test-results/diagnostics/2026-10-26T102710Z/selenium/C10-mouse-deve-abrir-as-instru-es-de-instala-o-window-0.png), [log Selenium](../../test-results/diagnostics/2026-10-26T102710Z/selenium.log) e [JSON Selenium](../../test-results/diagnostics/2026-10-26T102710Z/selenium/results.json)
- [Entradas Playwright](../../test-results/diagnostics/2026-10-26T102710Z/playwright/input-events.json) e [entradas Selenium](../../test-results/diagnostics/2026-10-26T102710Z/selenium/input-events.json)
- [Comandos e metadados](../../test-results/diagnostics/2026-10-26T102710Z/execution.json)

Essas evidências são locais, ignoradas pelo Git. O documento descreve uma rodada adicional de diagnóstico; não substitui os relatórios C/D anteriores. Os tempos incluem preparação e a espera pela falha intencional, e não medem velocidade de diagnóstico humano ou desempenho comparativo.

## Playwright: investigar após o teste

O trace registrou o clique, a espera pelo diálogo, snapshots do DOM, frames da tela, mensagens de console e requisições de rede. O relatório HTML foi habilitado nesta rodada com o reporter integrado, sem instalar outra dependência. O JSON também inclui os eventos de entrada anexados pela POC.

1. Abra o relatório HTML e escolha **C10 mouse**.
2. Abra o trace. Localize a ação de clique em `[data-testid="install-app"]`.
3. Inspecione o ponto do clique e os snapshots antes/depois; avance à asserção sobre `#install-dialog`.
4. O erro informa **Expected: visible / Received: hidden**, o seletor e as tentativas de verificação.
5. Confira o anexo `input-events`: o mouse foi recebido como evento confiável.

Erro real:

```text
Error: O botão deve responder à interação e abrir as instruções.

expect(locator).toBeVisible() failed

Locator:  locator('#install-dialog')
Expected: visible
Received: hidden
Timeout:  10000ms

Call log:
  - O botão deve responder à interação e abrir as instruções. locator('#install-dialog') with timeout 10000ms
  - waiting for locator('#install-dialog')
    24 × locator resolved to <dialog id="install-dialog" aria-labelledby="install-dialog-title" aria-describedby="install-dialog-description">…</dialog>
       - unexpected value "hidden"
```

Para abrir novamente:

```bash
npx playwright show-report test-results/diagnostics/2026-10-26T102710Z/playwright/html --host 127.0.0.1 --port 9324
```

## Selenium: investigar com os artefatos capturados

O runner atual registra resultado, mensagem de erro, duração, screenshot por janela e eventos da POC; o log do Node preserva a stack. Não grava sequência de comandos, snapshots intermediários do DOM, console ou rede nesta configuração.

1. Abra `selenium.log` e identifique a espera que expirou.
2. Consulte o screenshot: as instruções não apareceram.
3. Consulte `input-events.json`: o clique de mouse foi recebido.
4. Compare com C10 touch, aprovado. Para entender estados intermediários adicionais, reproduza com breakpoints ou adicione coleta ao runner.

Erro real:

```text
O botão deve responder à interação e abrir as instruções.
Wait timed out after 10157ms
```

A instrumentação que registra `pointerType` e `isTrusted` foi escrita para esta POC e é usada pelas duas ferramentas. A captura de screenshot Selenium também foi implementada no runner; o painel comparativo é uma apresentação dessas evidências, não uma interface nativa do Selenium.

## Causa e limites da comparação

O guard em [src/pwa.ts](../../src/pwa.ts) encerra o handler para entradas diferentes de touch. Os resultados demonstram que ambas detectam o mesmo defeito; o trace Playwright concentra mais contexto para investigação posterior. O trace não descobre sozinho a causa: ela foi confirmada pela leitura do handler.

O mapa ArcGIS usa canvas/WebGL. Nesta execução o Trace Viewer mostrou o canvas com conteúdo desabilitado no snapshot do DOM; esse snapshot não reconstitui sozinho a imagem do mapa ou comprova geometria. Os screenshots/frames reais e as consultas de coordenadas continuam necessários para investigar desenhos nas duas ferramentas.

Selenium pode coletar console e rede via BiDi/CDP, conforme o navegador e ambiente, e combinar outras integrações. Isso exige instrumentação e configuração adicionais; esta demonstração não representa um limite absoluto da ferramenta. Não foram comparados Selenium Grid, gravação de vídeo, plataformas nativas ou extensões externas de relatórios.

Fontes: [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer), [Selenium WebDriver BiDi](https://www.selenium.dev/documentation/webdriver/bidi/).
