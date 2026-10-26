# Plano das POCs E2E

Comparar Playwright e Selenium usando os mesmos critérios de
aceitação. Cada ferramenta terá sua implementação e configurações por ambiente:
navegador, PWA instalado, Electron e Android via Capacitor.

Este documento define a cobertura proposta. Não representa testes implementados
ou executados nos dois frameworks e nos quatro ambientes.

Os cenários web C01–C10 já têm implementações independentes nas duas ferramentas
em `e2e/pocs/`, com duas execuções para C10 (mouse e touch). Consulte
`e2e/pocs/README.md` para execução e limites dessa primeira etapa.

## Cobertura principal

| ID | Cenário | Resultado esperado |
| --- | --- | --- |
| C01 | Criar polígono válido | Desenhar pelo mapa com pelo menos três vértices, concluir e conferir card, contagem, vértices e nome no mapa. |
| C02 | Impedir desenho inválido | Tentar concluir com zero, um ou dois vértices e com pontos colineares; mostrar alerta e não salvar um polígono inválido. |
| C03 | Selecionar e iniciar edição | Selecionar pelo card sem editar automaticamente; tocar no desenho no mapa inicia edição. Também permitir botão ou Enter, onde houver teclado. |
| C04 | Editar geometria | Mover a área, arrastar um vértice e inserir outro; concluir e conferir as coordenadas resultantes. |
| C05 | Renomear e validar nome | Aceitar letras com acentos, números e espaços; validar nome vazio, símbolos e limite de 30 caracteres. Conferir nome no card e no mapa. |
| C06 | Cancelar edição | Alterar nome e geometria, cancelar e conferir que ambos voltam ao último estado salvo. |
| C07 | Persistir dados | Criar e editar, fechar e reabrir o app e conferir os dados salvos. Recarregar a página é uma verificação complementar. |
| C08 | Excluir polígonos | Validar confirmação e cancelamento na exclusão individual e de todos. No desktop, incluir Delete durante a edição e as escolhas ao concluir. |
| C09 | Navegar no mapa | Validar zoom, rotação e retorno ao norte; conferir que os nomes acompanham as áreas. |
| C10 | Detectar defeito de interação na instalação | Exigir funcionamento por mouse e toque onde o controle estiver disponível. Com o defeito intencional atual, mouse deve falhar e toque deve passar. |

C10 não se aplica ao PWA já instalado, Electron ou Android nativo, pois o botão
de instalação fica oculto nesses ambientes. O teste deve detectar o defeito,
sem tratar o clique ignorado como comportamento correto.

## Duas telas: navegador, PWA instalado e Electron

As duas POCs devem executar os cenários abaixo nesses três ambientes.
Android nativo fica fora desta cobertura adicional, pois não oferece separar mapa.

### D01 — Operar as duas janelas com sincronização bidirecional

1. Criar um polígono e separar o mapa.
2. Conferir que a lista permanece na janela principal e o mapa aparece na
   auxiliar, preservando o polígono existente.
3. Selecionar o card na principal: destacar a mesma área na auxiliar sem
   iniciar edição. Tocar em outra área no mapa: atualizar o card e iniciar a edição;
   cancelar essa edição antes da próxima criação.
4. Iniciar a criação pela principal, desenhar na auxiliar e concluir pela
   principal. Conferir o novo card e o rótulo no mapa.
5. Editar pela principal, alterar nome e geometria na auxiliar e salvar.
   Conferir o mesmo nome, coordenadas e estado de edição nas duas janelas.
6. Fazer outra edição e cancelar pela janela oposta à que iniciou a operação.
   Conferir a restauração de nome e geometria em ambas.
7. Solicitar exclusão pela principal: cancelar uma vez e depois confirmar.
   Conferir a remoção do card, da área e do rótulo, sem itens duplicados.

As ações devem alternar entre as duas janelas da mesma sessão, mantidas abertas
durante o cenário. A geometria deve ser alterada por gestos reais da ferramenta.

### D02 — Reunir e separar novamente sem perder ou duplicar dados

1. Separar o mapa, criar e editar um polígono e confirmar as alterações.
2. Reunir as telas e conferir que a janela auxiliar fecha e o mapa volta à
   principal com nome e geometria salvos.
3. Separar novamente e conferir a mesma quantidade de polígonos, sem duplicação.
4. Conferir que a sincronização continua funcionando após a nova separação.

Executar em duas variações independentes: reunir pelo botão da principal e
reunir pelo botão da auxiliar.

### D03 — Recuperar o mapa ao fechar a janela auxiliar

1. Criar um polígono, salvar e separar o mapa.
2. Alterar nome e geometria sem confirmar.
3. Fechar a janela auxiliar pelo mecanismo de fechamento da janela.
4. Conferir que o mapa volta à principal com o último nome e geometria salvos,
   sem edição ativa ou controles presos.
5. Separar novamente e conferir que é possível continuar operando.

## Matriz de execução

| Ambiente | C01–C09 | C10 | D01–D03 |
| --- | --- | --- | --- |
| Navegador | Sim | Mouse e toque, quando instalação estiver disponível | Sim |
| PWA instalado desktop | Sim | Não se aplica | Sim |
| Electron desktop | Sim | Não se aplica | Sim |
| Android Capacitor | Sim, adaptando atalhos para controles touch | Não se aplica | Fora do escopo |

São dez cenários principais e três adicionais de duas telas. Variações e
parametrizações devem ser identificadas no relatório, pois podem gerar mais
de treze execuções por ferramenta.

## Critérios de execução e comparação

- Aplicar a mesma matriz às duas ferramentas; registrar limitações de ambiente
  e dependências adicionais separadamente de falhas funcionais.
- Validar o PWA em uma janela realmente instalada. Abrir uma página comum ou
  simular `display-mode: standalone` não comprova essa execução.
- Validar Electron em janelas reais do aplicativo; distinguir execução local
  de validação do aplicativo empacotado.
- Duas janelas abertas validam a sincronização. Posicioná-las em dois monitores
  físicos é uma verificação manual complementar de usabilidade.
- Isolar os dados por teste e não depender da execução de um cenário anterior.
- Usar seletores compartilhados, gestos da ferramenta e esperas pelo estado
  observado. Não alterar o estado do aplicativo por JavaScript para simular
  a interação que está sendo avaliada.
- Em falhas de duas telas, capturar as duas janelas e identificar em qual delas
  a ação ocorreu e em qual a atualização esperada não apareceu.
- Comparar esforço de configuração, tempo, estabilidade, evidências e detecção
  do defeito intencional. Não apresentar cenário não executado como aprovado.

## Ponto de partida existente

`e2e/playwright/detached-map.spec.ts` já contém verificações de duas janelas em
um contexto de navegador. Essa suíte serve como referência de comportamento;
as evidências das últimas execuções e os fluxos nativos adicionais têm
escopos separados. Consulte [`e2e/pocs/STATUS.md`](e2e/pocs/STATUS.md) para a
cobertura verificada e as pendências.

A implementação das três ferramentas anterior à remoção está na branch
`codex/poc-tres-ferramentas` (`98f49f5`). A main mantém somente as duas alternativas atuais.
