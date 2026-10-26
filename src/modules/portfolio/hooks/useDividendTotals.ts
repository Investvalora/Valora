import { useMemo } from 'react'
import { useDividends } from '../../dividends/hooks/useDividends'

/** Uses the same paid history as Proventos, including imported net amounts. */
export function useDividendTotals(tickers: string[], _quantityByTicker: Map<string, number>): Map<string, number> {
  // Kept for callers of the previous API; received quantities now come from history.
  void _quantityByTicker
  const { rows } = useDividends('1A')
  return useMemo(() => {
    const wanted = new Set(tickers)
    const totals = new Map<string, number>()
    for (const row of rows) {
      if (wanted.has(row.ticker)) totals.set(row.ticker, (totals.get(row.ticker) ?? 0) + row.total_value)
    }
    return totals
  }, [rows, tickers])
}
