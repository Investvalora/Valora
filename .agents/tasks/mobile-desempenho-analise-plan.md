# Implementation Plan — Mobile Responsive Layout: Desempenho & Análise

Branch: `feature/visao-geral-desempenho-analise`

## Design Reference (from Figma)

| Frame | Node ID |
|---|---|
| Mobile / Desempenho › Visão geral | 247:2229 |
| Mobile / Desempenho › Rentabilidade | 221:2404 |
| Mobile / Desempenho › Proventos | 221:2813 |
| Mobile / Análise › Visão geral | 247:2469 |
| Mobile / Análise › Score | 221:3112 |
| Mobile / Análise › Alertas | 221:3339 |

Build command: `pnpm build` (tsc + vite)
Lint: `pnpm lint`
Dev server: `pnpm dev`

---

## Key design observations (per screen)

### Desempenho — Visão Geral (mobile)
- **Header**: `< Desempenho` breadcrumb replaced by page title "Desempenho" at top; SubTabBar still present below the title (tabs scroll horizontally, already handled by `overflow-x-auto` on SubTabBar).
- **KPI area**: Instead of the scrollable `KpiPillBar` (horizontal pills), the design shows a **2×2 grid of KPI cards**. Each card has: a small icon + label on top, a large value, and an optional sub-label. Cards have the same `bg-[#1B1B1B] rounded-[14px] border border-white/[0.08]` treatment.
- **Chart "Rentabilidade comparada"**: Full-width card, same as desktop but with a "Ver rentabilidade →" link in the header.
- **"Resumo mensal"**: Replaces the wide `TabelaMensal` — shows a compact list of the most-recent 6 months with Carteira % and CDI % columns. Has "Ver histórico →" link.
- **"Proventos por mês"**: Full-width bar chart card, with "Ver proventos →" link.
- **"Top pagadores (12M)"**: Full-width card with DY badge and total. "Ver todos →" link.
- No grid split — everything stacks in a single column on mobile.

### Desempenho — Rentabilidade (mobile)
- **KPI area**: 3 horizontal pills remain at top (Rentabilidade total, Últimos 12M, Lucro total) — a single row of 3 `KpiPillBar` items is fine; they already scroll.
- **Chart**: Full-width inside PanelCard, same as desktop. Legend rows wrap under title. Period/type selectors move to below the chart title as a row of two `<select>` elements.
- **TabelaMensal**: Replaced by a **card-per-year** layout. Each year card shows: year + Anual + Acumulado in a header row, then months in a **3×4 grid** (3 cols, 4 rows of month+value pairs). This avoids horizontal scroll on narrow screens.
- **Rentabilidade por ativo table**: Already has `hidden md:table-cell` on some columns, which is good. On mobile, the table should be replaced by a **card list** (same pattern as `DividendCard` in DesempenhoProventos). Each card: avatar+ticker, classe badge, rentabilidade (big), vs CDI (small).

### Desempenho — Proventos (mobile)
- **KPI bar**: The current `min-w-max` / `flex min-w-max` horizontal scroll bar needs to **stack to 3 separate cards in a grid (grid-cols-3)** on mobile, each showing label + value. Period selector moves to below the 3 cards as a standalone `<select>` row.
- **Chart**: Full-width, already correct.
- **Proventos recebidos**: The mobile `DividendCard` is already implemented (`block md:hidden` / `hidden md:block`). This is already correct per Figma — just verify the card design matches the Figma exactly (ticker + type badge on top-right, three sub-cols for Data com / Valor/cota / Quantidade).
- **Search + filter**: On mobile, the search input and type dropdown should stack to full-width (`flex-col gap-2 md:flex-row`).
- **"Mostrando X de Y" / "Ver mais"**: Figma shows a centered text "Mostrando 6 de 48" — already implemented.

