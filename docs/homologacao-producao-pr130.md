# Homologação em produção da PR130

Executada em 11/11/2026 no navegador integrado, em `https://investvalora.vercel.app`, com a sessão autenticada e a carteira Investidor10. PR130 mergeada no commit `ed6ee554cdd94307bb14802a7582924b6594d54c`. Checks app, database-isolation, migration-replay e Vercel da PR aprovados; status Vercel do commit de merge também aprovado. Os novos rótulos, títulos e comportamento do tooltip foram observados no domínio de produção.

## Resultados

| Item | Resultado observado |
| --- | --- |
| S4-01 / DF60 | Tooltip em 06/09/2025: Carteira +9,85%, CDI +11,00%, IBOV +9,99% e IFIX +9,93%, cada série com valor próprio e data completa. |
| S4-01 / troca de período | Seleção 1M atualizou a janela para 11/10 a 31/10/2026. Em 19/10, valores -1,28%, +0,25%, -1,91% e -0,79%, respectivamente. Restaurado “Desde o início”. |
| S4-02 / DF05 | Início mostra “Lucro atual” e “Rentabilidade histórica”, com referência até 31/10/2026 e explicação de meses encerrados. Visão geral mostra “Retorno histórico (12M)” e a mesma data de referência. Nenhuma alteração na fórmula para igualar períodos distintos. |
| S4-03 / DF61 | `/ativos/explorar` com “Explorar ativos | Valora”; `/ativos/explorar/ITUB4` com “ITUB4 | Valora”. Navegação para Lançamentos manteve o título próprio dessa página. |
| S4-04 / DF62 | Avatares de RADL3, GARE11, VGHF11, ITSA3, KLBN4, BBAS3 e MXRF11 correspondem à inicial do ticker em tabela desktop e cards móveis; badges de classe preservados. |
| Layout móvel | Rentabilidade e Lançamentos conferidos a 390 px: largura do conteúdo igual à viewport, sem transbordamento horizontal da página; tooltip legível por clique. |

O valor investido observado permaneceu R$18.483,17. Patrimônio e lucro atuais variam com as cotações, conforme o comportamento esperado. Não foram criadas, editadas ou excluídas carteiras, posições ou movimentações. Seleção Investidor10 preservada; dimensões temporárias do navegador restauradas.

Evidências locais: `output/qa-semana4/producao-inicio.png`, `producao-tooltip.png` e `producao-mobile.png`.

## Limites

Homologação aprovada para os quatro ajustes no navegador de produção e no layout móvel emulado. Clique em viewport móvel não equivale a toque no PWA físico nem valida atualização de uma instalação antiga. O reteste físico segue na TODO. Cenários controlados de lacunas e série ausente constam da homologação local e dos testes automatizados, sem criação de dados artificiais em produção.
