---
title: 'Story 4.1 — Retorno Total e Comparação com Benchmarks'
type: 'feature'
created: '2026-09-11'
status: 'in-progress'
review_loop_iteration: 0
baseline_commit: '9c7159ecdd71c2028a8c96c86c3b88dcbcc737a8'
context:
  - '{project-root}/AGENTS.md'
  - '{project-root}/_bmad-output/implementation-artifacts/epic-4-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problema:** A rota `/rentabilidade` exibe apenas um placeholder. Usuários com posições e histórico de preços não conseguem medir o retorno da carteira nem comparar com benchmarks de mercado (CDI, IBOV, IFIX).

**Approach:** Criar a tabela `benchmarks` com seed de dados históricos, o módulo `performance` com service, hook e página que calculam o retorno da carteira para o período selecionado e renderizam um gráfico de linhas comparativo e cards de resumo na rota existente.

## Boundaries & Constraints

**Always:** A rentabilidade da carteira é `((valorFinal + proventosRecebidos − aportes) / valorInicial) − 1`, onde `valorInicial` e `valorFinal` são patrimônios calculados pelo mesmo método de `buildWealthSeries` já existente. Os dados de benchmarks vêm da tabela pública `benchmarks`; a série é normalizada a 100 no início do período para comparação visual. O gráfico deve ser lazy-loaded via `React.lazy` com `ChartErrorBoundary` envolvendo o `Suspense`, seguindo exatamente o padrão de `PatrimonioPage`. O `PeriodSelector` é reutilizado com os períodos `1M`, `3M`, `6M`, `1A`, `Tudo`; não duplicar o componente. A tabela `benchmarks` segue o mesmo padrão de RLS das tabelas de mercado: `ENABLE ROW LEVEL SECURITY` + policy `FOR SELECT TO authenticated USING (true)` + `REVOKE ALL FROM anon, authenticated` + `GRANT SELECT TO authenticated` + `GRANT ALL TO service_role`. O seed de benchmarks deve cobrir no mínimo os últimos 12 meses com valores diários para CDI, IBOV e IFIX; valores podem ser sintéticos (simulados) com `source = 'seed'`, seguindo o padrão de `supabase/seed.sql`.

**Ask First:** Usar retorno ponderado pelo tempo (TWR) em vez da fórmula simples acima; incluir benchmarks adicionais (ex: SMLL, IDIV); exibir rentabilidade anualizada além do percentual acumulado do período.

**Never:** Criar Edge Function para calcular retorno (o cálculo é client-side, classificação AD-5); expor `service_role` no frontend; interpolar ou inventar valores de preço ausentes além do que `buildWealthSeries` já faz (lacunas viram `null`); duplicar lógica de `buildWealthSeries` ou `buildLastPricesMap`.

## I/O & Edge-Case Matrix

| Cenário | Input / Estado | Saída / Comportamento | Tratamento de Erro |
|---------|---------------|----------------------|--------------------|
| Carteira com histórico e benchmarks | posições, `price_history` e `benchmarks` com dados no período | Gráfico com 4 linhas (carteira, CDI, IBOV, IFIX); cards com % de cada série e diferença vs CDI | — |
| Sem posições | `positions` vazia | Mensagem "Nenhuma posição cadastrada" no lugar do gráfico e dos cards | — |
| Período sem preço histórico | nenhuma linha em `price_history` no período | Gráfico vazio com mensagem de lacuna; cards mostram "—" | — |
| Benchmark sem dado no período | `benchmarks` sem linhas para algum benchmark no período | Linha do benchmark ausente do gráfico; card daquele benchmark mostra "—" | — |
| Erro no fetch | Supabase retorna erro | Mensagem de erro inline com botão retry; gráfico não renderiza | `refetch()` |
| Carteira com ativo USD | posições com `currency = 'USD'` | Conversão via `useUSDRate` com fallback R$5; badge "taxa USD aproximada" quando `isFallback` | — |

</frozen-after-approval>

## Code Map

