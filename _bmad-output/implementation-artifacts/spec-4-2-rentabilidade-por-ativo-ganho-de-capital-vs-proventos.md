---
title: 'Story 4.2 — Rentabilidade por Ativo (Ganho de Capital vs Proventos)'
type: 'feature'
created: '2026-09-11'
status: 'in-review'
review_loop_iteration: 0
baseline_commit: '6388587'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** A tela `/rentabilidade` entrega o retorno consolidado da carteira (Story 4.1), mas o usuário não consegue ver o desempenho individual de cada ativo nem distinguir quanto vem de valorização vs proventos recebidos.

**Approach:** Adicionar, abaixo do gráfico existente na `RentabilidadePage`, uma tabela com uma linha por posição exibindo ticker, retorno total %, ganho de capital %, proventos recebidos (R$), proventos % e botão de exportar CSV — tudo calculado client-side a partir de dados já disponíveis no hook `usePerformance`.

## Boundaries & Constraints

**Always:**
- Ganho de capital % = `((cotação atual − preço médio) / preço médio) × 100`. Cotação atual = último `close` da `price_history` para o ativo (já disponível via `buildLastPricesMap` / `wealthService`).
- Proventos % = `(Σ dividendos recebidos no período / (preço médio × quantidade)) × 100`.
- Retorno total % = ganho de capital % + proventos %.
- Ordenação padrão: retorno total decrescente. Colunas clicáveis: ticker (ASC/DESC), retorno total, ganho de capital, proventos R$, proventos %.
- Exportar CSV segue exatamente o padrão de `positionsCsv.ts`: BOM UTF-8, separador `;`, `Blob`, limite 1000 linhas, nome de arquivo `rentabilidade-por-ativo.csv`.
- Ativo sem cotação atual → ganho de capital % = `null`, exibir "—".
- Ativo sem dividendos no período → proventos R$ = 0, proventos % = 0 (não é ausência de dado — simplesmente não recebeu).
- Preço médio = 0 → ganho de capital % e proventos % = `null`, exibir "—" (evitar divisão por zero).
- A tabela é parte da `RentabilidadePage` existente — não criar nova rota nem novo arquivo de página.
- Reutilizar `dividendRows` já calculado em `usePerformance` para os proventos por ativo.
- Reutilizar `positions` já disponível em `usePerformance` para preço médio e quantidade.
- Cotação atual: usar `buildLastPricesMap` de `wealthCalculations.ts` aplicado sobre os dados de `useWealthHistory` já cacheados — não fazer nova query.

**Ask First:** Adicionar coluna de alocação % (peso do ativo no patrimônio) junto à tabela; exibir gráfico de barras por ativo em vez de tabela.

**Never:** Fazer nova query ao Supabase para dados já disponíveis no hook `usePerformance`; criar Edge Function para este cálculo (AD-5 — client-side); duplicar lógica de `buildLastPricesMap` ou `buildWealthSeries`; adicionar nova rota ou página separada para esta tabela.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento de Erro |
|---------|---------------|----------------------|--------------------|
| Posição com histórico e dividendos | `positions`, `priceRows`, `dividendRows` completos | Linha com retorno total, ganho de capital e proventos preenchidos | — |
| Posição sem cotação atual | `priceRows` sem entrada para o ticker | Ganho de capital = "—"; retorno total = proventos % | — |
| Posição sem dividendos no período | `dividendRows` vazio para o ticker | Proventos R$ = R$ 0,00; proventos % = 0,00% | — |
| Preço médio zero | `average_price = 0` | Ganho de capital % = "—"; proventos % = "—" | — |
| Sem posições | `positions` vazia | Tabela não renderizada (já tratado pela `RentabilidadePage`) | — |
| Exportar CSV | Até 1000 linhas | Download iniciado, arquivo com BOM + separador `;` | Nenhum — sem requisição de rede |

</frozen-after-approval>

## Code Map

- `src/modules/performance/components/RentabilidadePage.tsx` -- página existente — adicionar a tabela abaixo do card do gráfico; reutilizar `positions`, `dividendRows` e séries de preço já disponíveis via `usePerformance`
- `src/modules/performance/hooks/usePerformance.ts` -- expõe `positions` (de `positionsQuery`) e `dividendRows`; `wealth.lastPricesMap` já está disponível via `useWealthHistory` — expor `assetRows: AssetReturnRow[]` no resultado do hook derivado via `useMemo`
- `src/modules/wealth/hooks/useWealthHistory.ts:47-76` -- `UseWealthHistoryResult` inclui `lastPricesMap: Map<string, number>` (último preço por ticker no período) — **já disponível em `wealth.lastPricesMap`** dentro de `usePerformance`; não requer nova query nem exposição de `priceRows`
- `src/modules/wealth/wealthCalculations.ts` -- `buildLastPricesMap` já utilizado internamente pelo `useWealthHistory`; não duplicar — usar `wealth.lastPricesMap` diretamente
- `src/modules/portfolio/export/positionsCsv.ts` -- `escapeCsvField`, `downloadPositionsCsv` — padrão canônico de export: BOM + `;` + `Blob`; seguir exatamente para o CSV da tabela de rentabilidade
- `src/modules/performance/utils/performanceCalculations.ts` -- adicionar `computeAssetRows(positions, lastPricesMap, dividendRows)` — função pura que deriva as linhas da tabela; exportar para testabilidade
- `src/modules/performance/types.ts` -- adicionar `AssetReturnRow { ticker: string; name: string | null; totalReturnPct: number | null; capitalGainPct: number | null; dividendsReceived: number; dividendsPct: number | null }` e `AssetReturnSort { column: AssetReturnSortColumn; direction: 'asc' | 'desc' }` e `type AssetReturnSortColumn`
- `src/modules/performance/utils/performanceCalculations.test.ts` -- adicionar testes para `computeAssetRows` cobrindo os cenários da matriz (happy path, sem cotação, sem dividendos, preço médio zero)

