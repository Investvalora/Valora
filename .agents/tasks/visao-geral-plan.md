# Implementation Plan — Two Missing Screens

Task: implement `DesempenhoVisaoGeral` (`/desempenho/visao-geral`) and
`AnaliseVisaoGeral` (`/analise/visao-geral`) in the Valora React/TypeScript/Tailwind app,
then wire them into the router.

---

## Context (discovered during exploration)

- **Stack**: React 18 + TypeScript + Tailwind (dark theme, `#131313` bg, `#1B1B1B` cards, `border-white/[0.08]`)
- **Build/typecheck**: `npx tsc --noEmit` (project root)
- **Style reference**: `src/modules/desempenho/components/DesempenhoRentabilidade.tsx`
- **Lazy pattern in router**: `const X = lazy(() => import('./path').then(m => ({ default: m.X })))`; named exports, NOT default exports on the component files.
- **KpiPillBar**: accepts `{ label, value, colorClass? }[]`; colorClass is a Tailwind text class (`text-nf-green`, `text-nf-pink`, `text-white`)
- **PanelCard**: `<PanelCard>…</PanelCard>` with optional `className` and `padding`
- **usePerformance('1A')** returns `{ portfolioSeries, benchmarkSeries, summary, monthlyTableData, isLoading }`; `summary.portfolioReturnPct` is a decimal (0.0554 = 5.54%)
- **useDashboard()** returns `{ lucroTotalBRL, proventos12mBRL, totalPatrimonioBRL, isLoading }`; all nullable
- **useDividends('1A')** returns `{ rows: DividendRow[], isLoading }`; `rows[i].ticker`, `rows[i].total_value`
- **buildMonthlyBars(rows)**: imported from `../../dividends/utils/dividendCalculations` returns `MonthlyBar[]` (`{ month, total }[]`)
- **DividendsBarChart** (default export, lazy target): prop `data: MonthlyBar[]`
- **PerformanceLineChart** (default export, lazy target): prop `series: PerformanceSeries[]`
- **TabelaMensal**: named export, prop `rows: MonthlyTableRow[]`
- **groupRulesByName(rules)**: returns `Map<string, ScoreRule[]>`; `.size` gives number of score groups
- **useAlerts()** returns `{ data: Alert[] }` where `Alert.type: AlertType` and `Alert.status: AlertStatus`
- **AnaliseScore pattern** (`src/modules/analise/components/AnaliseScore.tsx`): `useState` for modal state, passes `onNewRule`/`onEditRule` down, embeds `<Modal>` + `<ScoreRuleForm>` at the bottom
- **ScoreCol** prop types: `{ onNewRule: () => void; onEditRule: (rule: ScoreRule) => void }`
- **AlertasCol** and **ProventosCol**: no external props needed (self-contained)
- **Router file** (`src/routes.tsx`): two `<Placeholder />` entries to replace: `/desempenho/visao-geral` and `/analise/visao-geral`

---

## Implementation Plan