- `src/routes.tsx:17` -- `RentabilidadePage` inline placeholder — substituir por import real do módulo performance
- `src/modules/wealth/components/PeriodSelector.tsx` -- exporta `PeriodSelector`; aceita prop `periods`; reutilizar sem modificação
- `src/modules/wealth/types.ts` -- `WealthPeriod` union type — reutilizar para os 5 períodos
- `src/modules/wealth/hooks/useWealthHistory.ts` -- padrão de hook com duas queries + USD rate + derivação client-side; seguir a mesma arquitetura no hook de performance; `wealthHistoryQueryKey` e `PERIOD_DAYS` são referências úteis
- `src/modules/wealth/wealthCalculations.ts` -- `buildWealthSeries(positions, priceRows, usdRate)` e `buildLastPricesMap(priceRows)` exportados — reutilizar diretamente para calcular `valorInicial` e `valorFinal`
- `src/modules/wealth/services/wealthService.ts` -- `wealthService.listPositionsSnapshot(userId)` e `wealthService.listPriceHistory(tickers, since)` — reutilizar nos casos em que `useWealthHistory` já esteja cacheado; se não, copiar o padrão de query
- `src/modules/dividends/hooks/useDividends.ts` -- `useDividends(period)` retorna `rows: DividendRow[]` com `total_value` — somar para obter `proventosRecebidos` do período
- `src/modules/portfolio/types.ts` -- `PositionWithAsset` com `average_price` e `quantity` — usar para calcular `aportes = Σ average_price × quantity`
- `src/modules/portfolio/services/positionService.ts` -- `positionService.listPositions(userId)` retorna `PositionWithAsset[]` — fonte dos aportes
- `src/shared/hooks/useUSDRate.ts` -- `useUSDRate({ enabled })` com `isFallback` — mesmo padrão de `useWealthHistory`
- `src/modules/wealth/components/PatrimonioPage.tsx:13-44` -- padrão canônico de `ChartErrorBoundary` + `React.lazy` + `Suspense` — replicar para o gráfico de performance
- `src/modules/portfolio/export/positionsCsv.ts` -- `escapeCsvField`, `downloadPositionsCsv`, padrão BOM + `;` + `Blob` — seguir o mesmo padrão no futuro (Story 4.2); esta story NÃO inclui exportação CSV (apenas gráfico + cards)
- `supabase/migrations/009_create_dividends_and_fundamentals.sql` -- padrão de migration para tabela de mercado com RLS — seguir para a migration `010_create_benchmarks.sql`
- `supabase/seed.sql` -- padrão de seed com `ON CONFLICT DO NOTHING` — adicionar seed de benchmarks neste arquivo
- `src/modules/performance/` -- **criar**: módulo inteiro, não existe
- `src/modules/performance/types.ts` -- **criar**: `BenchmarkRow { name: string; date: string; value: number; source: string }`, `PerformancePeriod = WealthPeriod`, `PerformanceSeries { label: string; color: string; points: { date: string; normalized: number }[] }`, `PerformanceSummary { returnPct: number | null; vscdipPp: number | null }`
- `src/modules/performance/services/benchmarkService.ts` -- **criar**: `benchmarkService.listBenchmarks(since)` — busca `benchmarks` por `date >= since`; retorna `BenchmarkRow[]`
- `src/modules/performance/hooks/usePerformance.ts` -- **criar**: `performanceQueryKey(userId, period)`, `usePerformance(period)`: orquestra posições (via `wealthService`), histórico de preços, dividendos (via `useDividends`), benchmarks e taxa USD; deriva retorno da carteira e séries normalizadas; `staleTime` 5 minutos
- `src/modules/performance/utils/performanceCalculations.ts` -- **criar**: funções puras `normalizeToBase100(points, since)`, `computePortfolioReturn(series, dividends, contributions)` — extraídas para testabilidade
- `src/modules/performance/components/PerformanceLineChart.tsx` -- **criar**: default export; `React.lazy`; Recharts `ResponsiveContainer > LineChart`; 4 linhas (carteira azul, CDI verde, IBOV amarelo, IFIX laranja); tooltip com % acumulado de cada série; `isAnimationActive={false}`
- `src/modules/performance/components/RentabilidadePage.tsx` -- **criar**: orquestra `usePerformance`, `PeriodSelector`, gráfico lazy + `ChartErrorBoundary`, cards de resumo (retorno da carteira, CDI, IBOV, IFIX, spread vs CDI); estados: loading, erro com retry, sem posições, sem histórico

## Tasks & Acceptance