### Análise — Visão Geral (mobile)
- **KPI area**: 2×2 grid of KPI cards (same pattern as Desempenho Visão Geral). Cards: "Alertas novos" (count, pink), "Scores criados" (count), "Sobrevalorizados" (count, pink), "Alertas de preço" (count, blue).
- **Score Fundamentalista**: Full-width, single-column. Card per score group. Each group card shows: group name + points summary in header, rules as rows with condition + point badge, "Score padrão" or "Usar este score" button. "Ver score →" link in section header.
- **Alertas recentes**: Full-width cards, same design as existing `AlertCard`. "Ver alertas →" link in section header. Limited to first 4 alerts.
- **Preço-teto**: A new table-like section (2 rows visible), each row: ticker + score name left, "Teto R$ X" right + "Margem -X%" in pink. "Ver análise →" link.
- **No 3-column grid on mobile** — the `grid grid-cols-1 gap-5 lg:grid-cols-3` already collapses to 1 column. The issue is that `ScoreCol`, `AlertasCol`, `ProventosCol` panels need to be replaced/adapted to not use their internal `flex-1 overflow-y-auto` column layout (which assumes a fixed-height column context).

### Análise — Score (mobile)
- Same content as desktop (AnaliseScore component), but the page has a `< Análise` breadcrumb above the title "Score Fundamentalista".
- **AnalisePage** already has `px-4 pt-4 md:px-0 md:pt-2`. No changes needed to the score cards themselves — they already stack vertically.

### Análise — Alertas (mobile)
- Same content as desktop (AnaliseAlertas). The Figma mobile shows the same layout as desktop cards — they're already full-width cards that stack.
- **Filter pills**: already `flex overflow-x-auto` — good.
- **Form (PriceAlertForm)**: On mobile, the `flex-wrap` form fields should become `flex-col` (stack vertically). Already has `flex flex-wrap` but `min-w-[140px]` can cause awkward wrapping — change to `w-full` on mobile.

---

## TypeScript types needed

`KpiPillBar` is currently typed as `{ label, value, colorClass? }`. The new 2×2 grid cards need an extended type:

```ts
// In src/shared/components/KpiCardGrid.tsx (new file)
export type KpiCardItem = {
  icon: LucideIcon          // lucide icon component
  label: string
  value: string
  subLabel?: string         // optional sub-line e.g. "Média R$ 70,95/mês"
  colorClass?: string       // for the value text colour
}
```

---

## Implementation Plan

- [ ] 1. Create `KpiCardGrid` shared component.
      This is the new 2×2 card grid that replaces `KpiPillBar` on mobile for the Visão Geral screens.
      It renders a `grid grid-cols-2 gap-3` of cards, each with: icon (16×16 in a 32×32 rounded bg), label (`text-[11px] text-white/50`), value (`text-[20px] font-semibold`), optional sub-label (`text-[11px] text-white/40 mt-0.5`).
      Card style: `rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-4`.
      On `md+` screens render nothing (the parent already uses `KpiPillBar` on desktop), OR accept a `mobileOnly` prop that wraps in `block md:hidden` — use `mobileOnly` approach so both components can coexist during transition.
      Files: `src/shared/components/KpiCardGrid.tsx` (new)
      Verify: `pnpm build` — TypeScript compiles with no errors.

- [ ] 2. Adapt `DesempenhoVisaoGeral` — KPI section and grid.
      **Current**: uses `<KpiPillBar items={[...]} />`.
      **Change**:
      - Add `<KpiCardGrid mobileOnly items={[...]} />` immediately before the existing `<KpiPillBar>`, which gets `className="hidden md:flex"` added.
      - KpiCardGrid items (icons from lucide-react):
        - `{ icon: TrendingUp, label: 'Rentabilidade total', value: rentFormatted, subLabel: 'Últimos 12M: —', colorClass: ... }`
        - `{ icon: DollarSign, label: 'Lucro total', value: fmtBRL(dashboard.lucroTotalBRL), subLabel: \`Dividendos R$ ...\` }`
        - `{ icon: Gift, label: 'Proventos (12M)', value: fmtBRL(dashboard.proventos12mBRL), subLabel: \`Média R$ ${fmtBRL(dashboard.proventos12mBRL / 12)}/mês\` }`
        - `{ icon: Wallet, label: 'Patrimônio total', value: fmtBRL(dashboard.totalPatrimonioBRL), subLabel: \`Investido R$ ...\` }`
      - The main grid `grid grid-cols-1 gap-5 lg:grid-cols-3` already collapses to 1 column on mobile — no change needed there.
      - Add "Ver rentabilidade →" and "Ver proventos →" and "Ver todos →" link headers in the respective PanelCards on mobile. Pattern: wrap the `<h3>` and a `<Link>` in `<div className="flex items-center justify-between">`. These links are mobile-only (`md:hidden`) inside the card headers.
      Files: `src/modules/desempenho/components/DesempenhoVisaoGeral.tsx`
      Verify: `pnpm build` — no TS errors.

