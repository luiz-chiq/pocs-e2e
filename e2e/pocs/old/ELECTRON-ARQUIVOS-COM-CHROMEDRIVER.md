> **RELATÓRIO HISTÓRICO — RESULTADOS SUBSTITUÍDOS.** Rodada anterior à tentativa sem ChromeDriver. Consulte o [relatório atual](../RELATORIO.md) e a [rodada de arquivos atual](../ELECTRON-ARQUIVOS.md).

# Electron — importação e exportação pelo processo principal

Executado de 2026-10-19T20:12:09.050Z a 2026-10-19T20:12:25.773Z. Evidência: [resultados JSON](../../../test-results/pocs/electron-files-verified/results.json).

## Sumário

- [Resumo](#resumo)
- [Testes por ferramenta](#testes-por-ferramenta)
- [Implementação e limites](#implementação-e-limites)

## Resumo

Esta é uma rodada adicional da nova funcionalidade Electron. Seus casos N01–N05 são separados do consolidado histórico de 150 testes; web, PWA e Android não foram reexecutados nesta rodada.

| Ferramenta | Passou | Falhou | Não executado | Soma das durações | Aumento sobre o menor tempo |
| --- | --- | --- | --- | --- | --- |
| Playwright | 5 | 0 | 0 | 6.84 s | 48.61% |
| Selenium | 5 | 0 | 0 | 4.60 s | 0.00% |
| WebdriverIO | 5 | 0 | 0 | 5.17 s | 12.21% |

Cada duração inclui lançamento de um app empacotado com perfil novo, cenário e encerramento. A soma exclui build e trabalho externo do runner; não equivale ao tempo do comando das suítes antigas. Percentual: (soma ÷ menor soma − 1) × 100, somente com os cinco casos registrados nas três ferramentas. Uma execução não estabelece um benchmark de desempenho.

## Testes por ferramenta

### Playwright

| Cenário | Resultado | Duração |
| --- | --- | --- |
| N01 importa e exporta nomes e coordenadas usando IPC e disco real | Passou | 2.48 s |
| N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos | Passou | 0.97 s |
| N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente | Passou | 1.00 s |
| N04 informa erros de leitura e escrita sem perder dados nem deixar temporários | Passou | 0.90 s |
| N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados | Passou | 1.50 s |

### Selenium

| Cenário | Resultado | Duração |
| --- | --- | --- |
| N01 importa e exporta nomes e coordenadas usando IPC e disco real | Passou | 0.97 s |
| N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos | Passou | 0.78 s |
| N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente | Passou | 0.79 s |
| N04 informa erros de leitura e escrita sem perder dados nem deixar temporários | Passou | 0.71 s |
| N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados | Passou | 1.36 s |

### WebdriverIO

| Cenário | Resultado | Duração |
| --- | --- | --- |
| N01 importa e exporta nomes e coordenadas usando IPC e disco real | Passou | 1.01 s |
| N02 cancelar abertura e salvamento preserva os polígonos e não cria arquivos | Passou | 0.87 s |
| N03 rejeita JSON, nomes e geometrias inválidos sem importar parcialmente | Passou | 0.93 s |
| N04 informa erros de leitura e escrita sem perder dados nem deixar temporários | Passou | 0.84 s |
| N05 importa com duas janelas, acrescenta áreas, exporta e reúne sem perder dados | Passou | 1.52 s |

## Implementação e limites

- Botões disponíveis somente no Electron, no rodapé do menu. Importar acrescenta áreas, gera IDs novos e sincroniza com a janela do mapa. Exportar salva todas as áreas confirmadas. Ambos ficam desabilitados durante desenho/edição.
- O renderer chama duas funções restritas do preload/contextBridge. O processo principal valida a origem IPC e os dados, abre os diálogos e lê/grava por Node fs. A página não recebe caminhos arbitrários nem acesso ao Node.
- JSON próprio, formato poligonos, versão 1, nome e geometria ArcGIS (rings/spatialReference). Não é GeoJSON. Nomes de 1 a 30 caracteres, letras/números/espaços e acentos; mínimo de três pontos distintos formando área e anéis fechados. Referências 4326/3857/102100/102113; até 10 MB, 1.000 polígonos e 100.000 pontos por arquivo. Não verifica todas as regras topológicas, como auto-interseções.
- Gravação real por arquivo temporário e rename; falhas não substituem o destino e limpam temporários. Importação só altera a coleção após validar todo o arquivo.
- Os três clientes usam as mesmas funções de cenário e asserções em TypeScript, com adaptadores de clique, leitura e troca de janela próprios. Playwright lança por _electron; Selenium e WDIO remoto usam ChromeDriver compatível. Não se utiliza o serviço Electron do WDIO nem se executa código arbitrário no main via WebDriver. O efeito do main é verificado por arquivos reais e auditoria de chamadas no processo browser.
- Apenas a resposta de seleção/cancelamento do diálogo é simulada, por plano local habilitado exclusivamente no pacote POC (polygonE2E=true) e variável POLYGON_E2E_DIALOG_PLAN. A build normal não habilita esse plano. Abertura visual, navegação e interação com o seletor nativo do sistema **não foram automatizadas**.
- Testado em macOS arm64. Windows/Linux, instalador e diálogos reais continuam sem validação nesta rodada. As duas janelas foram testadas no mesmo computador, sem exigir dois monitores físicos.
- Validação complementar: seis testes Node do serviço cobrem formato/geometria, disco real, cancelamento, tamanho, preservação do destino quando rename falha, rejeição de origens/subframes IPC e bloqueio de operações simultâneas.

Para repetir: npm run electron:build:poc e npm run test:poc:electron:files. Testes do serviço: npm run test:electron:files.