**Execução:**
- [ ] `supabase/migrations/010_create_benchmarks.sql` -- criar tabela `benchmarks (id UUID PK, name TEXT, date DATE, value NUMERIC(18,4), source TEXT DEFAULT 'seed', UNIQUE(name,date))` com índice em `(name, date DESC)`, RLS habilitado, policy de SELECT para `authenticated`, REVOKE ALL de anon/authenticated, GRANT SELECT/ALL conforme padrão -- base de dados para benchmarks
- [ ] `supabase/seed.sql` -- adicionar seed de benchmarks: 12 meses de valores diários para CDI, IBOV e IFIX com `source = 'seed'`; usar `ON CONFLICT (name, date) DO NOTHING` -- popular a tabela para testes manuais
- [ ] `src/modules/performance/types.ts` -- definir `BenchmarkRow`, `PerformancePeriod`, `PerformanceSeries`, `PerformanceSummary` -- contrato de tipos do módulo
- [ ] `src/modules/performance/services/benchmarkService.ts` -- implementar `benchmarkService.listBenchmarks(since)`: query em `benchmarks` filtrando `date >= since` e `date <= hoje`, ordenado por `(name, date ASC)`, limite 3 × 365 -- encapsular acesso ao Supabase
- [ ] `src/modules/performance/utils/performanceCalculations.ts` -- implementar `normalizeToBase100(points)`: recebe array `{date, value}` e retorna array `{date, normalized}` onde o primeiro ponto é 100; e `computePortfolioReturn(wealthSeries, dividendRows, positions)`: calcula `((valorFinal + proventos − aportes) / valorInicial) − 1`; retorna `null` quando dados insuficientes -- funções puras testáveis
- [ ] `src/modules/performance/hooks/usePerformance.ts` -- implementar `performanceQueryKey(userId, period)` e `usePerformance(period)`: orquestra `wealthService.listPositionsSnapshot`, `wealthService.listPriceHistory`, `positionService.listPositions` (para aportes), `useDividends`, `benchmarkService.listBenchmarks` e `useUSDRate`; deriva `portfolioSeries`, `benchmarkSeries[]` e `summary` em `useMemo`; `staleTime` 5 minutos -- núcleo de dados da tela
- [ ] `src/modules/performance/components/PerformanceLineChart.tsx` -- `React.lazy` (default export); Recharts `ResponsiveContainer > LineChart`; 4 `Line` (carteira #3b82f6, CDI #22c55e, IBOV #eab308, IFIX #f97316); tooltip com % acumulado formatado; eixo X com datas; `isAnimationActive={false}`; estado vazio quando `data` está vazio -- gráfico comparativo de linhas
- [ ] `src/modules/performance/components/RentabilidadePage.tsx` -- orquestra `usePerformance`, `PeriodSelector` (todos os períodos), gráfico lazy com `ChartErrorBoundary` + `Suspense`, 4 cards de resumo (carteira, CDI, IBOV, IFIX), badge "taxa USD aproximada" quando `usdRateIsFallback`; estados: loading (texto animate-pulse), erro (alert role + retry), sem posições, sem histórico no período -- página completa
- [ ] `src/routes.tsx` -- substituir placeholder `RentabilidadePage` inline por `import { RentabilidadePage } from './modules/performance/components/RentabilidadePage'` -- conectar rota existente

**Critérios de Aceite:**
- Given usuário com posições, histórico em `price_history` e dados em `benchmarks`, when acessa `/rentabilidade`, then gráfico de linhas exibe carteira e os 3 benchmarks normalizados a 100 no início do período selecionado.
- Given usuário muda o período, when seleciona outro período, then gráfico e cards atualizam sem recarregar a página.
- Given carteira com proventos recebidos no período, when a tela carrega, then o retorno da carteira inclui `total_value` dos dividendos na fórmula.
- Given benchmark sem dados no período selecionado, when a tela carrega, then aquela linha não aparece no gráfico e o card correspondente mostra "—".
- Given usuário sem posições, when acessa a tela, then mensagem clara é exibida no lugar do gráfico e dos cards.
- Given erro no fetch de qualquer query, when ocorre, then mensagem de erro inline com botão "Tentar novamente" é exibida.
- Given carteira com ativo USD, when `useUSDRate` retorna `isFallback = true`, then badge "taxa USD aproximada" aparece na tela.
- Given o gráfico, when renderiza, then usa `React.lazy` com `ChartErrorBoundary` envolvendo o `Suspense`.

## Design Notes

**Cálculo de retorno da carteira:**
```
// Dada a série temporal de patrimônio (WealthPoint[]) para o período:
// valorInicial = série[0].value (primeiro ponto não-nulo)
// valorFinal   = série[último].value (último ponto não-nulo)
// proventos    = Σ dividendRow.total_value onde ex_date cai no período
// aportes      = Σ (position.average_price × position.quantity)
// retorno      = ((valorFinal + proventos - aportes) / valorInicial) - 1
// Quando valorInicial = 0 ou null → retorno = null
```

**Normalização para comparação visual:**
A carteira e cada benchmark têm séries com datas diferentes (fins de semana, feriados). Normalizar cada série independentemente: `normalized[i] = (value[i] / value[0]) × 100`. O eixo Y mostra 100 = início do período para todas as linhas.

**staleTime:** 5 minutos para todos os dados (posições, preços, dividendos, benchmarks) — alinhado com os demais hooks do épico.

## Verification

**Commands:**
- `pnpm build` -- expected: compila sem erros de TypeScript
- `pnpm lint` -- expected: sem erros nos arquivos novos e em `routes.tsx`
- `pnpm test` -- expected: testes de `performanceCalculations.test.ts` passam

**Manual checks:**
- Acessar `/rentabilidade` logado com posições: gráfico renderiza linhas e cards exibem percentuais
- Trocar período: gráfico e cards atualizam
- Verificar badge "taxa USD aproximada" com posição USD e API falhando