- [ ] 3. Adapt `TabelaMensal` — add mobile card-per-year layout.
      **Current**: renders a single `<div className="overflow-x-auto"><table className="min-w-[640px]">`. On mobile (390 px) this scrolls horizontally and is unreadable.
      **Change**: Add a parallel mobile render (below the existing table) that is `block md:hidden`:
      - For each `row` in `rows`, render a `PanelCard` (or plain `div` with same card styles) containing:
        - Header: `<div className="flex items-center justify-between">`: year (white, bold), then `<div className="flex gap-4">`: "Anual: X%" + "Acumulado: X%" in correct colors.
        - Body: `<div className="grid grid-cols-3 gap-x-4 gap-y-2 mt-3">` — for each of the 12 months, a `<div>`: `<span className="text-[10px] text-white/40">{monthAbbr}</span>` + `<span className={cellColor(val) + " text-[12px] tabular-nums"}>{fmtPct(val)}</span>`. Empty months show "—".
      - Wrap the existing table in `<div className="hidden md:block overflow-x-auto">`.
      Files: `src/modules/desempenho/components/TabelaMensal.tsx`
      Verify: `pnpm build` — no TS errors.

- [ ] 4. Adapt `DesempenhoRentabilidade` — mobile KPI pills, chart controls, and asset table.
      **Current KPI pills**: `<KpiPillBar>` is already scrollable, which works on mobile. No change needed here — keep as is.
      **Chart controls**: The `<div className="mb-4 flex flex-wrap items-center justify-between gap-3">` inside PanelCard has the title + legend + two `<select>`. On mobile this wraps awkwardly.
      - Change to: title row stays `flex items-center justify-between`. Below it, add `<div className="flex flex-wrap gap-2 mt-2">` for the two selects (full-width on mobile with `w-full sm:w-auto`). Legend items: wrap in `<div className="flex flex-wrap gap-3 mr-2">`.
      **Rentabilidade por ativo** — replace table on mobile:
      - Wrap the existing `<div className="overflow-x-auto"><table>` in `<div className="hidden md:block ...">`.
      - Add `<div className="block md:hidden flex flex-col gap-3">` with a `AssetReturnCard` inner component (defined inline in this file) that renders:
        - Row 1: avatar circle + ticker/name + classe badge (left) + rentabilidade (right, colored).
        - Row 2: "vs CDI: X pp" small text (right-aligned).
        - Card style: `rounded-[14px] border border-white/[0.06] bg-[#1B1B1B] p-3`.
      Files: `src/modules/desempenho/components/DesempenhoRentabilidade.tsx`
      Verify: `pnpm build` — no TS errors.

- [ ] 5. Adapt `DesempenhoProventos` — mobile KPI bar and search controls.
      **Current KPI bar**: the `<div className="overflow-x-auto rounded-xl ..."><div className="flex min-w-max ...">` renders 4 items (Proventos, Média, Maior mês, Período selector) in a horizontal scroll. On mobile the design shows **3 separate mini-cards in a `grid-cols-3`** + period selector as a separate row.
      **Change**:
      - Wrap the existing KPI bar div in `<div className="hidden md:block">`.
      - Add above it `<div className="block md:hidden flex flex-col gap-3">`:
        - `<div className="grid grid-cols-3 gap-3">` with three `<div className="rounded-[14px] border border-white/[0.08] bg-[#1B1B1B] p-3 flex flex-col gap-0.5">`: label (`text-[10px] text-white/40`) + value (`text-[15px] font-semibold`).
        - Below the grid: `<div className="flex items-center gap-2"><span className="text-[12px] text-white/50">Período</span><select ...></div>` — the same select element, just repositioned.
      **Search + filter controls**: change `<div className="flex items-center gap-2">` inside PanelCard to `<div className="flex flex-col gap-2 md:flex-row">`. The search input gets `w-full md:w-[150px]`. The type dropdown gets `w-full md:w-auto`.
      **DividendCard** (mobile cards) already exists and matches Figma. No changes needed to that component.
      Files: `src/modules/desempenho/components/DesempenhoProventos.tsx`
      Verify: `pnpm build` — no TS errors.

