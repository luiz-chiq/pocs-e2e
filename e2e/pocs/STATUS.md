# Estado das POCs

O [relatório da rodada atual](RELATORIO.md) é a referência por ferramenta,
plataforma e teste, incluindo falhas funcionais, falhas de preparação e
cenários que não puderam ser executados. Ele é atualizado durante a execução.

As três ferramentas incluem D01, D02 pela principal, D02 pelo mapa e D03 nas
suítes completas web, PWA instalado e Electron. Android executa C01–C09,
com controles de toque e sem a funcionalidade de separar mapa.

A primeira rodada está preservada em
[RELATORIO-2026-10-19-PRIMEIRA-RODADA.md](RELATORIO-2026-10-19-PRIMEIRA-RODADA.md).
Na revalidação, Selenium/Electron aprovou os 13 testes no aplicativo empacotado,
incluindo as quatro verificações de duas janelas. No APK Android, as suítes
completas terminaram: Playwright 8/9, Selenium 9/9 e WebdriverIO 8/9.
Foram corrigidos preparação, descoberta de WebView, tratamento do teclado
e espera da desseleção. C08 do WebdriverIO passou após essa última correção.

Restam duas falhas: Playwright/C03 não conseguiu criar o polígono inicial
(três toques confiáveis no mapa, dois vértices confirmados); WebdriverIO/C05
mostrou a validação no campo, mas não o aviso esperado no topo. As etapas
seguintes desses cenários não foram alcançadas; causas não determinadas.
O relatório inclui durações individuais, evidências e tabela-resumo das
12 combinações de ferramenta/plataforma. Web/PWA e as demais ferramentas
no Electron mantêm os resultados anteriores, identificados como tal.

O PWA é instalado de verdade em um perfil isolado, com verificação de
`display-mode: standalone`. A instalação pessoal do usuário não é usada.
No Electron, o Playwright registrou `app.isPackaged: true` e a origem segura
`poligonos://app/`. Duas janelas simultâneas exercitam a sincronização;
não foi feita validação com dois monitores físicos nem de instalador Windows.

A [validação inicial web](RESULTADOS-WEB.md) é histórica e foi realizada antes
da inclusão dos cenários de duas janelas nas três ferramentas. Logs, JSON,
traces e screenshots da rodada atual ficam em
`test-results/pocs/revalidation-2026-10-19/`, fora do Git.