## Tasks & Acceptance

**Execução:**
- [ ] `src/modules/performance/types.ts` -- adicionar `AssetReturnRow`, `AssetReturnSortColumn` e `AssetReturnSort` -- contrato de tipos da tabela
- [ ] `src/modules/performance/utils/performanceCalculations.ts` -- implementar `computeAssetRows(positions, lastPricesMap, dividendRows)`: para cada posição calcula ganho de capital %, proventos R$ (soma de `dividendRows` filtrados por ticker), proventos %, retorno total %; retorna `AssetReturnRow[]` ordenada por retorno total decrescente por padrão -- função pura testável
- [ ] `src/modules/performance/utils/performanceCalculations.test.ts` -- adicionar testes para `computeAssetRows`: happy path (linha completa), sem cotação (ganho = null), sem dividendos (proventos = 0), preço médio zero (ganho e proventos% = null) -- garantir cobertura da matriz
- [ ] `src/modules/performance/hooks/usePerformance.ts` -- expor `assetRows: AssetReturnRow[]` derivado via `useMemo` chamando `computeAssetRows(positions, wealth.lastPricesMap, dividendRows)` no resultado do hook — dados prontos para a tabela sem nova query
- [ ] `src/modules/performance/components/AssetReturnTable.tsx` -- **criar**: tabela com colunas Ticker, Retorno Total %, Ganho de Capital %, Proventos (R$), Proventos %; cabeçalhos clicáveis para ordenação (ícone ▲/▼); linha "—" para valores nulos; botão "Exportar CSV" que chama `downloadAssetReturnCsv`; estado vazio quando `rows` está vazio -- componente de tabela ordenável
- [ ] `src/modules/performance/export/assetReturnCsv.ts` -- **criar**: `downloadAssetReturnCsv(rows)` seguindo exatamente o padrão de `positionsCsv.ts` (BOM + `;` + `Blob`); colunas: Ticker, Nome, Retorno Total %, Ganho de Capital %, Proventos (R$), Proventos %; arquivo `rentabilidade-por-ativo.csv`; limite 1000 linhas -- exportação CSV
- [ ] `src/modules/performance/components/RentabilidadePage.tsx` -- adicionar `<AssetReturnTable rows={assetRows} />` abaixo do card do gráfico; ocultar tabela quando `!hasPositions` (já coberto pelo early return existente); passar `assetRows` de `usePerformance` -- integrar tabela na página

**Critérios de Aceite:**
- Given usuário com posições e histórico de preços, when acessa `/rentabilidade`, then a tabela exibe uma linha por posição com retorno total %, ganho de capital %, proventos R$ e proventos %.
- Given posição com dividendos recebidos no período, when a tabela renderiza, then proventos R$ = soma de `value_per_share × quantity` dos `dividendRows` daquele ticker.
- Given posição sem cotação atual em `price_history`, when a tabela renderiza, then ganho de capital % exibe "—" e retorno total % = proventos %.
- Given posição com preço médio zero, when a tabela renderiza, then ganho de capital % e proventos % exibem "—".
- Given tabela renderizada, when usuário clica no cabeçalho "Ticker", then a tabela reordena por ticker alfabético; clique seguinte inverte a ordem.
- Given tabela renderizada, when usuário clica "Exportar CSV", then um arquivo `rentabilidade-por-ativo.csv` é baixado com BOM UTF-8, separador `;` e até 1000 linhas.
- Given usuário sem posições, when acessa `/rentabilidade`, then a tabela não é renderizada (early return existente da página cobre isso).

## Design Notes

**Cálculo por ativo:**
```
// Para cada posição p:
// cotacaoAtual = lastPricesMap.get(p.ticker) ?? null
// ganhoCapital% = cotacaoAtual !== null && p.average_price > 0
//   ? ((cotacaoAtual - p.average_price) / p.average_price) * 100
//   : null
//
// dividendosRecebidos = Σ (row.value_per_share * row.quantity)
//   para rows em dividendRows onde row.ticker === p.ticker
//
// proventos% = p.average_price > 0 && p.quantity > 0
//   ? (dividendosRecebidos / (p.average_price * p.quantity)) * 100
//   : null
//
// retornoTotal% = ganhoCapital% !== null || proventos% !== null
//   ? (ganhoCapital% ?? 0) + (proventos% ?? 0)
//   : null
```

**Reutilização dos dados do hook:**
`usePerformance` já busca `positions`, `dividendRows` e `wealth.series`. A cotação atual está em `wealth.priceRows` (via `useWealthHistory`) — passar por `buildLastPricesMap` para obter o `Map<ticker, close>`. Não fazer nova query.

## Verification

**Commands:**
- `pnpm build` -- expected: compila sem erros de TypeScript
- `pnpm lint` -- expected: sem erros nos arquivos novos
- `pnpm test` -- expected: novos testes de `computeAssetRows` passam junto com os 394 existentes