- [ ] 6. Create `KpiCardGrid` is already planned in step 1. Now use it in `AnaliseVisaoGeral` for the KPI section.
      **Current**: uses `<KpiPillBar>`.
      **Change**:
      - Add `<KpiCardGrid mobileOnly items={[...]} />` before the existing `<KpiPillBar>` (which gets `className="hidden md:flex"`).
      - KpiCardGrid items:
        - `{ icon: Bell, label: 'Alertas novos', value: String(novosCount), subLabel: \`Total de alertas: ${alerts.length}\`, colorClass: novosCount > 0 ? 'text-nf-pink' : 'text-white' }`
        - `{ icon: Target, label: 'Scores criados', value: String(groups.size), subLabel: \`${rules.length} regras no total\` }`
        - `{ icon: TrendingUp, label: 'Sobrevalorizados', value: String(overvaluedCount), subLabel: overvaluedCount > 0 ? 'Bazin - DY mínimo 6%' : undefined, colorClass: overvaluedCount > 0 ? 'text-nf-pink' : 'text-white' }`
        - `{ icon: BellRing, label: 'Alertas de preço', value: String(priceTargetCount), subLabel: priceTargetAlertTicker ?? undefined, colorClass: 'text-nf-blue' }`
        (add `priceTargetCount` and `priceTargetAlertTicker` computed from `alerts` via `useMemo`).
      Files: `src/modules/analise/components/AnaliseVisaoGeral.tsx`
      Verify: `pnpm build` — no TS errors.

