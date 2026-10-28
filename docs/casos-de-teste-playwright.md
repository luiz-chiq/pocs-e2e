# Casos de teste — Playwright

Plano baseado nas funcionalidades atuais da aplicação React/TypeScript.
Atualizado em 27/10/2026. **Todos os casos estão planejados, sem execução nesta etapa.**

## Sumário

1. [Escopo e ambiente](#escopo-e-ambiente)
2. [Primeira rodada](#primeira-rodada)
3. [Preparação e critérios de verificação](#preparação-e-critérios-de-verificação)
4. [Polígonos e edição](#polígonos-e-edição)
5. [Teclado, persistência e apresentação](#teclado-persistência-e-apresentação)
6. [Duas janelas](#duas-janelas)
7. [Instalação e PWA](#instalação-e-pwa)
8. [Extensão para Electron e Android](#extensão-para-electron-e-android)
9. [Implementação e resultados futuros](#implementação-e-resultados-futuros)

## Escopo e ambiente

Começar pela **build web em `http://localhost:4173`**, usando `yarn build` e
`yarn preview`. A aplicação deve estar acessível e o mapa pronto antes de cada
ação. As imagens de satélite continuam dependendo de internet.

Esta etapa define os casos; não instala Playwright, não recupera as suítes antigas
e não altera o comportamento da aplicação. A implementação nova poderá ser feita
em TypeScript.

As duas janelas fazem parte da primeira fase web. Elas devem ser abertas pelo
botão real **Separar mapa**, dentro da mesma sessão do navegador. Não são dois
contextos isolados nem duas páginas abertas manualmente. Isso verifica a
sincronização entre janelas, sem exigir dois monitores físicos.

PWA instalado, Electron e Android têm cenários adicionais abaixo. Rodar a página
com viewport de celular ou simular o modo standalone não comprova a instalação
real do PWA. Importação e exportação nativas não estão disponíveis na versão web.

Prioridades: **P0** = integridade dos dados e fluxos essenciais; **P1** = regressão
funcional; **P2** = apresentação e robustez. A prioridade não representa resultado.

## Primeira rodada

Sugestão: implementar primeiro estes **12 casos lógicos**. Casos com variações
devem gerar execuções independentes; portanto, não serão necessariamente apenas
12 resultados no relatório.

| Ordem | Caso | O que deve demonstrar |
| --- | --- | --- |
| 1 | WEB-01 | Criar uma área válida e persistir após recarregar. |
| 2 | WEB-02 | Impedir desenhos vazios ou sem área válida. |
| 3 | WEB-04 | Selecionar e expandir são ações independentes. |
| 4 | WEB-05 | Editar pelo mapa e salvar a geometria. |
| 5 | WEB-08 | Área travada ignora o mapa e exige desbloqueio pela lista. |
| 6 | WEB-10 | Excluir uma área somente depois da confirmação. |
| 7 | WEB-12 | Delete em vértice não solicita exclusão da área. |
| 8 | WEB-16 | Fundir sobreposição de mesma cor. |
| 9 | WEB-17 | Preservar áreas que não devem se fundir. |
| 10 | WIN-01 | Separar janelas e apresentar os controles nos lugares corretos. |
| 11 | WIN-02 | Criar áreas pelas duas janelas com sincronização. |
| 12 | PWA-01 | Detectar o defeito intencional de instalação com mouse. |

Depois dessa rodada, priorizar cancelamento/saída da edição, clonagem, nomes,
atalhos e os demais cenários de sincronização. O catálogo completo contém
26 casos WEB, 7 WIN, 3 PWA e 6 casos nativos futuros, antes das parametrizações.

## Preparação e critérios de verificação

- Cada execução começa com armazenamento limpo e atalhos habilitados, salvo
  quando o próprio caso verifica persistência. Uma falha não deve contaminar outra.
- Preparar polígonos pela interface em cada caso; helpers novos podem reutilizar
  gestos de desenho e seleção. Não injetar polígonos diretamente no controlador
  para substituir as ações que estão sendo testadas.
- Usar duas áreas separadas e cores diferentes como base para os fluxos gerais.
  Sobreposições e cores iguais devem ser deliberadas, para evitar fusões acidentais.
- Para edição, usar um quadrilátero suficientemente grande, com vértices afastados
  dos controles. Para fusão, usar retângulos com sobreposição conhecida. Manter
  viewport e posição inicial do mapa controladas; calcular gestos em relação ao
  mapa, sem depender de coordenadas absolutas da tela do computador.
- Acionar a interface por papéis e nomes acessíveis. Coordenadas de ponteiro são
  necessárias para o desenho no mapa. Aguardar condições observáveis, como mapa
  pronto, modal aberto, contagem e lista atualizadas; evitar esperas fixas.
- **Um card ou um nome visível não prova que há um desenho correto.** Combinar
  contagem, coordenadas da lista, presença visual da área e interação em um ponto
  interior. Na edição, comparar coordenadas antes/depois. Na fusão, conferir o
  contorno resultante, a remoção dos originais e pontos dentro e fora da união.
- Usar tolerância compatível com as coordenadas exibidas com cinco casas decimais.
  Capturas do mapa devem focar o desenho e evitar depender da imagem de satélite.
  Se os casos de geometria complexa exigirem precisão não exposta na interface,
  definir uma observação somente de leitura antes de implementá-los; ela ainda
  não existe como API de testes. Não declarar esses casos cobertos só pelo contador.
- Parametrizar alternativas de modal, teclas e dados inválidos como testes
  independentes. Recriar a mesma pré-condição para cada alternativa.

## Polígonos e edição

| ID / prioridade | Pré-condição e ações | Resultado esperado |
| --- | --- | --- |
| **WEB-01 / P0** Criar e persistir | Sem áreas, verificar estado vazio e **Apagar todos** desabilitado. Clicar **Criar**, marcar três pontos distintos não alinhados e confirmar. Recarregar. | Um polígono com nome automático, três vértices, área preenchida e rótulo no mapa; contador 1. Depois do reload, mesma geometria, cor e nome, sem duplicação. |
| **WEB-02 / P0** Rejeitar geometria inválida | Iniciar criação e tentar confirmar com: zero, um, dois pontos; pontos repetidos; três pontos alinhados. Repetir usando botão e Enter. No caso de dois pontos, mover o cursor antes de confirmar. | Exibir alerta e continuar criando, sem salvar nem aumentar o contador. O cursor não conta como terceiro ponto. Acrescentar pontos válidos permite concluir depois. |
| **WEB-03 / P0** Cancelar criação | Com uma área salva, iniciar outro desenho, adicionar pontos, trocar cor e marcar **Travar ao salvar**. Cancelar e recarregar. | Nenhuma nova área persistida; área anterior intacta. A linha de ações volta para Criar/Editar e Apagar todos. |
| **WEB-04 / P0** Seleção e expansão independentes | Com duas áreas, selecionar A pelo nome/card; expandir B pela seta; recolher B; selecionar B; deslocar o mapa e selecionar A novamente. | Selecionar destaca a área e enquadra com margem, sem expandir. Expandir/recolher só altera a lista de vértices, sem trocar seleção nem enquadramento. Seta à esquerda do nome. |
| **WEB-05 / P0** Editar pelo mapa | Com duas áreas destravadas, clicar/tocar dentro de A. Arrastar um vértice e confirmar; em execução separada, mover a área inteira. Recarregar. | Entrar diretamente em edição; menu mostra somente o conteúdo de A e linha de ações somente Confirmar/Cancelar. Geometria alterada persistida e B intacta. A edição tem contorno branco; seleção fora da edição tem brilho branco. |
| **WEB-06 / P0** Cancelar edição | Editar A; mudar vértice, nome, cor e bloqueio. Cancelar e recarregar. | Restaurar todos os valores salvos de A; nenhuma alteração em B nem fusão causada pelo rascunho. |
| **WEB-07 / P1** Nome e tooltip | Na edição, salvar nomes com letras, números, espaços e acentos. Variar comprimentos 23, 24, 29 e 30; tentar digitar/colar além de 30. Tentar vazio, só espaços e caracteres como `!`, `@`, `_`, `-`. Corrigir e salvar. | Aceitar até 30 caracteres; normalizar espaços e acentos. Tooltip de comprimento só a partir de 24; inválidos mostram orientação e impedem salvar. Campo sem label visual adicional; abaixo do limite e válido não há aviso. Nome salvo aparece na lista e dentro da área. |
| **WEB-08 / P0** Bloqueio de interação no mapa | Travar A pela lista. Clicar/tocar nela com e sem outra área selecionada; repetir durante edição de B. Selecionar A pela lista, tentar editar, destravar pelo cadeado e tentar novamente. | Mapa não seleciona nem edita A, nem interrompe B. Lista permite selecionar A, mas editar exige destravar. Estado indicado pelo cadeado e pela borda do card, sem tags redundantes. |
| **WEB-09 / P1** Bloqueio ao salvar | Criar e, separadamente, editar uma área marcando **Travar ao salvar**. Confirmar e recarregar. Repetir cancelando a ação. | Bloqueio só é persistido ao confirmar; cancelamento não grava o rascunho. Área salva travada obedece WEB-08. |
| **WEB-10 / P0** Confirmação antes da exclusão | Selecionar A e pedir exclusão pelo lixo, Delete ou Backspace, sem vértice selecionado. Em execuções separadas escolher Voltar, Esc ou confirmar. | A continua no mapa e na lista enquanto o modal está aberto. Voltar/Esc preservam; confirmar remove somente A e persiste a remoção. |
| **WEB-11 / P0** Excluir durante edição | Editar A e alterar geometria/nome. Sem vértice selecionado, pedir exclusão. Variar cancelar e confirmar. | Cancelar o modal mantém a edição pendente. Confirmar exclui A e encerra a edição, sem exigir uma segunda confirmação para salvar. |
| **WEB-12 / P0** Delete em vértice | Editar um quadrilátero, selecionar exatamente um vértice, pressionar Delete ou Backspace e confirmar a edição. Em outra execução, cancelar a edição. | Remover apenas o vértice, sem modal de exclusão da área. Ao confirmar, salvar triângulo válido; ao cancelar, restaurar quadrilátero. Durante digitação no nome, Delete/Backspace só editam o texto. |
| **WEB-13 / P0** Apagar todos | Com duas áreas, usar **Apagar todos**; cancelar e depois repetir confirmando. Recarregar. | Cancelar preserva ambas; confirmar limpa lista e mapa, contador 0 e estado vazio persistido. Não executar exclusão ao apenas abrir o modal. |
| **WEB-14 / P1** Clonar | Com A selecionada, clonar pelo botão e, separadamente, por C. Repetir a clonagem; incluir nome de 30 caracteres e origem travada. Recarregar. | Cópias com identidades distintas, mesma forma/cor/bloqueio, nomes de cópia distintos com até 30 caracteres. Posicionamento próximo sem sobreposição que provoque fusão. Original intacta; cópia selecionada e enquadrada. |
| **WEB-15 / P1** Paleta fixa | Criar/editar usando cada opção da paleta. Confirmar, reabrir edição e recarregar. Repetir a escolha por teclas 1–6 fora do campo de nome. | Exatamente Azul, Verde, Dourado, Vermelho, Roxo e Rosa; sem seletor de cor livre. Opção ativa, preenchimento, contorno e persistência correspondem à escolha. |
| **WEB-16 / P0** Fusão por mesma cor | Desenhar dois retângulos parcialmente sobrepostos de mesma cor e confirmar o segundo. Repetir gerando a sobreposição por edição de geometria e por troca de cor. Recarregar. | Uma área com a união real dos contornos, sem perder regiões nem virar simplesmente a caixa envolvente. Originais incorporados deixam de existir como áreas independentes; resultado persiste. |
| **WEB-17 / P0** Impedir fusão indevida | Variar: sobreposição com cores diferentes; mesma cor sem contato; mesma cor tocando só em vértice; mesma cor compartilhando só aresta. | Duas áreas independentes em todas as variantes. Quantidade, nomes e geometrias preservados. |
| **WEB-18 / P1** Fusão em cadeia e metadados | Preparar A e B separadas da mesma cor. Criar/editar C ligando as duas, com sobreposição positiva. Variar presença de integrante travada. Cancelar em execução separada. | União alcança as três áreas; mantém nome/identidade da área confirmada e bloqueio se alguma integrante estiver travada. Cancelar não funde. Expansão posterior: contornos côncavos e buracos, com verificação geométrica adequada. |

## Teclado, persistência e apresentação

| ID / prioridade | Pré-condição e ações | Resultado esperado |
| --- | --- | --- |
| **WEB-19 / P0** Esc e alterações pendentes | Editar A sem alterações e pressionar Esc. Repetir com alteração de geometria, nome, cor ou bloqueio, escolhendo cada opção do modal. Incluir criação com pontos. | Sem mudança: sair e desselecionar. Com mudança: Salvar e sair, Descartar e sair ou Continuar editando. Salvar valida antes de sair; descartar restaura; continuar/Esc no modal mantém edição. Ao sair, desselecionar. |
| **WEB-20 / P0** Trocar área durante edição | Alterar A e clicar/tocar B destravada no mapa. Exercitar Salvar e trocar, Cancelar edição e trocar, Continuar editando e Esc. Repetir salvar com nome inválido. | Nunca perder alterações silenciosamente. Salvar/descartar afetam apenas A e abrem B; continuar/Esc permanecem em A. Nome inválido impede salvar/trocar. |
| **WEB-21 / P1** Navegar na lista | Com três áreas, usar A; navegar com as quatro setas, inclusive nas extremidades; entrar em edição com E ou Enter. Usar D com foco na lista e fora dela. Repetir com área travada e lista vazia. | Foco/seleção seguem a lista e enquadram, sem expandir cards. E/Enter editam destravada. D só solicita exclusão na lista e mantém modal. Área travada não é editada; lista vazia não causa erro. |
| **WEB-22 / P1** Atalhos de ação e contexto | Usar N, E/Enter, C, L, Enter para confirmar; durante desenho/edição, Z e R e equivalentes Ctrl/⌘ para desfazer/refazer. Digitar essas letras no nome. | Ações correspondentes às descrições do modal de atalhos. Desfazer/refazer altera o desenho correto. Digitação não cria, clona, trava ou navega. L durante edição altera somente o bloqueio do rascunho. |
| **WEB-23 / P1** Desabilitar atalhos | Desligar o switch, tentar atalhos globais e do mapa; navegar com Tab e ativar botões. Recarregar e religar pelo switch/modal. | Preferência persiste. Atalhos de ação deixam de executar, inclusive Delete do SDK no mapa. Navegação acessível e controles continuam funcionando. Enter no card com atalhos desligados seleciona pela ativação do controle, sem iniciar edição. |
| **WEB-24 / P1** Navegação nos modais | Abrir configurações de atalhos e os modais de exclusão, troca e saída pendente; incluir instalação quando disponível. Usar quatro setas, Tab/Shift+Tab, Enter, Espaço e Esc conforme o controle. | Setas movem foco sem acionar decisões; Tab permanece no modal. Enter ativa botão focado; Espaço alterna checkbox. Esc fecha/cancela conforme o fluxo; não confirma exclusão. Fechar atalhos devolve foco ao botão de informações. |
| **WEB-25 / P0** Persistir somente dados confirmados | Salvar duas áreas com nomes, cores e bloqueios diferentes. Fazer/cancelar alterações e clonar/excluir conforme o cenário. Recarregar no mesmo contexto. | Recuperar exatamente o último conjunto confirmado: coordenadas, nomes, cores, bloqueios e quantidade; sem rascunhos, áreas excluídas ou duplicações. |
| **WEB-26 / P2** Mapa e apresentação | Dar zoom, girar por gesto e retornar norte pela bússola; repetir com +/− e 0. Selecionar área fora do enquadramento, expandir lista longa e exibir mensagem longa. | Área enquadrada com margem; rótulo permanece dentro dela. Rotação continua disponível. Zoom/bússola em coluna flutuante no alto à esquerda; mensagens não os encobrem. Menu com rolagem sempre visível, badge de vértices junto ao nome, cadeado/lixo alinhados; mapa sem borda azul ao receber foco. |

## Duas janelas

Todos os casos abaixo devem observar **as duas páginas**, aguardando a conexão e
o efeito remoto de cada ação. Em cada execução, preparar as próprias áreas.
Nas variantes bidirecionais, iniciar tanto pela janela de controles quanto pela
janela do mapa; a geometria é sempre desenhada na janela que contém o mapa.

| ID / prioridade | Pré-condição e ações | Resultado esperado |
| --- | --- | --- |
| **WIN-01 / P0** Separar e organizar | Com duas áreas salvas, clicar Separar mapa e aguardar janela conectada. Inspecionar ambas em repouso e durante criação/edição. | Mesmo conjunto de áreas, sem duplicação. Janela de controles: lista à direita, mensagens/atalhos/gerenciamento à esquerda. Janela do mapa: Reunir telas ao lado de Criar/Editar no canto inferior esquerdo, sem Apagar todos. Durante ação, essa linha tem somente Confirmar/Cancelar. |
| **WIN-02 / P0** Criar sincronizado | Separar; iniciar criação pelos controles, desenhar no mapa e confirmar pelos controles. Em execução separada, iniciar e confirmar pelo mapa. | Estado de criação, lista, contador e área sincronizados. Salvar uma vez cria exatamente uma área nas duas visões. Reunir e recarregar preservam o resultado. |
| **WIN-03 / P0** Editar, cancelar e travar | Selecionar/editar A pelos controles; mudar nome/cor/bloqueio e arrastar vértice no mapa. Confirmar; em outra execução, cancelar pela outra janela. Destravar pela lista. | Alterações e estado de edição coerentes nas duas páginas. Cancelar restaura todos os valores. Bloqueio passa a impedir interação no mapa; desbloqueio permite editar novamente. |
| **WIN-04 / P0** Exclusão, clonagem e fusão | Clonar pela lista ou por C no mapa. Excluir uma área pelo mapa e, separadamente, pela lista, incluindo cancelar o modal. Criar sobreposição de mesma cor. | Cópia, confirmação, cancelamento, exclusão e união aparecem nas duas páginas, sem comando duplicado, área fantasma ou contagem divergente. |
| **WIN-05 / P0** Reunir e abrir novamente | Reunir pelos controles e, em outra execução, pelo mapa. Separar de novo. Incluir tecla M com atalhos habilitados. | Fechar janela separada e restaurar mapa na principal com os dados confirmados. Nova separação conecta uma única janela e não duplica áreas nem listeners. Focar mapa direciona à janela existente. |
| **WIN-06 / P1** Fechamento inesperado | Fechar a janela do mapa manualmente, primeiro em repouso e depois com edição não salva. | Principal recupera o mapa e o último estado confirmado; edição pendente não é persistida silenciosamente. Controles não ficam esperando conexão indefinidamente. |
| **WIN-07 / P1** Preferências, avisos e reconexão | Desligar/ligar atalhos em uma janela e testar na outra. Produzir alerta de desenho inválido; exercitar modal de saída pela janela oposta. Em variante separada, recarregar a janela do mapa em repouso. | Preferência sincronizada; alerta aparece no espaço de mensagens adequado. Decisão de modal tem efeito único e coerente. Recarregar restabelece conexão e áreas confirmadas sem duplicação. |

## Instalação e PWA

O filtro `pointerType === 'touch'` em `src/hooks/usePwa.ts` é um **defeito
intencional mantido para a PoC**. O caso PWA-01 exige interação com mouse como
comportamento desejado e deve revelar a falha; não considerar “mouse não faz
nada” como sucesso. O resultado ainda não foi medido nesta rodada.

| ID / prioridade | Pré-condição e ações | Resultado esperado |
| --- | --- | --- |
| **PWA-01 / P0** Detectar bug de mouse | Navegador não instalado, botão de instalação visível. Clicar com mouse. Para automação determinística do handler, usar cenário controlado sem prompt pendente. | Deve abrir orientação de instalação; atualmente o filtro de toque impede a ação. Registrar como falha conhecida intencional, separada de regressões, sem omitir o caso do relatório. |
| **PWA-02 / P1** Comparar toque | Mesmo estado de PWA-01, mas em contexto com touch. Tocar realmente no botão, sem substituir por clique. | Abrir orientação ou acionar prompt disponível. Fecha corretamente e não bloqueia o app. Eventos controlados de instalação comprovam o fluxo da interface, não uma instalação real no SO. |
| **PWA-03 / P1** PWA instalado | Em etapa de ambiente própria, instalar/abrir o PWA real da build sob teste. Criar e persistir uma área; separar/reunir quando o ambiente suportar janelas. | Botão de instalação oculto e funcionalidades preservadas. Reexecutar WEB-01 e WIN-01 a WIN-07 nesse ambiente; não reutilizar resultados web como prova de execução no PWA instalado. |

## Extensão para Electron e Android

Planejar depois da primeira fase web. Reutilizar o catálogo de comportamento onde
a função existe; adaptar inicialização, observação e interações de plataforma.
Não presumir que a estratégia web automatiza seletores nativos de arquivos ou
diálogos de permissões. A integração necessária será definida antes da execução.
No Android, acesso por seletor de documentos pode usar concessão de URI, sem um
pedido genérico de armazenamento; testar a permissão realmente utilizada.

| ID / prioridade | Plataformas | Ações e resultado esperado |
| --- | --- | --- |
| **NAT-01 / P0** Exportação real | Electron, Android | Exportar áreas com nomes, cores e bloqueios diferentes. Escolher destino; conferir arquivo JSON realmente criado, formato/versão, coordenadas e atributos. No Electron, comprovar passagem pelo processo principal; no Android, pelo plugin nativo. Ver mensagem de sucesso sem arquivo válido não basta. |
| **NAT-02 / P0** Importação real | Electron, Android | Importar arquivo válido; conferir forma e atributos no mapa/lista e persistência. Repetir com áreas sobrepostas para aplicar a regra de fusão por cor, sem duplicações indevidas. |
| **NAT-03 / P0** Arquivo inválido | Electron, Android | Variar JSON malformado, formato/versão incorretos, nome inválido e geometria sem área. Rejeitar com mensagem clara e sem importação parcial nem alteração dos dados anteriores. |
| **NAT-04 / P1** Limites de arquivo | Electron, Android | Verificar os limites documentados por cada implementação. Para Electron: até 10 MB, 1.000 polígonos e 100.000 pontos; testar fronteira e excesso com arquivos preparados. Não assumir automaticamente os mesmos limites no Android sem conferir o plugin. |
| **NAT-05 / P0** Cancelamento e acesso negado | Electron, Android | Cancelar importação/exportação no seletor; negar o acesso solicitado quando houver. Manter dados, não anunciar sucesso e permitir tentar novamente. Na exportação negada/cancelada, não deixar arquivo parcial. |
| **NAT-06 / P1** Integração por plataforma | Electron, Android | No Electron, executar os casos de duas janelas também com importação refletida em ambas. No Android, executar fluxos aplicáveis com toque, retomada após seletor e arquivo reimportado; duas janelas não são requisito desta etapa Android. |

## Implementação e resultados futuros

Organização sugerida para a suíte nova: fluxos de polígonos, teclado/modais,
duas janelas e instalação, com helpers pequenos para desenhar, selecionar e
aguardar o mapa. Evitar um teste longo que dependa do sucesso dos anteriores.

Cada execução deve registrar ID, variante, plataforma, navegador/dispositivo,
versão/build, resultado e duração. Usar resultados distintos para passou,
falhou, não executado e não aplicável. Distinguir a falha intencional PWA-01
das falhas inesperadas; não transformar falta de ambiente em teste aprovado.

Nas falhas, guardar trace e captura; para duas janelas, capturar ambas. Reportar
tempo de cada teste e tempo total da suíte separadamente, informando workers,
retries e tempo de preparação. Não comparar tempos de plataformas diferentes
como se medissem o mesmo ambiente.
