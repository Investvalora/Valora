# Homologação local da quarta bateria

Executada em 11/11/2026 no navegador integrado, origem `http://127.0.0.1:5176`, com a sessão autenticada existente. Escopo: S4-01 a S4-04 da [TODO](TODO-quarta-bateria.md). Consulta da carteira Investidor10, sem salvar, editar ou excluir dados financeiros.

## Resultado dos roteiros

| Item | Verificação | Resultado |
| --- | --- | --- |
| S4-01 | Gráfico na rota real de Rentabilidade, desde o início | Tooltip em 06/09/2025 mostrou Carteira +9,85%, CDI +11,00%, IBOV +9,99% e IFIX +9,93%; valores independentes e data completa. |
| S4-01 | Trocar período para 1M e aguardar atualização | Janela passou para 11/10 a 31/10/2026; tooltip de 19/10 mostrou -1,28%, +0,25%, -1,91% e -0,79%, respectivamente. Restaurado “Desde o início”. |
| S4-01 | Gráfico real a 390 px e interação por clique | Tooltip permaneceu legível, com os valores próprios de cada série; página com largura de conteúdo de 390 px, sem transbordamento horizontal. |
| S4-02 | Início após recarga e navegação para Visão geral | Retorno histórico com referência até 31/10/2026; lucro identificado como atual. A regra de meses encerrados permanece explícita. Investido observado em R$18.483,17; oscilações de patrimônio permanecem separadas. |
| S4-02 | Início no layout móvel | Cards e explicação do período legíveis a 390 px, sem transbordamento horizontal da página. |
| S4-03 | Acesso à busca Explorar e navegação pelo menu para resumo | Títulos “Explorar ativos | Valora” e “ITUB4 | Valora”; a tela de resumo carregou normalmente. |
| S4-04 | Lançamentos desktop e cards móveis | Conferidos RADL3→R, GARE11→G, VGHF11→V, ITSA3→I, KLBN4→K, BBAS3→B e MXRF11→M; badges e cores de classe preservados. |

O ensaio controlado anterior também reproduziu a falha do tooltip com a versão antiga e confirmou o ajuste usando exatamente a mesma massa; conferiu lacunas e atualização animada. Evidências em `output/qa-semana4/antes.png`, `depois.png` e `mobile.png`. Nesta passagem pelas telas reais foram acrescentadas `inicio-desktop.png`, `inicio-mobile.png`, `rentabilidade-real.png` e `rentabilidade-real-mobile.png`.

## Verificações técnicas e limites

- A implementação homologada mantém os 113 testes aprovados, build de produção, verificação de tipos e lint registrados na entrega local. Não houve nova alteração de código de produto durante esta passagem visual.
- Os testes automatizados cobrem série inteiramente ausente, lacunas, valores distintos por data, resumo fechado versus ganho atual, período inicial parcial e títulos/404.
- Não foram criadas carteiras ou operações de teste; esta passagem usa os dados existentes somente para leitura. A carteira selecionada foi preservada e as dimensões temporárias do navegador foram restauradas.
- Viewport móvel e clique no navegador integrado não comprovam toque em aparelho físico nem a versão instalada do PWA. Esse reteste e a homologação após publicação continuam pendentes.

Conclusão: os quatro ajustes estão aprovados no recorte local descrito e prontos para revisão em PR.
