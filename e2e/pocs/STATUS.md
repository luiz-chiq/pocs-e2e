# Estado das POCs

A matriz está em desenvolvimento. Resultados de subconjuntos e verificações
de inicialização não representam aprovação da suíte completa.

| Ambiente | Playwright | WebdriverIO | Selenium |
| --- | --- | --- | --- |
| Web C01–C10 | 10 aprovados; C10 mouse reprovado | 10 aprovados; C10 mouse reprovado | 10 aprovados; C10 mouse reprovado |
| Web D01–D03 (4 execuções) | Subconjunto com 4 aprovados | D02 nas duas variações e D03 aprovados; D01 aprovado em repetição isolada | 3 aprovados; D01 falhou |
| PWA realmente instalado | Subconjunto C01 e D01–D03: 5 aprovados | Adaptador implementado; falha de infraestrutura na execução parcial | Adaptador implementado; execução pendente |
| Electron local | Inicialização verificada; suíte pendente | Configuração implementada; suíte pendente | Driver preparado; suíte pendente |
| Android Capacitor | APK debug compilado; adaptador experimental e execução pendente | Adaptador da POC pendente | Adaptador da POC pendente |

O resultado inicial C01–C10 está em [RESULTADOS-WEB.md](RESULTADOS-WEB.md).
C10 mouse deve continuar falhando enquanto existir o defeito intencional;
C10 touch exige um evento touch confiável e passou nas três ferramentas.
C10 não se aplica aos ambientes que ocultam o botão de instalação.

Os testes de duas janelas foram acrescentados depois dessa etapa. Os resultados
acima são de execuções parciais durante o desenvolvimento; ajustes posteriores
nos testes exigem nova execução. Não há relatório completo da matriz atual.
D01 no WebdriverIO apresentou divergência de seleção e espera por alteração
de geometria, e passou em repetição após padronizar o tamanho da janela
auxiliar. No Selenium falhou a verificação de geometria; a correção equivalente
precisa de nova execução. A suíte inteira deve ser repetida para confirmar
estabilidade. A inicialização PWA no WDIO ainda apresenta falha de infraestrutura.

A instalação PWA validada usou Chrome 155 no macOS, uma instalação real em
perfil de automação e verificação de `display-mode: standalone`. O Electron
local abriu na origem segura `poligonos://app/`, com a API E2E disponível.
O instalador Windows, os testes no APK Android e a execução em dois monitores
físicos ainda não foram validados. Duas janelas abertas exercitam a sincronização sem exigir
dois monitores.

Próximos passos: confirmar D01 em WDIO/Selenium, repetir a suíte web completa,
executar PWA e Electron nas três ferramentas e concluir os adaptadores Android.
Relatórios, traces, perfis e screenshots são gerados em `test-results/` e não
são enviados ao Git. Cada nova execução deve preservar seu diretório e anotar
o commit testado para tornar o resultado reproduzível.
