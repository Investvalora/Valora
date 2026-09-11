# Epic 4 Context: Rentabilidade e Benchmarks

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Deliver the Rentabilidade screen, where authenticated users can measure how their portfolio has actually performed over time and compare it directly against market benchmarks (CDI, IBOV, IFIX). The epic also breaks down each individual position's return into capital gain versus dividend income, giving users a clear picture of what is driving their results — and a basis for strategic decisions.

## Stories

- Story 4.1: Retorno total da carteira com comparação gráfica a benchmarks (CDI, IBOV, IFIX)
- Story 4.2: Rentabilidade detalhada por ativo — ganho de capital vs proventos recebidos

## Requirements & Constraints

**Return calculation (Story 4.1):**  
Portfolio return for a selected period = `((endValue + totalDividends - contributions) / startValue) - 1`. Periods available: 1M, 3M, 6M, 1A, Tudo. A summary card must show the three percentages (total return, capital gain, dividend yield) and the spread in basis points vs CDI.

**Benchmark comparison chart (Story 4.1):**  
Multi-line Recharts chart normalizes all series to 100 at period start. Lines: Carteira, CDI, IBOV, IFIX. Tooltip shows accumulated % per series on hover. Benchmark data is read from the public `benchmarks` table (seed, no RLS).

**Per-asset breakdown (Story 4.2):**  
Each row displays: ticker, total return %, capital gain %, dividends received (R$), and dividends %. Formulas: capital gain = `((currentPrice − avgPrice) / avgPrice) × 100`; dividends % = `(Σ dividends received / (avgPrice × qty)) × 100`; total % = capital gain % + dividends %. Default sort: total return descending. User can also sort by ticker.

**Export:**  
The per-asset table must offer CSV export (up to 1 000 rows in < 2s).

**Performance budget:**  
Full calculation for a 50-asset portfolio over 1 year must complete in < 3s (p95). Screen transition must be < 500ms.

**Access control:**  
Benchmark and price data are public market data — no per-user RLS needed on `benchmarks` or `price_history`. Position, transaction, and dividend data are user-private and accessed through the existing RLS policies. JWT is verified implicitly by the Supabase client; no extra server-side check is required for these read-only calculations.

## Technical Decisions

**Module location:** `src/modules/performance/` following the project's domain-module convention.  
Key files to create:
- `components/PerformanceChart.tsx` — multi-line Recharts chart (lazy-loaded)
- `components/BenchmarkComparison.tsx` — cards with ± pp vs each benchmark
- `components/PerformanceByAssetTable.tsx` — sortable table with CSV export
- `hooks/usePerformance.ts` — TanStack Query hook wrapping return calculation
- `hooks/useBenchmarks.ts` — TanStack Query hook fetching `benchmarks` table
- `services/performanceService.ts` — Supabase queries; encapsulates all data access

**Calculation tier:** Both story calculations run **client-side** (classificação AD-5 as "presentational"). No Edge Function is needed. Aggregate joins happen via TanStack Query + Supabase JS, not SQL views.

**State / caching:**  
Use TanStack Query with a `staleTime` of 5 min for benchmark data (low-churn seed). Period selection state lives in local component state or Zustand `performance` slice — do not pollute shared auth/portfolio slices.

**`benchmarks` table schema:**
```sql
-- Public table, authenticated SELECT only, no RLS, written only via service role
CREATE TABLE benchmarks (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,           -- 'CDI' | 'IBOV' | 'IFIX'
  date DATE NOT NULL,
  value NUMERIC(18, 4) NOT NULL,
  source TEXT DEFAULT 'seed',
  UNIQUE (name, date)
);
CREATE INDEX idx_benchmarks_name_date ON benchmarks(name, date DESC);
```

**Query key pattern:** `['performance', 'return', userId, period]` and `['benchmarks', period]` — consistent with the project-wide convention `['domain', 'resource', ...params]`.

**USD conversion:** Positions in USD must be converted using `useUSDRate()` (AwesomeAPI client-side fetch, 1h staleTime, R$ 5.00 fallback). This hook already exists from Epic 2.

**Lazy loading:** The Recharts chart component must be wrapped in `React.lazy()` to avoid increasing initial bundle size.

## UX & Interaction Patterns

The screen maps to the route `/rentabilidade`. A period selector (1M | 3M | 6M | 1A | Tudo) drives both the chart and the table simultaneously. The chart normalizes all series to the same base so visual comparison is straightforward regardless of absolute values.

The summary cards use green/red coloring for positive/negative return, consistent with the rest of the app's dark theme. The spread vs CDI (±X.X pp) is the most prominent metric.

The per-asset table is sortable by column header click. Tooltip/info icon on each return figure decomposes the value into capital gain and dividends, matching the data-source info pattern used in the Carteira screen (Story 2.3).

The "Exportar CSV" button follows the same pattern as Story 2.7 — client-side generation, no server round-trip.

## Cross-Story Dependencies

**Upstream (must be complete before Epic 4 can deliver real data):**
- Epic 2 — `positions` table, `price_history` seed (51 assets, 12-month daily closes), `useUSDRate` hook, CSV export pattern.
- Epic 3 — `dividends` table with seed data and `transactions` rows of type `dividend|jcp` (used to sum `totalDividends` in the return formula). Story 3.1 seed must be in place.
- `benchmarks` table seed (CDI, IBOV, IFIX daily values for ≥ 12 months) — referenced as a dependency of this epic in the epics document.

**Lateral:**
- The `PerformanceByAssetTable` re-uses `shared/components/Table.tsx` and `shared/utils/formatters.ts` (currency, percentage) — no changes needed to shared layer.
- Story 6.3 (Asset Detail) will reuse the per-asset return decomposition tooltip pattern introduced here.
