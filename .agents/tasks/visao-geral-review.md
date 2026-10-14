# DesempenhoVisaoGeral and AnaliseVisaoGeral implementation

Two "Visão Geral" sub-route components added to complete the Desempenho and Análise modules, replacing the `Placeholder` stubs in `routes.tsx`. `DesempenhoVisaoGeral` aggregates performance and dividend KPIs with charts and a top-payers table. `AnaliseVisaoGeral` composes the existing ScoreCol, AlertasCol, ProventosCol columns and adds a score-by-ticker table. Watch for: the "Rentabilidade total" KPI pill in `DesempenhoVisaoGeral` is derived from a hard-coded 1-year window, while the sibling Rentabilidade tab defaults to "Tudo" — a user will see different numbers under the same label with no explanation. `AnaliseVisaoGeral` also duplicates the `usePositions` + `useFundamentals` + `useCalculateScore` calls that `ScoreCol` already makes, doubling memo overhead (confirmed: no extra network requests due to React Query cache).

**Verdict**: APPROVED

---

## High-level view

`DesempenhoVisaoGeral` hard-codes the period `'1A'` for both `usePerformance` and `useDividends`. The "Proventos 12M" pill label is explicit, so that is fine. The "Rentabilidade total" label is not — `DesempenhoRentabilidade` defaults to `'Tudo'`, so the two tabs will show different numbers for the same metric name.

`AnaliseVisaoGeral` calls `usePositions(walletId)`, `useFundamentals`, and `useCalculateScore` in the parent component to populate the score-by-ticker table, but `ScoreCol` — rendered as a direct child — runs identical calls. React Query deduplicates the fetches, but the `useMemo` derivations run twice. The `Placeholder` function in `routes.tsx` is now dead code; both visao-geral routes are correctly wired to the lazy-loaded real components.

---

<details>
<summary>Issues (2)</summary>

1. **"Rentabilidade total" KPI label is misleading** — the value comes from `usePerformance('1A')` (1-year window) but the label implies lifetime return. `DesempenhoRentabilidade` defaults to `'Tudo'`, so the two tabs will show different numbers with no period qualifier on the overview. Add "(12M)" to the label, or change the period to `'Tudo'` to align with the sibling tab.

2. **Duplicate derivation in AnaliseVisaoGeral / ScoreCol** — `AnaliseVisaoGeral` calls `usePositions(walletId)`, `useFundamentals(tickers)`, and `useCalculateScore(activeRules, fundamentals)` to build `scoreByTicker`, while `ScoreCol` makes the same calls internally. No extra network requests (React Query cache hit), but five `useMemo` computations run twice and two `fundamentals` arrays live in tree simultaneously. Pass `scoreByTicker` as a prop to `ScoreCol`, or expose it via a callback, to eliminate the redundancy.

</details>

---

<details>
<summary>Details</summary>

### "Rentabilidade total" KPI label vs hard-coded 1A period

`usePerformance` is called with the literal `'1A'`, so `summary.portfolioReturnPct` reflects a 1-year accumulated return. The KPI label is "Rentabilidade total" with no period annotation. `DesempenhoRentabilidade` defaults to `'Tudo'`, so a user switching between those two tabs will see different numbers under the same conceptual label. The `fmtPct` multiplication by 100 (`rentPct * 100`) matches the reference component — the math is correct; the issue is the missing period qualifier.

### Duplicate computation in AnaliseVisaoGeral / ScoreCol

```tsx
// AnaliseVisaoGeral
const { data: positions = [] } = usePositions(walletId)
const tickers = useMemo(() => positions.map((p) => p.ticker), [positions])
const { data: fundamentals = [] } = useFundamentals(tickers)
// ...
const scoreByTicker = useCalculateScore(activeRules, fundamentals)
```

`ScoreCol` (mounted as a direct child) runs the identical sequence. React Query keys are the same so no extra fetches fire, but `useMemo` for `tickers`, `groups`, `activeGroupName`, `activeRules`, and `scoreByTicker` runs twice and two copies of `fundamentals` occupy memory simultaneously. The fix is to pass `scoreByTicker` (and optionally the other derived values) as props into `ScoreCol`.

### Routes: Placeholder is dead code

`Placeholder` is defined in `routes.tsx` and not referenced by any `<Route element>`. Both visao-geral routes are correctly wired to their lazy-loaded components. The dead function should be removed to avoid it being copy-pasted the next time a stub route is needed.

</details>

---

<details>
<summary>File map</summary>

| File | Change |
|---|---|
| `src/modules/desempenho/components/DesempenhoVisaoGeral.tsx` | New component: performance + dividends overview with charts and top-payers |
| `src/modules/analise/components/AnaliseVisaoGeral.tsx` | New component: three-column score/alertas/proventos layout + score-by-ticker table |
| `src/routes.tsx` | Both visao-geral routes changed from `<Placeholder />` to lazy-loaded real components; `Placeholder` function remains but is now unused |

Full diff: `git diff main -- src/modules/desempenho/components/DesempenhoVisaoGeral.tsx src/modules/analise/components/AnaliseVisaoGeral.tsx src/routes.tsx`

</details>
