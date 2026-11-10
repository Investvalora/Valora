import { useMemo } from 'react'
import { useDividends } from './useDividends'
import { useDividendCurrency } from './useDividendCurrency'
import { convertDividendRow } from '../utils/dividendCurrency'

/** Display/aggregate adapter. Historical returns continue consuming original currencies. */
export function useBrlDividends(...args: Parameters<typeof useDividends>) {
  const source = useDividends(...args)
  const fx = useDividendCurrency(source.rows)
  const converted = useMemo(() => source.rows.map(row => convertDividendRow(row, 'BRL', fx.rates)), [source.rows, fx.rates])
  const missing = !source.isLoading && !fx.isLoading && converted.some(row => row === null)
  return { ...source, rows: missing || fx.isLoading ? [] : converted.filter(row => row !== null),
    isLoading: source.isLoading || fx.isLoading, isError: source.isError || fx.isError || missing,
    refetch: () => { source.refetch(); void fx.refetch() } }
}
