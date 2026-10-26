# Portabilidade entre Playwright e Selenium

As duas POCs C/D têm implementações independentes em TypeScript. Catálogo,
critérios, seletores, fixtures e parte da infraestrutura são compartilhados;
interações, esperas, asserções, sessões e evidências são adaptadas por ferramenta.
Não houve conversão automática nem um executor universal.

| Parte | Reaproveitamento |
| --- | --- |
| Catálogo e critérios | [Fixtures comuns](shared/fixtures.ts) |
| Implementação da UI | [Playwright](playwright/web.spec.ts) e [Selenium](selenium/web.test.ts) |
| Lançamento e persistência | [Fixtures Playwright](playwright/fixtures.ts), adaptadores Selenium e helpers comuns |
| PWA | Instalação/lançamento via protocolo e perfis isolados; janela standalone real |
| Electron | Playwright `_electron`; Selenium/ChromeDriver na suíte C/D |
| Android | Playwright conecta à WebView; Selenium usa Appium/UiAutomator2 |

Dentro de uma ferramenta, os cenários são reutilizados entre plataformas com
adaptações de lançamento, toque, teclado e janelas. Isso não torna iguais os
intervalos de gestos, esperas ou custos de sessão; métricas precisam considerar
essas diferenças. Não foram medidos percentual de reutilização ou esforço de
migração em horas.

## Cenários de arquivos Electron

N01–N05 usam as mesmas funções de cenário e asserções, com adaptadores para
Playwright e Selenium. Os arquivos reais, nomes, coordenadas, cancelamentos,
rejeições e sincronização são conferidos. Na modalidade sem ChromeDriver,
Playwright acessa o main diretamente; Selenium/Mac2 continua pendente do
ambiente e da adaptação dos seletores nativos.

## Integração Android

[Playwright + Appium](android-hybrid.test.ts) agora usa
[Selenium JS como cliente nativo](shared/appium-native.ts). O adaptador traduz
as operações utilizadas pelo protótipo para endpoints Appium: selecionar um
elemento Android, clicar, voltar, consultar pacote/contexto, alterar settings e
salvar screenshots. Isso permite retirar a dependência da ferramenta arquivada
sem alterar os critérios dos oito cenários H01–H08.

Os testes de contrato do adaptador usam um servidor simulado. Os fluxos completos
no emulador ainda precisam de revalidação; o resultado antigo não foi transferido
como aprovação da implementação nova.

O material completo da comparação anterior permanece na branch
`codex/poc-tres-ferramentas`, commit `98f49f5`.
