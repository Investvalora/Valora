import { useMemo } from 'react'
import { useDividends } from '../../dividends/hooks/useDividends'
import { useDividendCurrency } from '../../dividends/hooks/useDividendCurrency'
import { dividendTotals } from '../../dividends/utils/dividendCurrency'

/** Uses the same paid history as Proventos, including imported net amounts. */
export function useDividendTotals(tickers: string[], _quantityByTicker: Map<string, number>, currencies?: Map<string, string>): Map<string, number | null> {
  // Kept for callers of the previous API; received quantities now come from history.
  void _quantityByTicker
  const { rows, isLoading, isError } = useDividends('1A')
  const fx = useDividendCurrency(rows, currencies)
  return useMemo(() => {
    if (isLoading || isError || fx.isLoading || fx.isError) return new Map(tickers.map(ticker => [ticker, null]))
    return dividendTotals(rows, tickers, fx.rates, currencies)
  }, [rows, tickers, currencies, isLoading, isError, fx.rates, fx.isLoading, fx.isError])
}
