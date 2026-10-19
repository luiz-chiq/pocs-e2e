# Validação das POCs web

Registro histórico da primeira etapa, anterior aos testes de duas janelas.
O estado da suíte atual está em [STATUS.md](STATUS.md).

Data: 17/10/2026. Endereço: https://poc-e2e.chiquetano.com.br/.

Ambiente validado: navegador Chrome 155.0.8059.82, macOS, Node.js 24.11.0.
Ferramentas: Playwright 1.63.0, WebdriverIO 9.31.9 e Selenium 4.51.0.
As suítes completas foram executadas individualmente contra o deploy.

| Ferramenta | Aprovados | Reprovados | Falha observada |
| --- | ---: | ---: | --- |
| Playwright | 10 | 1 | C10 mouse: o botão ignora o clique e não abre as instruções. |
| WebdriverIO | 10 | 1 | C10 mouse: o botão ignora o clique e não abre as instruções. |
| Selenium | 10 | 1 | C10 mouse: o botão ignora o clique e não abre as instruções. |
| Total | 30 | 3 | O mesmo defeito intencional detectado pelas três ferramentas. |

Cada suíte cobre os dez cenários C01–C10 do plano; C10 tem duas execuções,
mouse e touch. C01–C09 e C10 touch passaram em todas as ferramentas.
O código de saída das suítes foi 1 porque C10 mouse está reprovado.
O defeito continua no aplicativo e a expectativa do teste continua exigindo
que o clique funcione.

C07 foi validado fechando e reabrindo o processo do navegador com o mesmo
perfil de automação, preservando nome e coordenadas previamente editados.
C08 inclui as escolhas de restaurar e excluir após Delete durante a edição.

## Evidências locais

- [Playwright: resultados](../../test-results/pocs/playwright/results.json).
- [WebdriverIO: resultados](../../test-results/pocs/webdriverio/results.json).
- [Selenium: resultados](../../test-results/pocs/selenium/results.json).
- [Playwright: verificação do registro de entradas mouse/touch](../../test-results/pocs/report-validation/playwright/results.json).

Os relatórios JSON referenciam screenshots de falha; o Playwright também
mantém traces. Os arquivos gerados em `test-results/` são locais e ignorados
pelo Git. Os comandos individuais substituem seus resultados anteriores.
O comando conjunto cria uma pasta por execução para preservar o histórico.

Em C10, a automação controla o pré-requisito de ausência de oferta nativa de
instalação. O teste valida a resposta do botão ao ponteiro, com eventos
confiáveis do navegador; a instalação efetiva do PWA será validada na etapa
do PWA instalado.

## Executar novamente

```bash
npm run test:poc:web
```

Consulte [as instruções das POCs](README.md) para execução por ferramenta,
mudança de URL e acompanhamento visual.

A matriz foi ampliada posteriormente: D01–D03 também fazem parte do navegador,
além de PWA instalado e Electron. Este relatório não inclui essa cobertura
nem comprova aprovação dos ambientes nativos.
