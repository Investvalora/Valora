# Build Result — Mobile Desempenho & Análise

**Date:** 2025-07-17
**Branch:** feature/visao-geral-desempenho-analise
**Command:** `pnpm run build`

## Result: FAIL (pre-existing errors only)

The build fails with **3 pre-existing TypeScript errors** that existed before this implementation:

```
src/modules/portfolio/components/AddTransactionModal.tsx:428:13 - error TS7053
  Element implicitly has an 'any' type because expression of type 'string' can't be used
  to index type 'Record<TesouroDiretoAtivo, string>'.

src/routes.tsx:32:10 - error TS6133
  'Placeholder' is declared but its value is never read.
```

These errors were confirmed to exist on the base commit before any of this task's changes were applied (verified via `git stash` + build).

## Files changed by this task (zero new errors)

| File | Change |
|---|---|
| `src/modules/ativos/components/SubTabBar.tsx` | Added `whitespace-nowrap` to tab labels |
| `src/modules/desempenho/components/DesempenhoPage.tsx` | Added mobile-only header (md:hidden), hid desktop h1 on mobile |
| `src/modules/analise/components/AnalisePage.tsx` | Added mobile-only header (md:hidden), hid desktop h1 on mobile |
| `src/modules/desempenho/components/DesempenhoVisaoGeral.tsx` | Added 2×2 KPI grid for mobile, wrapped KpiPillBar in `hidden md:block` |
| `src/modules/analise/components/AnaliseVisaoGeral.tsx` | Added 2×2 KPI grid for mobile, wrapped KpiPillBar in `hidden md:block` |

No errors were introduced by these changes. The `tsc` output for all 5 changed files shows clean compilation.