- [ ] 1. Create `DesempenhoVisaoGeral.tsx`.

  This is a new file mirroring `DesempenhoRentabilidade.tsx` in style and structure.

  **What to do**:
  - Named export `DesempenhoVisaoGeral`.
  - Call `usePerformance('1A')` for `portfolioSeries`, `benchmarkSeries`, `summary`, `monthlyTableData`, `isLoading`.
  - Call `useDashboard()` for `lucroTotalBRL`, `proventos12mBRL`, `totalPatrimonioBRL`.
  - Call `useDividends('1A')` for `rows` (dividend rows).
  - Derive `monthlyBars` via `buildMonthlyBars(rows)`.
  - Render `<KpiPillBar>` at top with 4 pills:
    1. `'Rentabilidade total'` → `summary.portfolioReturnPct * 100` formatted as `'+5,54%'`, colorClass `text-nf-green` if ≥ 0 else `text-nf-pink`, fallback `'—'` with `text-white`.
    2. `'Lucro'` → `dashboard.lucroTotalBRL` formatted as BRL, `text-white` always.
    3. `'Proventos 12M'` → `dashboard.proventos12mBRL` formatted as BRL, `text-white`.
    4. `'Patrimônio atual'` → `dashboard.totalPatrimonioBRL` formatted as BRL, `text-white`.
  - Below KPI bar: two-column grid `className="grid gap-5 lg:grid-cols-3"`:
    - Left column `className="lg:col-span-2 flex flex-col gap-5"`:
      a. `<PanelCard>` with title `'Rentabilidade comparada'`, inline legend (Carteira + each benchmark), and lazy `<PerformanceLineChart series={[portfolioSeries, ...benchmarkSeries]} />`. Show `<LoadingChart />` when `isLoading`.
      b. `<PanelCard>` with title `'Proventos por mês'` and lazy `<DividendsBarChart data={monthlyBars} />`. Show `<LoadingChart />` when `isLoading` from `useDividends`.
    - Right column `className="lg:col-span-1 flex flex-col gap-5"`:
      a. `<PanelCard>` with title `'Rentabilidade mensal'` and `<TabelaMensal rows={monthlyTableData} />`.
      b. `<PanelCard>` with title `'Top pagadores (12M)'` showing top 3 dividend payers: sort `rows` by `total_value` desc, show first 3, render each as a flex row `ticker` left + formatted BRL right.
  - Lazy imports at the top of the file (same pattern as `DesempenhoRentabilidade.tsx`):
    ```ts
    const PerformanceLineChart = lazy(() => import('../../performance/components/PerformanceLineChart'))
    const DividendsBarChart = lazy(() => import('../../dividends/components/DividendsBarChart'))
    ```
  - Wrap lazy components in `<Suspense fallback={<LoadingChart />}>`.
  - Local `fmtBRL` and `fmtPct` helpers (same signatures as in `DesempenhoRentabilidade.tsx`).
  - Page heading `<h2>Visão Geral</h2>`.

  **Files**:
  - Create: `src/modules/desempenho/components/DesempenhoVisaoGeral.tsx`

  **Verify**: `cd "c:\Users\Samuel Leite\wkspaces\Valora" && npx tsc --noEmit` — zero errors.

---

- [ ] 2. Create `AnaliseVisaoGeral.tsx`.

  Mirrors the modal-handling pattern of `AnaliseScore.tsx` and assembles the three column components.

  **What to do**:
  - Named export `AnaliseVisaoGeral`.
  - Call `useScoreRules()` → `{ data: rules }`.
  - Call `useAlerts()` → `{ data: alerts }`.
  - Derive KPI values with `useMemo`:
    - `groups = groupRulesByName(rules ?? [])` → `scoresCount = groups.size`
    - `sobrevalorizados = (alerts ?? []).filter(a => a.type === 'overvalued' && a.status === 'novo').length`
    - `oportunidades = (alerts ?? []).filter(a => a.type === 'opportunity' && a.status === 'novo').length`
    - `alertasNovos = (alerts ?? []).filter(a => a.status === 'novo').length`
  - Render `<KpiPillBar>` with 4 pills:
    1. `'Scores criados'` → `String(scoresCount)`, `text-white`
    2. `'Sobrevalorizados'` → `String(sobrevalorizados)`, colorClass `sobrevalorizados > 0 ? 'text-nf-pink' : 'text-white'`
    3. `'Oportunidades'` → `String(oportunidades)`, colorClass `oportunidades > 0 ? 'text-nf-green' : 'text-white'`
    4. `'Alertas novos'` → `String(alertasNovos)`, colorClass `alertasNovos > 0 ? 'text-nf-blue' : 'text-white'` (use `text-[#7987FF]` if `text-nf-blue` not available as Tailwind class — check by looking at usages in `AlertasCol.tsx`; it uses `text-nf-blue` directly, so use that)
  - Three-column grid `className="grid gap-5 lg:grid-cols-3"`:
    - Col 1: `<ScoreCol onNewRule={onNewRule} onEditRule={onEditRule} />`
    - Col 2: `<AlertasCol />`
    - Col 3: `<ProventosCol />`
  - Below the grid: `<PanelCard>` with title `'Preço-alvo: ativos dentro da faixa'`.
    - Use `usePositions()` (no walletId — defaults to undefined, returns all positions), `useScorePreferences()`, `useScoreRules()` (already called above), `useCalculateScore()`, `useFundamentals()`.
    - Build `tickers` from positions, pass to `useFundamentals(tickers)`.
    - Get `activeRuleId = preferences?.default_score_rule_id ?? null`.
    - Get `activeGroupName = rules.find(r => r.id === activeRuleId)?.name ?? null`.
    - Get `activeRules = activeGroupName ? (groups.get(activeGroupName) ?? []) : []`.
    - Get `scoreByTicker = useCalculateScore(activeRules, fundamentals ?? [])`.
    - Table columns: **Ticker** | **Score** | **Pontos** (show ticker + score name from `activeGroupName` or `'—'` + score points from `scoreByTicker.get(ticker) ?? '—'`).
    - If no positions or no active score, show an empty-state message: `'Nenhum ativo ou score ativo para exibir.'`
  - Modal state (same pattern as `AnaliseScore.tsx`):
    ```ts
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingRule, setEditingRule] = useState<ScoreRule | undefined>(undefined)
    const [modalBusy, setModalBusy] = useState(false)
    function onNewRule() { setEditingRule(undefined); setIsModalOpen(true) }
    function onEditRule(rule: ScoreRule) { setEditingRule(rule); setIsModalOpen(true) }
    function closeModal() { if (modalBusy) return; setIsModalOpen(false); setEditingRule(undefined) }
    ```
  - At the bottom: `<Modal isOpen={isModalOpen} title={editingRule ? 'Editar regra' : 'Nova regra de score'} onClose={closeModal} dismissible={!modalBusy}><ScoreRuleForm editingRule={editingRule} onSuccess={closeModal} onCancel={closeModal} onBusyChange={setModalBusy} /></Modal>`
  - Page heading `<h2>Visão Geral</h2>`.

  **Files**:
  - Create: `src/modules/analise/components/AnaliseVisaoGeral.tsx`

  **Verify**: `cd "c:\Users\Samuel Leite\wkspaces\Valora" && npx tsc --noEmit` — zero errors.

