# Homologação das PRs 185 e 186 — 20/11/2026

Main `81c7d6e` contém os dois merges; CI da main e deploy Vercel aprovados.

As migrations `20261119212046` e `20261120014542` foram aplicadas pontualmente e registradas com os identificadores do repositório. O push geral foi interrompido pelo histórico legado não equivalente; nenhum identificador antigo foi removido ou reexecutado. Funções `sync-sec-statements` e `check-price-targets` publicadas pela CLI oficial.

Coleta SEC manual publicada: execução GitHub `44668251073`, sucesso, dois ativos processados (AAPL/AMZN), zero falhas. Snapshots gravados com evidência parcial; 47 tarefas, duas com sucesso. AAPL apareceu na interface com margem 33,01%, FCF US$136.056.000.000, CAGR de receitas 5,53% e lucros 6,9%; dívida/EBITDA e ROIC indisponíveis. RLS ativo, claim sem execução para authenticated. Não equivale à confirmação da cadência automática.

Visão geral publicada: ranking com três tickers distintos; legenda ETFs, FIIs, Ações BR e Stocks US. No início, ajuda contida nos cards em 319, 320 e 390 px; diálogo abre e fecha. Viewport restaurado. Carteiras e alertas reais não alterados.

## Pendência encontrada

Contador e filtro Pausados ainda consultavam somente status ignorado, deixando de fora o novo boolean paused; ativos também incluíam pausados. Correção adicional preparada em `codex/paused-alert-filter-followup`, em ambas as telas. Regressão de filtro e lifecycle: 27 testes aprovados; tipos aprovados. Essa correção ainda não publicada. A pausa, retomada, exclusão e isolamento de contas foram verificados no QA; não houve mutação de alerta real durante a conferência visual de produção.

## Correção adicional

Nas duas telas, `paused=true` agora entra no contador e filtro Pausados e fica fora de Alertas ativos. A compatibilidade com alertas de preço antigos ignorados foi preservada. Sem migration ou nova publicação de Edge Function: esta correção é de frontend. Regressão repetida em 20/11, 27 testes aprovados.
