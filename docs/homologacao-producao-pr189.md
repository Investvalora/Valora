# Homologação de produção — PR 189

Data: 20/11/2026. Produção: https://investvalora.vercel.app.
Commit publicado: `68e768210d0ed302e5bcc77abfbaf57d44713ee5`.

## Publicação

PR 189 mergeada; checks da PR e Security and regression da main aprovados. Deployment Vercel aprovado. Conferência na conta autenticada, somente leitura, sem alterar carteira ou recebimentos.

## Tempos observados

Navegador integrado desktop, sem limitação artificial de rede/CPU. Amostra exploratória, não benchmark controlado nem teste Android.

- Documento inicial: DOMContentLoaded 1.213 ms; load 1.225 ms; primeira exibição de conteúdo (FCP) 1.256 ms.
- Nenhuma requisição a Google Fonts; fonte local publicada.
- Consulta de usuário `/auth/v1/user`: 134 ms nesta sessão já autenticada. Isso não comprova melhora do refresh de token.

| Tela | Primeira visita medida | Retorno com cache |
| --- | ---: | ---: |
| Ativos | 1.664 ms | 61 ms |
| Desempenho | 3.981 ms | 1.270 ms |
| Carteiras | 33 ms | 22–34 ms |
| Análise | 958 ms | 1.663 ms |
| Início | FCP inicial acima; dados completos não instrumentados na abertura | 1.497–2.744 ms |

Nas navegações internas, tempo entre clique e conteúdo principal sem indicador visível de carregamento; não significa término de todas as consultas em segundo plano. Instrumentação temporária por MutationObserver/requestAnimationFrame removida ao final.

## Pendência de desempenho

No retorno Carteiras → Início, métricas CDP apontaram 2.732 ms de ScriptDuration e 2.807 ms de TaskDuration, contra 5 ms de layout e 12 ms de recálculo de estilo. O trabalho JavaScript domina essa navegação. É necessário perfilar os cálculos/renderizações para localizar a função responsável antes de corrigir; esta medição não identifica sozinha a função nem atribui a regressão a uma PR específica.

A remoção do bloqueio de fonte e da transição nativa está publicada. O desempenho global ainda não deve ser considerado encerrado: Início, Análise e Desempenho mantêm atrasos perceptíveis. A amostra anterior de fonte remota acima de 12 s foi obtida em condições diferentes e não permite calcular uma melhoria percentual.