- [ ] 7. Adapt `AnaliseVisaoGeral` — section headers with "Ver →" links and Score/Alertas inline sections.
      The 3-column grid (`grid grid-cols-1 gap-5 lg:grid-cols-3`) already collapses to single column on mobile. The panels `ScoreCol`, `AlertasCol`, `ProventosCol` are self-contained. The issue is that on mobile the design shows:
      - A **"Score Fundamentalista" section header** with "Ver score →" link, followed by score group cards rendered inline (not the full `ScoreCol` panel with its fixed-height scroll).
      - An **"Alertas recentes" section header** with a "2 novos" badge and "Ver alertas →" link, followed by alert cards (max 4).
      - A **"Preço-teto: acima do teto" section** with "Ver análise →" link, showing overvalued alerts as rows.

      **Decision**: Keep the desktop 3-column layout (`lg:grid-cols-3`) unchanged. On mobile (below `lg`), replace it with an inline stacked version using `block lg:hidden`.
      - Add `<div className="block lg:hidden flex flex-col gap-6">` after the KPI bars, containing:
        1. **Score section**: `<MobileScoreSection>` (new inline component in this file) — renders section header + score group cards stripped of the internal scroll container. Reuses `ScoreGroup`-like rendering directly from `groups` data already available in `AnaliseVisaoGeral`.
        2. **Alertas section**: `<MobileAlertasSection>` (new inline component) — renders section header with novos badge + "Ver alertas →" link, then the first 4 alerts from `alerts` as `AlertCard`-style divs (copy the card markup from `AlertasCol.tsx`'s `AlertRow`).
        3. **Preço-teto section**: `<MobilePrecoTetoSection>` (new inline component) — renders overvalued alerts (type === 'overvalued') as rows. Each row: `ticker` bold left + `"Teto R$ X"` right + `"Margem -X%"` in pink.
      - Wrap the existing grid `<div className="grid grid-cols-1 gap-5 lg:grid-cols-3">` in `<div className="hidden lg:block">` wait — this wraps the whole grid which IS the desktop layout. Better approach: add `className="hidden lg:grid"` directly to the grid div (change `grid` → `hidden lg:grid`).
      - The `PanelCard` score-by-ticker table below the grid stays as-is (works on mobile with `overflow-x-auto`).
      Files: `src/modules/analise/components/AnaliseVisaoGeral.tsx`
      Verify: `pnpm build` — no TS errors.

- [ ] 8. Adapt `AnalisePage` and `DesempenhoPage` — add mobile breadcrumb and adjust page padding.
      The Figma mobile screens show a `< Análise` / `< Desempenho` breadcrumb above the page title on sub-routes (Score, Alertas, Rentabilidade, Proventos). On the Visão Geral screens the title stands alone.
      **Current `AnalisePage`**: `<h1 className="text-[22px] font-semibold text-white">Análise</h1>` with no breadcrumb.
      **Change**: The breadcrumb only appears when NOT on the visão-geral route. Use `useLocation()` from react-router-dom.
      - In `AnalisePage`: import `useLocation` from `react-router-dom`. If `location.pathname !== '/analise/visao-geral'`, render `<div className="block md:hidden mb-1"><button onClick={() => navigate('/analise/visao-geral')} className="flex items-center gap-1 text-[12px] text-white/50"><ChevronLeft className="h-3.5 w-3.5" /> Análise</button></div>` before the `<h1>`. Use `useNavigate` for the back action.
      - Same pattern in `DesempenhoPage` (back to `/desempenho/visao-geral`).
      - On mobile the page outer padding is `px-4 pt-4` — already set in both Page components. No change needed.
      Files:
        - `src/modules/analise/components/AnalisePage.tsx`
        - `src/modules/desempenho/components/DesempenhoPage.tsx`
      Verify: `pnpm build` — no TS errors.

- [ ] 9. Adapt `AnaliseScore` — no structural changes needed; verify padding and button layout on mobile.
      The Figma mobile Score screen shows the same `ScoreGroupCard` pattern already implemented in `AnaliseScore.tsx`. The cards are full-width and stack correctly.
      The only issues:
      - The "+ Nova regra" button in the header: on mobile, `<div className="flex items-center justify-between">` with a long title "Score Fundamentalista" can overflow. Change `<h2>` to `text-[16px]` on mobile: `className="text-[16px] md:text-[18px] font-semibold text-white"`.
      - The `ScoreGroupCard` rule rows: the metric+condition text and point badge + edit/delete buttons. On very narrow screens the edit/delete buttons can push off screen. Already handled by the flex layout — just add `min-w-0` to the metric text span: `<div className="min-w-0 flex-1">` (already done). No code changes needed.
      Files: `src/modules/analise/components/AnaliseScore.tsx` (minor: h2 text-size)
      Verify: `pnpm build` — no TS errors.

- [ ] 10. Adapt `AnaliseAlertas` — mobile form layout fix.
       **Current `PriceAlertForm`**: `<form className="flex flex-wrap items-end gap-3">` with two `min-w-[140px]` inputs. On a 390px screen with `px-4` padding (362px usable), `flex-wrap` wraps the fields 2+1 which is acceptable, but the Figma shows a cleaner full-width stacked layout.
       **Change**: Add `flex-col md:flex-row` and remove `flex-wrap`:
       - Form: `className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end"`
       - Both input wrappers: `className="flex flex-col gap-1 w-full md:min-w-[140px] md:w-auto"`
       - Buttons div: `className="flex items-center gap-2 w-full md:w-auto"`
       Files: `src/modules/analise/components/AnaliseAlertas.tsx`
       Verify: `pnpm build` — no TS errors.

- [ ] 11. Final build and lint verification.
       Run full build + lint to confirm all changes compile cleanly with no regressions.
       Files: all modified files above.
       Verify:
       ```
       pnpm lint
       pnpm build
       ```
       Expected: 0 errors, 0 warnings from TS. Lint may have pre-existing warnings — only new warnings introduced by these changes are blockers.

---

## Summary of new TypeScript types

```ts
// src/shared/components/KpiCardGrid.tsx
import type { LucideIcon } from 'lucide-react'

export type KpiCardItem = {
  icon: LucideIcon
  label: string
  value: string
  subLabel?: string
  colorClass?: string
}

type KpiCardGridProps = {
  items: KpiCardItem[]
  /** When true, wraps the whole grid in `block md:hidden` */
  mobileOnly?: boolean
}
```

No other new types are needed — all data already flows through existing hooks.

---

## Files changed summary

| File | Action |
|---|---|
| `src/shared/components/KpiCardGrid.tsx` | **CREATE** |
| `src/modules/desempenho/components/DesempenhoVisaoGeral.tsx` | Modify |
| `src/modules/desempenho/components/TabelaMensal.tsx` | Modify |
| `src/modules/desempenho/components/DesempenhoRentabilidade.tsx` | Modify |
| `src/modules/desempenho/components/DesempenhoProventos.tsx` | Modify |
| `src/modules/analise/components/AnaliseVisaoGeral.tsx` | Modify |
| `src/modules/analise/components/AnalisePage.tsx` | Modify |
| `src/modules/desempenho/components/DesempenhoPage.tsx` | Modify |
| `src/modules/analise/components/AnaliseScore.tsx` | Minor modify |
| `src/modules/analise/components/AnaliseAlertas.tsx` | Modify |