---

- [ ] 3. Wire both screens into the router.

  The router already has `lazy` imports and `<Placeholder />` for these two routes. Replace the Placeholder usages with the new components.

  **What to do** in `src/routes.tsx`:
  - Add two new lazy imports alongside the existing ones:
    ```ts
    const DesempenhoVisaoGeral = lazy(() => import('./modules/desempenho/components/DesempenhoVisaoGeral').then((m) => ({ default: m.DesempenhoVisaoGeral })))
    const AnaliseVisaoGeral    = lazy(() => import('./modules/analise/components/AnaliseVisaoGeral').then((m) => ({ default: m.AnaliseVisaoGeral })))
    ```
  - Replace the `/desempenho/visao-geral` route element:
    - Before: `<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>`
    - After:  `<Suspense fallback={<LoadingFallback />}><DesempenhoVisaoGeral /></Suspense>`
  - Replace the `/analise/visao-geral` route element:
    - Before: `<Suspense fallback={<LoadingFallback />}><Placeholder /></Suspense>`
    - After:  `<Suspense fallback={<LoadingFallback />}><AnaliseVisaoGeral /></Suspense>`

  **Files**:
  - Modify: `src/routes.tsx`

  **Verify**: `cd "c:\Users\Samuel Leite\wkspaces\Valora" && npx tsc --noEmit` — zero errors.

---

## Notes & Assumptions

1. **`nf-blue` Tailwind class**: `AlertasCol.tsx` uses `text-nf-blue` directly, so it is defined in the project's Tailwind config. Use it for the "Alertas novos" KPI colorClass.
2. **`useDashboard` walletId**: called without argument (defaults to undefined) in `DesempenhoVisaoGeral`, consistent with how `InicioPage` uses it.
3. **`usePositions` in `AnaliseVisaoGeral`**: called without walletId to get all positions across wallets, same as `ScoreCol.tsx` which passes `walletId` from `useWallets().selectedWallet?.id ?? ''`. The price-target table in `AnaliseVisaoGeral` can also use `useWallets` to get the wallet context — call `useWallets()` to get `selectedWallet`, then `usePositions(selectedWallet?.id ?? '')`.
4. **`scoreByTicker` type**: `ScoreByTicker` is `Map<string, number>`, so `.get(ticker)` returns `number | undefined`. Format as `String(v)` if defined, else `'—'`.
5. **Placeholder removal**: `Placeholder` function remains in `routes.tsx` as it may still be referenced elsewhere; only its usages at the two routes are replaced.
6. **`DividendsBarChart` import**: it is a default export (`export default function DividendsBarChart`), so `lazy(() => import(...))` without `.then(m => ...)` is correct. Same for `PerformanceLineChart`.
