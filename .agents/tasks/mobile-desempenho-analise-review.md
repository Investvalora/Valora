# Mobile responsive layout for Desempenho and Análise screens

The change adds a mobile-first presentation layer to the Desempenho and Análise sections without touching the desktop experience. On screens narrower than `md` (768 px), a larger title replaces the desktop header, a 2×2 KPI card grid replaces the horizontal pill bar, and the SubTabBar gets `whitespace-nowrap` to allow horizontal scrolling past its container edge. The TabelaMensal was already wrapped in `overflow-x-auto` with a `min-w-[640px]` constraint; that part required no new changes.

Watch for: the mobile "Último mês" KPI in Desempenho derives its value from `monthlyTableData` rather than a dedicated hook — if the array is empty the cell shows "—" with no positive/negative coloring, which is correct, but the derivation logic is non-obvious and worth verifying once real data flows through. The build log records 3 pre-existing TypeScript errors; none were introduced by this change (confirmed).

**Verdict**: APPROVED

---

## High-level view

Both page shells (`DesempenhoPage`, `AnalisePage`) render two heading elements — one `md:hidden` for mobile, one `hidden md:flex` for desktop — so the title is never missing and never duplicated across breakpoints. The pattern is symmetric and correct.

The KPI grid in both Visão Geral components is strictly additive: the original `KpiPillBar` is wrapped in `hidden md:block` so it disappears on mobile, and a `grid grid-cols-2 gap-3 md:hidden` block takes its place. The two blocks are mutually exclusive at every breakpoint; no double-rendering occurs.

Color tokens for positive/negative values (`nf-green` `#63D16B`, `nf-pink` `#FF8FBE`) are defined in `tailwind.config.js` and used consistently — conditional on the sign of each value or count — across both KPI grids and TabelaMensal.

SubTabBar already had `overflow-x-auto` with the native scrollbar hidden via `[scrollbar-width:none]` and `[&::-webkit-scrollbar]:hidden`. The `whitespace-nowrap` addition to each tab label is the missing piece that actually allows tabs to overflow instead of wrapping.

TabelaMensal sets `min-w-[640px]` on the `<table>` inside an `overflow-x-auto` wrapper, enforcing horizontal scroll rather than breaking the layout. All cells use `text-[12px]`, meeting the 12 px floor stated in the review criteria.

---

<details>
<summary>Issues (1)</summary>

1. **"Último mês" KPI derivation from sorted `monthlyTableData`** — The last-month value is derived by sorting `firstRow.months.entries()` lexicographically by key and taking the tail. Because month keys are zero-padded two-digit strings (`"01"`–`"12"`), lexicographic order equals numeric order, so this is correct. The concern worth noting for future maintainers: this reads from the first row of `monthlyTableData` (which is ordered by descending year), meaning it always reflects the most recent year's last available month — not necessarily the calendar-current month. If the performance data lags by a month, the label silently shows stale data. No action required before shipping; worth a comment in the code. (confirmed)

</details>

---

<details>
<summary>Details</summary>

### "Último mês" KPI derivation

The Desempenho grid shows a "Último mês" tile derived inside a `useMemo`:

```ts
const firstRow = monthlyTableData[0]   // most recent year (descending order)
const sortedMonths = [...firstRow.months.entries()].sort((a, b) => a[0].localeCompare(b[0]))
const last = sortedMonths[sortedMonths.length - 1]
```

Month keys are zero-padded (`"01"` – `"12"`), so lexicographic sort equals numeric order and `last` is the highest-numbered available month. The implicit assumption is that `monthlyTableData` is ordered by descending year, meaning this always reflects the most recent year's last available month — not necessarily the calendar-current month. If performance data lags by a month, the label silently shows stale data. Worth a code comment to surface this for future maintainers.

### SubTabBar scroll and `whitespace-nowrap`

Before this change, tab labels could wrap or be clipped on narrow viewports because there was no `whitespace-nowrap` on the labels — even though the container had `overflow-x-auto`. Without `whitespace-nowrap`, a flex child collapses inward instead of overflowing, making the scroll container inert. The addition corrects this: each tab now occupies a single line and the container scrolls horizontally as intended.

### Build status

The build log records a `FAIL` result, but the 3 errors are confirmed pre-existing — verified via `git stash` + build before any of this task's commits. Zero new TypeScript errors were introduced. The pre-existing errors are in `AddTransactionModal.tsx` (implicit `any` on string index) and `routes.tsx` (unused `Placeholder` import).

</details>

---

<details>
<summary>Files changed</summary>

| File | What changed |
|---|---|
| `src/modules/desempenho/components/DesempenhoPage.tsx` | Added `md:hidden` mobile header; wrapped desktop header in `hidden md:flex` |
| `src/modules/analise/components/AnalisePage.tsx` | Same header pattern as DesempenhoPage |
| `src/modules/desempenho/components/DesempenhoVisaoGeral.tsx` | Added 2×2 KPI grid (`md:hidden`); wrapped KpiPillBar in `hidden md:block` |
| `src/modules/analise/components/AnaliseVisaoGeral.tsx` | Same KPI pattern as DesempenhoVisaoGeral |
| `src/modules/ativos/components/SubTabBar.tsx` | Added `whitespace-nowrap` to tab NavLink className to enable horizontal scroll |
| `src/modules/desempenho/components/TabelaMensal.tsx` | No changes — pre-existing `overflow-x-auto` + `min-w-[640px]` already handled mobile |

</details>
