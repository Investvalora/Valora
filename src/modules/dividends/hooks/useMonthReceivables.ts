import { useMemo } from 'react'
import { useDividends } from './useDividends'
import { useDividendCurrency } from './useDividendCurrency'
import { convertDividendRow } from '../utils/dividendCurrency'
import { toIsoDate } from '../../../shared/utils/isoDate'

/** Announced payments still due this month. Future USD uses today's PTAX as
 * an estimate; the received ledger always keeps its historical payment FX. */
export function useMonthReceivables() {
  const source = useDividends('6M', 'announced')
  const today = toIsoDate(new Date())
  const dated = useMemo(() => source.rows.filter(row => row.payment_date && row.payment_date > today && row.payment_date.slice(0, 7) === today.slice(0, 7)), [source.rows, today])
  const fxRows = useMemo(() => dated.map(row => ({ ...row, payment_date: today })), [dated, today])
  const fx = useDividendCurrency(fxRows)
  const converted = useMemo(() => fxRows.map((row, index) => {
    const convertedRow = convertDividendRow(row, 'BRL', fx.rates)
    return convertedRow ? { ...convertedRow, payment_date: dated[index].payment_date } : null
  }), [fxRows, dated, fx.rates])
  const missing = !source.isLoading && !fx.isLoading && converted.some(row => row === null)
  return {
    hasUndated: source.rows.some(row => row.payment_date === null),
    rows: missing || fx.isLoading ? [] : converted.filter(row => row !== null),
    isLoading: source.isLoading || fx.isLoading,
    isError: source.isError || fx.isError || missing,
    refetch: () => { source.refetch(); void fx.refetch() },
  }
}
